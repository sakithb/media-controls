import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Pango from "gi://Pango";
import St from "gi://St";

const SCROLL_ANIMATION_SPEED = 0.04;

class ScrollingLabel extends St.ScrollView {
    public label: St.Label;

    private box: St.BoxLayout;
    private onAdjustmentChangedId: number;

    private initPaused: boolean;
    private labelWidth: number;
    private direction: Clutter.TimelineDirection;

    private transition: Clutter.PropertyTransition;

    constructor(
        text: string,
        labelWidth: number,
        isFixedWidth: boolean,
        isScrolling: boolean,
        initPaused: boolean,
        direction = Clutter.TimelineDirection.FORWARD,
    ) {
        super({
            hscrollbarPolicy: St.PolicyType.NEVER,
            vscrollbarPolicy: St.PolicyType.NEVER,
        });

        this.initPaused = initPaused;
        this.labelWidth = labelWidth;
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

        const signalId = this.label.connect("show", () => {
            if (this.label.visible === false) {
                return;
            }

            const isLabelWider = this.label.width > this.labelWidth;

            if (isLabelWider && isScrolling) {
                this.initScrolling();
            }

            if (isFixedWidth) {
                this.box.width = this.labelWidth;
                this.label.xAlign = Clutter.ActorAlign.CENTER;
                this.label.xExpand = true;
            } else if (isLabelWider) {
                this.box.width = Math.min(this.label.width, this.labelWidth);
            }

            this.label.disconnect(signalId);
        });

        this.box.add_child(this.label);
        this.add_actor(this.box);
    }

    public pauseScrolling() {
        this.transition?.pause();
        this.initPaused = true;
    }

    public resumeScrolling() {
        this.transition?.start();
        this.initPaused = false;
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

    vfunc_scroll_event(): boolean {
        return Clutter.EVENT_PROPAGATE;
    }
}

const GScrollingLabel = GObject.registerClass(
    {
        GTypeName: "ScrollingLabel",
        Properties: {},
    },
    ScrollingLabel,
);

export default GScrollingLabel;
