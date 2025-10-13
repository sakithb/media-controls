import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
import St from "gi://St";

const SCROLL_ANIMATION_SPEED = 0.04;

/**
 * @typedef {Object} ScrollingLabelParams
 * @property {string} text
 * @property {number} width
 * @property {Clutter.TimelineDirection} [direction]
 * @property {boolean} [isFixedWidth]
 * @property {boolean} isScrolling
 * @property {boolean} initPaused
 */

/** @extends St.ScrollView */
class ScrollingLabel extends St.ScrollView {
    /**
     * @public
     * @type {St.Label}
     */
    label;
    /**
     * @public
     * @type {St.BoxLayout}
     */
    box;
    /**
     * @private
     * @type {number}
     */
    onAdjustmentChangedId;
    /**
     * @private
     * @type {number}
     */
    onShowChangedId;

    /**
     * @private
     * @type {boolean}
     */
    isScrolling;
    /**
     * @private
     * @type {boolean}
     */
    isFixedWidth;
    /**
     * @private
     * @type {boolean}
     */
    initPaused;
    /**
     * @private
     * @type {number}
     */
    labelWidth;
    /**
     * @private
     * @type {Clutter.TimelineDirection}
     */
    direction;
    /**
     * @private
     * @type {Clutter.PropertyTransition}
     */
    transition;

    /**
     * @param {ScrollingLabelParams} params
     */
    constructor(params) {
        super({
            hscrollbarPolicy: St.PolicyType.NEVER,
            vscrollbarPolicy: St.PolicyType.NEVER,
        });
        const defaultParams = {
            direction: Clutter.TimelineDirection.FORWARD,
            isFixedWidth: true,
        };
        const { text, width, direction, isFixedWidth, isScrolling, initPaused } = {
            ...defaultParams,
            ...params,
        };
        this.isScrolling = isScrolling;
        this.isFixedWidth = isFixedWidth;
        this.initPaused = initPaused;
        this.labelWidth = width;
        this.direction = direction;
        this.onShowChangedId = null;
        this.onAdjustmentChangedId = null;
        this.onMappedId = null;
        this.box = new St.BoxLayout({
            xExpand: true,
            yExpand: true,
        });
        this.label = new St.Label({
            text,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
        });
        this.onShowChangedId = this.label.connect("show", this.onShowChanged.bind(this));
        this.box.add_child(this.label);
        this.add_child(this.box);
    }

    /**
     * @public
     * @returns {void}
     */
    pauseScrolling() {
        this.transition?.pause();
        this.initPaused = true;
    }

    /**
     * @public
     * @returns {void}
     */
    resumeScrolling() {
        this.transition?.start();
        this.initPaused = false;
    }

    /**
     * @public
     * @returns {void}
     */
    destroy() {
        // Stop and remove any active transitions before destroying
        if (this.transition) {
            const adjustment = this.get_hadjustment();
            if (adjustment) {
                adjustment.remove_transition("scroll");
            }
            this.transition = null;
        }

        // Disconnect any pending signal handlers
        if (this.onAdjustmentChangedId != null) {
            const adjustment = this.get_hadjustment();
            if (adjustment) {
                adjustment.disconnect(this.onAdjustmentChangedId);
            }
            this.onAdjustmentChangedId = null;
        }

        if (this.onShowChangedId != null && this.label) {
            this.label.disconnect(this.onShowChangedId);
            this.onShowChangedId = null;
        }

        if (this.onMappedId != null && this.label) {
            this.label.disconnect(this.onMappedId);
            this.onMappedId = null;
        }

        super.destroy();
    }

    /**
     * @private
     * @returns {void}
     */
    initScrolling() {
        const adjustment = this.get_hadjustment();
        const origText = this.label.text + "     ";

        // Clean up any existing handler first
        if (this.onAdjustmentChangedId != null) {
            adjustment.disconnect(this.onAdjustmentChangedId);
            this.onAdjustmentChangedId = null;
        }

        this.onAdjustmentChangedId = adjustment.connect(
            "changed",
            this.onAdjustmentChanged.bind(this, adjustment, origText),
        );
        this.label.text = `${origText} `;
        this.label.clutterText.ellipsize = Pango.EllipsizeMode.NONE;
    }

    /**
     * @private
     * @param {St.Adjustment} adjustment
     * @param {string} origText
     * @returns {void}
     */
    onAdjustmentChanged(adjustment, origText) {
        if (adjustment.upper <= adjustment.pageSize) {
            return;
        }

        // Check if we're on stage before creating animation
        if (!this.is_mapped() || this.get_stage() == null) {
            // Wait until we're on stage before creating the animation
            const mappedId = this.connect("notify::mapped", () => {
                if (this.is_mapped() && this.get_stage() != null) {
                    this.disconnect(mappedId);
                    this.createScrollAnimation(adjustment, origText);
                }
            });
            return;
        }

        this.createScrollAnimation(adjustment, origText);
    }

    /**
     * @private
     * @param {St.Adjustment} adjustment
     * @param {string} origText
     * @returns {void}
     */
    createScrollAnimation(adjustment, origText) {
        // Remove any existing transition first
        if (this.transition) {
            adjustment.remove_transition("scroll");
            this.transition = null;
        }

        const initial = new GObject.Value();
        initial.init(GObject.TYPE_INT);
        initial.set_int(adjustment.value);
        const final = new GObject.Value();
        final.init(GObject.TYPE_INT);
        final.set_int(adjustment.upper);
        const duration = adjustment.upper / SCROLL_ANIMATION_SPEED;
        const pspec = adjustment.find_property("value");
        const interval = new Clutter.Interval({
            valueType: pspec.value_type,
            initial,
            final,
        });
        this.transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            direction: this.direction,
            repeatCount: -1,
            duration,
            interval,
        });
        this.label.text = `${origText} ${origText}`;
        adjustment.add_transition("scroll", this.transition);

        // Disconnect the adjustment changed handler if it's still connected
        if (this.onAdjustmentChangedId != null) {
            adjustment.disconnect(this.onAdjustmentChangedId);
            this.onAdjustmentChangedId = null;
        }

        if (this.initPaused) {
            this.transition.pause();
        }
    }

    /**
     * @private
     * @returns {void}
     */
    onShowChanged() {
        if (this.label.visible === false) {
            return;
        }

        // Check if widget is actually on stage before accessing width
        if (!this.label.is_mapped() || this.label.get_stage() == null) {
            // Defer the operation until the widget is actually on stage
            this.onMappedId = this.label.connect("notify::mapped", () => {
                if (this.label.is_mapped() && this.label.get_stage() != null) {
                    this.processLabelWidth();
                    if (this.onShowChangedId != null) {
                        this.label.disconnect(this.onShowChangedId);
                        this.onShowChangedId = null;
                    }
                    if (this.onMappedId != null) {
                        this.label.disconnect(this.onMappedId);
                        this.onMappedId = null;
                    }
                }
            });
            return;
        }

        this.processLabelWidth();
        if (this.onShowChangedId != null) {
            this.label.disconnect(this.onShowChangedId);
            this.onShowChangedId = null;
        }
    }

    /**
     * @private
     * @returns {void}
     */
    processLabelWidth() {
        const isLabelWider = this.label.width > this.labelWidth && this.labelWidth > 0;
        if (isLabelWider && this.isScrolling) {
            this.initScrolling();
        }
        if (this.isFixedWidth && this.labelWidth > 0) {
            this.box.width = this.labelWidth;
            this.label.xAlign = Clutter.ActorAlign.CENTER;
            this.label.xExpand = true;
        } else if (isLabelWider) {
            this.box.width = Math.min(this.label.width, this.labelWidth);
        }
    }

    /**
     * @returns {boolean}
     */
    vfunc_scroll_event() {
        return Clutter.EVENT_PROPAGATE;
    }
}

const GScrollingLabel = GObject.registerClass(
    {
        GTypeName: "ScrollingLabel",
    },
    ScrollingLabel,
);

export default GScrollingLabel;
