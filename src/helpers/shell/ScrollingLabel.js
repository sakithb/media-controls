import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import GLib from "gi://GLib";
import Pango from "gi://Pango";
import St from "gi://St";

const SCROLL_ANIMATION_SPEED = 0.04;

/**
 * Check if an actor is properly allocated and ready for operations
 * @param {any} actor - The Clutter actor to check
 * @returns {boolean}
 */
const isActorProperlyAllocated = (actor) => {
    if (!actor) {
        return false;
    }

    const mapped = actor.mapped;
    const visible = actor.visible;
    const hasAllocation = actor.has_allocation();
    const allocationBox = hasAllocation ? actor.get_allocation_box() : null;
    const hasWidth = allocationBox ? (allocationBox.x2 - allocationBox.x1) > 0 : false;
    const hasHeight = allocationBox ? (allocationBox.y2 - allocationBox.y1) > 0 : false;
    const hasParent = actor.get_parent() !== null;

    return mapped && visible && hasAllocation && hasWidth && hasHeight && hasParent;
};

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
     * @type {boolean}
     */
    isInitiallyVisible;
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
     * @type {number[]}
     */
    pendingTimeouts;
    /**
     * @private
     * @type {St.Adjustment}
     */
    adjustment;

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
        this.isInitiallyVisible = false;
        this.labelWidth = width;
        this.direction = direction;
        this.pendingTimeouts = [];
        this.adjustment = null;
        this.box = new St.BoxLayout({
            xExpand: true,
            yExpand: true,
        });
        this.label = new St.Label({
            text,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
        });
        this.onShowChangedId = this.label.connect("notify::mapped", this.onShowChanged.bind(this));
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
        // Ensure the widget is on the stage before proceeding with scrolling animation
        if (!this.mapped || !this.label.mapped) {
            // If not mapped yet, wait until it is before initializing scrolling
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (this.mapped && this.label.mapped) {
                    this.doInitScrolling();
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
        } else {
            this.doInitScrolling();
        }
    }

    doInitScrolling() {
        // Check if the actors are properly allocated before initializing scrolling
        const scrollViewProperlyAllocated = isActorProperlyAllocated(this);
        const labelProperlyAllocated = isActorProperlyAllocated(this.label);
        const boxProperlyAllocated = isActorProperlyAllocated(this.box);

        if (!scrollViewProperlyAllocated || !labelProperlyAllocated || !boxProperlyAllocated) {
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (isActorProperlyAllocated(this) &&
                    isActorProperlyAllocated(this.label) &&
                    isActorProperlyAllocated(this.box)) {
                    this.reallyDoInitScrolling();
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
            return;
        }

        this.reallyDoInitScrolling();
    }

    reallyDoInitScrolling() {
        this.adjustment = this.get_hadjustment();
        if (!this.adjustment) {
            return;
        }
        const origText = this.label.text + "     ";
        this.onAdjustmentChangedId = this.adjustment.connect(
            "changed",
            this.onAdjustmentChanged.bind(this, this.adjustment, origText),
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

        // Check if the actor is on the stage before creating animations
        const onStage = this.get_stage() !== null;
        if (!onStage || !this.mapped || !this.label.mapped || !isActorProperlyAllocated(this) || !isActorProperlyAllocated(this.label)) {
            // Retry after a small delay if not properly allocated
            const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                const nowOnStage = this.get_stage() !== null;
                if (nowOnStage && this.mapped && this.label.mapped &&
                    isActorProperlyAllocated(this) &&
                    isActorProperlyAllocated(this.label)) {
                    this.removePendingTimeout(timeoutId);
                    this.createScrollTransition(adjustment, origText);
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
            this.pendingTimeouts.push(timeoutId);
            return;
        }

        this.createScrollTransition(adjustment, origText);
    }

    createScrollTransition(adjustment, origText) {
        // Ensure we're on stage before creating transitions
        if (!this.get_stage()) {
            return;
        }

        // Disconnect the adjustment signal first
        adjustment.disconnect(this.onAdjustmentChangedId);

        // Defer all modifications to avoid triggering relayout during allocation
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            if (!this.get_stage() || !adjustment) {
                return GLib.SOURCE_REMOVE;
            }

            // Update the label text to duplicate it for scrolling
            this.label.text = `${origText} ${origText}`;

            // Wait one more frame for the text change to be processed
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (!this.get_stage() || !adjustment) {
                    return GLib.SOURCE_REMOVE;
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

                adjustment.add_transition("scroll", this.transition);

                if (this.initPaused) {
                    this.transition.pause();
                }

                return GLib.SOURCE_REMOVE;
            });

            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * @private
     * @returns {void}
     */
    onShowChanged() {
        if (!this.label.mapped) {
            return;
        }

        // Only proceed if we haven't initialized yet
        if (this.isInitiallyVisible) {
            return;
        }

        this.isInitiallyVisible = true;

        // Use GLib.idle_add to ensure the widget is properly allocated before proceeding
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            if (this.label && this.labelWidth > 0) {
                // Get the allocation box to determine the actual width safely
                const labelAlloc = this.label.get_allocation_box();
                const labelWidth = labelAlloc ? (labelAlloc.x2 - labelAlloc.x1) : 0;

                // Only proceed if we have a valid label width
                if (labelWidth > 0) {
                    const isLabelWider = labelWidth > this.labelWidth && this.labelWidth > 0;

                    if (isLabelWider && this.isScrolling) {
                        this.initScrolling();
                    }

                    if (this.isFixedWidth && this.labelWidth > 0) {
                        this.box.width = this.labelWidth;
                        this.label.xAlign = Clutter.ActorAlign.CENTER;
                        this.label.xExpand = true;
                    } else if (isLabelWider) {
                        this.box.width = Math.min(labelWidth, this.labelWidth);
                    }
                }
            }

            // Disconnect the signal after we've initialized
            if (this.label && this.onShowChangedId) {
                this.label.disconnect(this.onShowChangedId);
            }

            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * @private
     * @param {number} timeoutId
     * @returns {void}
     */
    removePendingTimeout(timeoutId) {
        const index = this.pendingTimeouts.indexOf(timeoutId);
        if (index > -1) {
            this.pendingTimeouts.splice(index, 1);
        }
    }

    /**
     * @returns {boolean}
     */
    vfunc_scroll_event() {
        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * Clean up resources before destruction
     * @public
     * @returns {void}
     */
    cleanup() {
        // Disconnect signals - check if widgets still exist and haven't been destroyed
        if (this.label && this.onShowChangedId) {
            try {
                // Check if the label is still valid before disconnecting
                if (!this.label.toString().includes('disposed')) {
                    this.label.disconnect(this.onShowChangedId);
                }
            } catch (e) {
                // Label already destroyed, ignore
            }
            this.onShowChangedId = null;
        }

        if (this.adjustment && this.onAdjustmentChangedId) {
            try {
                this.adjustment.disconnect(this.onAdjustmentChangedId);
            } catch (e) {
                // Adjustment already destroyed, ignore
            }
            this.onAdjustmentChangedId = null;
        }

        // Stop and remove transition
        if (this.transition) {
            try {
                this.transition.stop();
                if (this.adjustment) {
                    this.adjustment.remove_transition("scroll");
                }
            } catch (e) {
                // Transition or adjustment already destroyed, ignore
            }
            this.transition = null;
        }

        // Clear all pending timeouts
        for (const timeoutId of this.pendingTimeouts) {
            try {
                GLib.source_remove(timeoutId);
            } catch (e) {
                // Timeout already removed, ignore
            }
        }
        this.pendingTimeouts = [];

        // Clear references
        this.adjustment = null;
    }
}

const GScrollingLabel = GObject.registerClass(
    {
        GTypeName: "ScrollingLabel",
    },
    ScrollingLabel,
);

export default GScrollingLabel;
