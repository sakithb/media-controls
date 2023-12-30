import Clutter from "gi://Clutter?version=13";
import GObject from "gi://GObject?version=2.0";
import Pango from "gi://Pango?version=1.0";
import St from "gi://St?version=13";

const SCROLL_ANIMATION_SPEED = 0.04;

class ScrollingLabel extends St.ScrollView {
    private label: St.Label;
    private box: St.BoxLayout;
    private onAdjustmentChangedId: number;

    private initPaused: boolean;
    private labelWidth: number;
    private fixedWidth: boolean;
    private isScrolling: boolean;

    constructor(text: string, labelWidth: number, fixedWidth: boolean, isScrolling: boolean, initPaused: boolean) {
        super({
            hscrollbarPolicy: St.PolicyType.NEVER,
            vscrollbarPolicy: St.PolicyType.NEVER,
        });

        this.initPaused = initPaused;
        this.labelWidth = labelWidth;
        this.fixedWidth = fixedWidth;
        this.isScrolling = isScrolling;

        this.box = new St.BoxLayout({
            xExpand: true,
            yExpand: true,
        });

        this.label = new St.Label({
            text,
            yAlign: Clutter.ActorAlign.CENTER,
            xAlign: Clutter.ActorAlign.START,
        });

        const signalId = this.label.connect("show", () => {
            const isLabelWider = this.label.width > this.labelWidth;

            if (isLabelWider && isScrolling) {
                this.initScrolling();
            }

            if (fixedWidth) {
                this.box.width = this.labelWidth;
            } else if (isLabelWider) {
                this.box.width = Math.min(this.label.width, this.labelWidth);
            }

            this.label.disconnect(signalId);
        });

        this.box.add_child(this.label);
        this.add_actor(this.box);
    }

    public pauseScrolling() {
        const transition = this.hscroll.adjustment.get_transition("scroll");

        if (transition == null) {
            return;
        }

        transition.pause();
    }

    public resumeScrolling() {
        const transition = this.hscroll.adjustment.get_transition("scroll");

        if (transition == null) {
            return;
        }

        transition.start();
    }

    private initScrolling() {
        const adjustment = this.hscroll.adjustment;
        const origText = this.label.text;

        this.onAdjustmentChangedId = adjustment.connect(
            "changed",
            this.onAdjustmentChanged.bind(this, adjustment, origText),
        );

        this.label.text = `${origText} `;
        this.label.clutterText.ellipsize = Pango.EllipsizeMode.NONE;
    }

    private onAdjustmentChanged(adjustment: St.Adjustment, origText: string) {
        if (adjustment.upper <= adjustment.pageSize) {
            return;
        }

        const initial = adjustment.value;
        const final = adjustment.upper;
        const duration = adjustment.upper / SCROLL_ANIMATION_SPEED;

        const pspec = adjustment.find_property("value");
        const interval = new Clutter.Interval({
            valueType: pspec.value_type,
            initial,
            final,
        });

        const transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            repeatCount: -1,
            duration,
            delay: 0,
            interval,
        });

        this.label.text = `${origText} ${origText}`;
        adjustment.add_transition("scroll", transition);
        adjustment.disconnect(this.onAdjustmentChangedId);

        if (this.initPaused) {
            transition.pause();
        }
    }

    vfunc_scroll_event(): boolean {
        return Clutter.EVENT_PROPAGATE;
    }
}

const classPropertiers = {
    GTypeName: "McScrollingLabel",
    Properties: {},
};

export default GObject.registerClass(classPropertiers, ScrollingLabel);
