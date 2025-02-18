import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import St from "gi://St";

import * as Slider from "resource:///org/gnome/shell/ui/slider.js";
import { msToHHMMSS } from "../../utils/common.js";

class MenuSlider extends St.BoxLayout {
    private transition: Clutter.PropertyTransition;

    private slider: Slider.Slider;
    private textBox: St.BoxLayout;
    private elapsedLabel: St.Label;
    private durationLabel: St.Label;

    private dragPaused: boolean;
    private disabled: boolean;

    private rate: number;

    constructor() {
        super({ orientation: Clutter.Orientation.VERTICAL });

        this.rate = 1.0;
        this.slider = new Slider.Slider(0);
        this.textBox = new St.BoxLayout();

        this.elapsedLabel = new St.Label({
            text: "00:00",
            xExpand: true,
            xAlign: Clutter.ActorAlign.START,
        });

        this.durationLabel = new St.Label({
            text: "00:00",
            xExpand: true,
            xAlign: Clutter.ActorAlign.END,
        });

        this.slider.connect("drag-begin", () => {
            if (this.transition.is_playing() && this.disabled === false) {
                this.transition.pause();
                this.dragPaused = true;
            }

            return Clutter.EVENT_PROPAGATE;
        });

        this.slider.connect("drag-end", () => {
            const ms = this.slider.value * this.transition.duration;
            this.emit("seeked", Math.floor(ms * 1000));

            if (this.dragPaused) {
                this.transition.advance(ms);
                this.transition.start();
                this.dragPaused = false;
            }

            return Clutter.EVENT_PROPAGATE;
        });

        this.slider.connect("scroll-event", () => {
            return Clutter.EVENT_STOP;
        });

        this.transition = new Clutter.PropertyTransition({
            propertyName: "value",
            progressMode: Clutter.AnimationMode.LINEAR,
            repeatCount: 1,
            interval: new Clutter.Interval({
                valueType: GObject.TYPE_DOUBLE,
                initial: 0,
                final: 1,
            }),
        });

        this.transition.connect("marker-reached", (_, name: string) => {
            this.elapsedLabel.text = name;
        });

        this.textBox.add_child(this.elapsedLabel);
        this.textBox.add_child(this.durationLabel);
        this.add_child(this.textBox);
        this.add_child(this.slider);

        this.slider.add_transition("progress", this.transition);
        this.connect("destroy", this.onDestroy.bind(this));
        this.setDisabled(true);
    }

    public updateSlider(position: number, length: number, rate: number) {
        this.rate = rate || 1.0;
        this.setLength(length);
        this.setPosition(position);
    }

    public setRate(rate: number) {
        const oldRate = this.rate;
        this.rate = rate || 1.0;

        this.setPosition(this.transition.get_elapsed_time() * oldRate * 1000);
        this.setLength(this.transition.duration * oldRate * 1000);
    }

    public setPosition(position: number) {
        position = position / 1000;

        this.elapsedLabel.text = msToHHMMSS(position);
        this.slider.value = position / this.rate / this.transition.duration;
        this.transition.advance(position / this.rate);
    }

    public setLength(length: number) {
        length = length / 1000;

        this.durationLabel.text = msToHHMMSS(length);
        this.slider.value = 0;
        this.transition.set_duration(length / this.rate);
        this.transition.rewind();

        this.updateMarkers();
    }

    public pauseTransition() {
        if (this.disabled === false) {
            this.transition.pause();
        }
    }

    public resumeTransition() {
        if (this.disabled === false) {
            this.transition.start();
        }
    }

    public setDisabled(disabled: boolean) {
        this.disabled = disabled;
        this.slider.reactive = !disabled;
        this.opacity = disabled ? 127 : 255;

        if (disabled) {
            this.durationLabel.text = "00:00";
            this.elapsedLabel.text = "00:00";

            this.transition.set_duration(1);
            this.transition.stop();
            this.slider.value = 0;
        } else {
            this.updateMarkers();
        }
    }

    private updateMarkers() {
        const noOfSecs = Math.floor(this.transition.duration / (1000 / this.rate));
        const markers = this.transition.list_markers(-1);

        for (const marker of markers) {
            this.transition.remove_marker(marker);
        }

        for (let i = 0; i <= noOfSecs; i++) {
            const ms = i * 1000;
            const elapsedText = msToHHMMSS(ms);
            this.transition.add_marker_at_time(elapsedText, ms / this.rate);
        }
    }

    private onDestroy() {
        this.slider.remove_transition("progress");
        this.slider.destroy();
        this.textBox.destroy();
    }
}

const GMenuSlider = GObject.registerClass(
    {
        GTypeName: "MenuSlider",
        Signals: {
            seeked: {
                param_types: [GObject.TYPE_INT],
            },
        },
    },
    MenuSlider,
);

export default GMenuSlider;
