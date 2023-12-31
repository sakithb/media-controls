import Clutter from "gi://Clutter?version=13";
import GObject from "gi://GObject?version=2.0";
import St from "gi://St?version=13";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";
import { msToHHMMSS } from "../utils/common.js";

class MenuSlider extends St.BoxLayout {
    private transition: Clutter.PropertyTransition;

    private slider: Slider.Slider;
    private textBox: St.BoxLayout;
    private elapsedLabel: St.Label;
    private durationLabel: St.Label;

    private dragPaused: boolean;

    constructor(initLocation: number, initLength: number, initPaused: boolean) {
        super({ vertical: true });

        initLocation = initLocation / 1000;
        initLength = initLength / 1000;

        const initialValue = initLocation / initLength;
        const elapsedText = msToHHMMSS(initLocation);
        const durationText = msToHHMMSS(initLength);

        this.slider = new Slider.Slider(initialValue);
        this.textBox = new St.BoxLayout();

        this.elapsedLabel = new St.Label({
            text: elapsedText,
            xExpand: true,
            xAlign: Clutter.ActorAlign.START,
        });

        this.durationLabel = new St.Label({
            text: durationText,
            xExpand: true,
            xAlign: Clutter.ActorAlign.END,
        });

        const sliderInterval = new Clutter.Interval({
            valueType: GObject.TYPE_DOUBLE,
            initial: 0,
            final: 1,
        });

        this.transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            interval: sliderInterval,
            duration: initLength,
            repeatCount: 1,
        });

        this.transition.connect("marker-reached", (_, name: string) => {
            this.elapsedLabel.text = name;
        });

        this.slider.connect("drag-begin", () => {
            if (this.transition.is_playing()) {
                this.transition.pause();
                this.dragPaused = true;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.slider.connect("drag-end", () => {
            const ms = this.slider.value * this.transition.duration;

            if (this.dragPaused) {
                this.transition.advance(ms);
                this.transition.start();
                this.dragPaused = false;
            }

            this.emit("seeked", Math.floor(ms * 1000));
            return Clutter.EVENT_PROPAGATE;
        });

        this.slider.connect("scroll-event", () => {
            return Clutter.EVENT_STOP;
        });

        this.updateMarkers();
        this.slider.add_transition("progress", this.transition);

        this.transition.skip(initLocation);

        if (initPaused) {
            this.pauseTransition();
        }

        this.textBox.add_child(this.elapsedLabel);
        this.textBox.add_child(this.durationLabel);
        this.add_child(this.textBox);
        this.add_child(this.slider);
    }

    private updateMarkers() {
        const noOfSecs = Math.floor(this.transition.duration / 1000);
        const markers = this.transition.list_markers(-1);

        for (const marker of markers) {
            this.transition.remove_marker(marker);
        }

        for (let i = 0; i <= noOfSecs; i++) {
            const ms = i * 1000;
            const elapsedText = msToHHMMSS(ms);
            this.transition.add_marker_at_time(elapsedText, ms);
        }
    }

    public setPosition(position: number) {
        position = position / 1000;

        this.transition.advance(position);
        this.slider.value = position / this.transition.duration;
        this.elapsedLabel.text = msToHHMMSS(position);
    }

    public setLength(length: number) {
        length = length / 1000;

        this.transition.set_duration(length);
        this.durationLabel.text = msToHHMMSS(length);
        this.updateMarkers();
    }

    public pauseTransition() {
        this.transition.pause();
    }

    public resumeTransition() {
        this.transition.start();
    }

    public setDisabled(disabled: boolean) {
        this.slider.reactive = !disabled;
        this.elapsedLabel.text = disabled ? "00:00" : this.elapsedLabel.text;
        this.durationLabel.text = disabled ? "00:00" : this.durationLabel.text;
        this.transition.set_duration(disabled ? 0 : this.transition.duration);
        this.updateMarkers();
    }
}

const classPropertiers = {
    GTypeName: "McMenuSlider",
    Signals: {
        seeked: {
            param_types: [GObject.TYPE_INT],
        },
    },
};

export default GObject.registerClass(classPropertiers, MenuSlider);
