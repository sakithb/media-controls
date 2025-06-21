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
     * @private
     * @returns {void}
     */
    initScrolling() {
        const adjustment = this.get_hadjustment();
        const origText = this.label.text + "     ";
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
        adjustment.disconnect(this.onAdjustmentChangedId);
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
        this.label.disconnect(this.onShowChangedId);
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
