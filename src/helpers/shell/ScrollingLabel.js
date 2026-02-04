import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
import St from "gi://St";
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
 */

/** @extends St.ScrollView */
class ScrollingLabel extends St.ScrollView {
    static {
        GObject.registerClass(
            {
                GTypeName: "ScrollingLabel",
            },
            this
        );
    }

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
            scrollSpeed: 100, // Default fallback
            text: "", // Defensive fallback for undefined text
        };

        const config = { ...defaultParams, ...params };
        
        // Ensure text is always a string
        if (typeof config.text !== 'string') {
            config.text = String(config.text || "");
        }

        // State
        this.isScrolling = config.isScrolling;
        this.isFixedWidth = config.isFixedWidth;
        this.initPaused = config.initPaused;
        this.labelWidth = config.width;
        this.direction = config.direction;
        this.scrollSpeed = config.scrollSpeed / 100;
        this.transition = null;
        this._signals = []; // generic signal tracker

        // UI Setup
        this.box = new St.BoxLayout({
            xExpand: true,
            yExpand: true,
        });

        this.label = new St.Label({
            text: config.text,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
        });

        this.box.add_child(this.label);
        this.add_child(this.box);

        // Lifecycle Events
        this._connectSignal(this.label, "notify::visible", this._onVisibilityChanged.bind(this));
        this._connectSignal(this, "destroy", this.onDestroy.bind(this));

        // Initial Layout Check
        if (this.label.visible) {
            this._onVisibilityChanged();
        }
    }

    /* --- PUBLIC API --- */

    pauseScrolling() {
        this.initPaused = true;
        if (this.transition) {
            this.transition.pause();
        }
    }

    resumeScrolling() {
        this.initPaused = false;
        if (this.transition) {
            this.transition.start();
        }
    }

    /* --- CLUTTER VFUNCS --- */

    /**
     * Optimization: Only animate when actually mapped on screen
     */
    vfunc_map() {
        super.vfunc_map();
        if (this.transition && !this.initPaused) {
            this.transition.start();
        }
    }

    vfunc_unmap() {
        super.vfunc_unmap();
        if (this.transition) {
            this.transition.pause();
        }
    }

    vfunc_scroll_event() {
        return Clutter.EVENT_PROPAGATE;
    }

    /* --- ANIMATION LOGIC --- */

    _initScrolling() {
        const adjustment = this.get_hadjustment();
        if (!adjustment) return;

        // Disconnect previous adjustment listener if exists
        this._disconnectSignal("adjustment-changed");

        // Add padding to text for smooth loop
        const origText = this.label.text + "     ";
        this.label.text = `${origText} `;
        this.label.clutterText.ellipsize = Pango.EllipsizeMode.NONE;

        // Listen for layout changes to start animation
        const id = adjustment.connect("changed", () => {
            this._onAdjustmentChanged(adjustment, origText);
        });
        
        // Store with a specific key to allow easy replacement
        this._signals.push({ obj: adjustment, id, key: "adjustment-changed" });
    }

    _onAdjustmentChanged(adjustment, origText) {
        if (adjustment.upper <= adjustment.pageSize) return;

        // Ensure we are on stage before creating animation
        if (!this.is_mapped() || this.get_stage() == null) {
            // One-time connection to wait for map
            const mapId = this.connect("notify::mapped", () => {
                this.disconnect(mapId);
                if (this.is_mapped()) {
                    this._createScrollAnimation(adjustment, origText);
                }
            });
            return;
        }

        this._createScrollAnimation(adjustment, origText);
    }

    _createScrollAnimation(adjustment, origText) {
        // Cleanup existing transition
        if (this.transition) {
            adjustment.remove_transition("scroll");
            this.transition = null;
        }

        // Stop listening to adjustment changes (setup complete)
        this._disconnectSignal("adjustment-changed");

        // Prepare Transition
        const duration = adjustment.upper / this.scrollSpeed;
        
        this.transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            direction: this.direction,
            repeatCount: -1,
            duration,
        });

        // Set Interval
        const interval = new Clutter.Interval({
            valueType: GObject.TYPE_INT,
            initial: adjustment.value,
            final: adjustment.upper,
        });
        this.transition.set_interval(interval);

        // Update text for seamless loop
        this.label.text = `${origText} ${origText}`;
        
        // Start
        adjustment.add_transition("scroll", this.transition);
        
        if (this.initPaused || !this.is_mapped()) {
            this.transition.pause();
        }
    }

    /* --- EVENT HANDLERS --- */

    _onVisibilityChanged() {
        if (!this.label.visible) return;

        // Defer width calculation until mapped to stage
        if (!this.label.is_mapped() || !this.label.get_stage()) {
            const mapSignalId = this.label.connect("notify::mapped", () => {
                if (this.label.is_mapped()) {
                    this.label.disconnect(mapSignalId);
                    this._processLabelWidth();
                }
            });
            return;
        }

        this._processLabelWidth();
    }

    _processLabelWidth() {
        if (!this.label.is_mapped()) return;

        // Compare natural width vs allocated/configured width
        const natWidth = this.label.get_preferred_width(-1)[1];
        const isLabelWider = natWidth > this.labelWidth && this.labelWidth > 0;

        if (isLabelWider && this.isScrolling) {
            this._initScrolling();
        }

        if (this.isFixedWidth && this.labelWidth > 0) {
            this.box.width = this.labelWidth;
            this.label.xAlign = Clutter.ActorAlign.CENTER;
            this.label.xExpand = true;
        } else if (isLabelWider) {
            this.box.width = Math.min(natWidth, this.labelWidth);
        }
    }

    /* --- UTILS & CLEANUP --- */

    /**
     * Helper to track signals for auto-cleanup
     */
    _connectSignal(obj, name, cb) {
        const id = obj.connect(name, cb);
        this._signals.push({ obj, id, key: null });
    }

    /**
     * Disconnect specific signal by key or generic cleanup
     */
    _disconnectSignal(key) {
        const index = this._signals.findIndex(s => s.key === key);
        if (index !== -1) {
            const s = this._signals[index];
            s.obj.disconnect(s.id);
            this._signals.splice(index, 1);
        }
    }

    onDestroy() {
        // Remove Animation
        if (this.transition) {
            const adjustment = this.get_hadjustment();
            if (adjustment) adjustment.remove_transition("scroll");
            this.transition = null;
        }

        // Disconnect all tracked signals
        this._signals.forEach(s => {
            try {
                s.obj.disconnect(s.id);
            } catch (e) {
                // Ignore if object already destroyed
            }
        });
        this._signals = [];
    }
}

export default ScrollingLabel;