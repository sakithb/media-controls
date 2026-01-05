import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
import St from "gi://St";
import GLib from "gi://GLib"
import { debugLog } from "../../utils/common.js";

/**
 * @typedef {Object} ScrollingLabelParams
 * @property {string} text
 * @property {number} width
 * @property {Clutter.TimelineDirection} [direction]
 * @property {boolean} [isFixedWidth]
 * @property {boolean} isScrolling
 * @property {boolean} initPaused
 * @property {number} [scrollSpeed]
 * @property {number} [scrollPauseTime]
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
     * @private
     * @type {number}
     */
    scrollSpeed;

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
            scrollPauseTime: 0,
        };
        const { text, width, direction, isFixedWidth, isScrolling, initPaused, scrollSpeed, scrollPauseTime } = {
            ...defaultParams,
            ...params,
        };
        this.scrollPauseTime = scrollPauseTime;
        this.isScrolling = isScrolling;
        this.isFixedWidth = isFixedWidth;
        this.initPaused = initPaused;
        this.labelWidth = width;
        this.direction = direction;
        this.onShowChangedId = null;
        this.onAdjustmentChangedId = null;
        this.onMappedId = null;
        this.pauseTimerId = null;
        this.scrollSpeed = scrollSpeed / 100;
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
        
        if (this.pauseTimerId != null) {
            GLib.source_remove(this.pauseTimerId);
            this.pauseTimerId = null;
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
        if (this.pauseTimerId != null) {
            GLib.source_remove(this.pauseTimerId);
            this.pauseTimerId = null;
        }

        const initial = new GObject.Value();
        initial.init(GObject.TYPE_INT);
        initial.set_int(adjustment.value);
        const final = new GObject.Value();
        final.init(GObject.TYPE_INT);
        final.set_int(adjustment.upper);
        const duration = (adjustment.upper - adjustment.value) / this.scrollSpeed;
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
            repeatCount: 0,
            duration,
            interval,
        });
        this.label.text = `${origText} ${origText}`;

        // Disconnect the adjustment changed handler if it's still connected
        if (this.onAdjustmentChangedId != null) {
            adjustment.disconnect(this.onAdjustmentChangedId);
            this.onAdjustmentChangedId = null;
        }

        this.transition.connect("completed", () => {
            this.transition.rewind(); // Snap back to 0
            
            if (this.scrollPauseTime > 0) {
                this.pauseTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.scrollPauseTime, () => {
                    this.pauseTimerId = null;
                    if (!this.initPaused) {
                        this.transition.start();
                    }
                    return GLib.SOURCE_REMOVE;
                });
            } else {
                if (!this.initPaused) {
                    this.transition.start();
                }
            }
        });

        if (this.scrollPauseTime > 0) {
            this.pauseTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.scrollPauseTime, () => {
                this.pauseTimerId = null;
                adjustment.add_transition("scroll", this.transition);
                if (this.initPaused) {
                    this.transition.pause();
                }
                return GLib.SOURCE_REMOVE;
            });
        } else {
            adjustment.add_transition("scroll", this.transition);
            if (this.initPaused) {
                this.transition.pause();
            }
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
        debugLog(this.label.width, this.labelWidth);
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
