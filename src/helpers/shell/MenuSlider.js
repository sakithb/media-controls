import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import St from "gi://St";
import Cairo from "gi://cairo";
import GLib from "gi://GLib";
import { formatTime } from "../../utils/common.js"; 

const WAVE_AMPLITUDE = 4.0;
const WAVE_FREQUENCY = 0.08;
const WAVE_SPEED = 0.04;
const SLIDER_HEIGHT = 30;
const SIDE_PADDING = 12;

function getCanvasConstructor() {
    if (typeof Clutter.Canvas !== "undefined") return Clutter.Canvas;
    return null;
}

class MenuSlider extends St.BoxLayout {
    static {
        GObject.registerClass(
            {
                GTypeName: "MenuSlider",
                Signals: {
                    seeked: { param_types: [GObject.TYPE_INT] },
                },
            },
            this
        );
    }

    constructor() {
        super({ vertical: true });

        this.textBox = new St.BoxLayout();
        this.elapsedLabel = new St.Label({
            text: "00:00",
            xExpand: true,
            xAlign: Clutter.ActorAlign.START,
            styleClass: "popup-menu-label-time", 
        });
        this.durationLabel = new St.Label({
            text: "00:00",
            xExpand: true,
            xAlign: Clutter.ActorAlign.END,
            styleClass: "popup-menu-label-time", 
        });
        this.textBox.add_child(this.elapsedLabel);
        this.textBox.add_child(this.durationLabel);
        this.add_child(this.textBox);

        this._duration = 1; 
        this._position = 0; 
        this._rate = 1.0;
        this._currentTrackId = null;
        this._isPlaying = false;
        this._isDisabled = true;
        this._isDragging = false;
        this._phase = 0;
        this._lastFrameTime = 0;
        this._canDrawSnake = false;
        this._timeoutId = 0;

        const CanvasClass = getCanvasConstructor();

        if (CanvasClass) {
            try {
                this._canvas = new CanvasClass();
                this._canvas.connect("draw", this._onDrawSnake.bind(this));

                this._sliderActor = new St.Widget({
                    height: SLIDER_HEIGHT,
                    xExpand: true,
                    yExpand: false,
                    reactive: true,
                });
                this._sliderActor.set_content(this._canvas);
                
                this._sliderActor.connect("allocation-changed", (actor, box) => {
                    const width = box.x2 - box.x1;
                    const height = box.y2 - box.y1;
                    if (width > 0 && height > 0) {
                        this._canvas.set_size(width, height);
                    }
                });

                this._canDrawSnake = true;
            } catch (e) {
                this._setupFallbackSlider();
            }
        } else if (typeof St.DrawingArea !== "undefined") {
            try {
                this._sliderActor = new St.DrawingArea({
                    height: SLIDER_HEIGHT,
                    xExpand: true,
                    yExpand: false,
                    reactive: true,
                });
                this._sliderActor.connect("repaint", this._onDrawSnake.bind(this)); 
                this._canDrawSnake = true;
            } catch (e) {
                this._setupFallbackSlider();
            }
        } else {
            this._setupFallbackSlider();
        }

        if (this._sliderActor) {
            this.add_child(this._sliderActor);
            this._sliderActor.connect("button-press-event", this._onPress.bind(this));
            this._sliderActor.connect("motion-event", this._onMotion.bind(this));
            this._sliderActor.connect("button-release-event", this._onRelease.bind(this));
        }

        this.connect("destroy", this.onDestroy.bind(this));
        this.setDisabled(true);
    }

    _setupFallbackSlider() {
        this._sliderActor = new St.Widget({
            height: 10,
            xExpand: true,
            yExpand: false,
            reactive: true,
            styleClass: "slider-fallback-container"
        });
        this._canDrawSnake = false;
        this._progressBar = new St.Widget({
            styleClass: "slider-fallback-progress",
            height: 10,
            width: 0 
        });
        this._sliderActor.add_child(this._progressBar);
    }

    _onDrawSnake(canvas, cr, width, height) {
        if (typeof width === 'undefined') {
            cr = canvas.get_context();
            width = this._sliderActor.get_width();
            height = this._sliderActor.get_height();
        }

        const centerY = height / 2;
        const drawWidth = width - (SIDE_PADDING * 2); 
        
        const safeDuration = this._duration > 0 ? this._duration : 1;
        const progressRatio = Math.min(1, Math.max(0, this._position / safeDuration));
        
        const startX = SIDE_PADDING;
        const currentX = startX + (drawWidth * progressRatio);
        const endX = startX + drawWidth;

        if (this._canvas) {
            cr.setOperator(Cairo.Operator.CLEAR);
            cr.paint();
            cr.setOperator(Cairo.Operator.OVER);
        }

        cr.setSourceRGBA(1, 1, 1, 0.3); 
        cr.setLineWidth(6); 
        cr.setLineCap(Cairo.LineCap.ROUND);
        if (currentX < endX) {
            cr.moveTo(currentX, centerY);
            cr.lineTo(endX, centerY);
            cr.stroke();
        }

        cr.setSourceRGBA(1, 1, 1, 1.0); 
        cr.setLineWidth(6); 
        cr.setLineCap(Cairo.LineCap.ROUND);

        if (currentX > startX) {
            cr.moveTo(startX, centerY);
            const dist = currentX - startX;
            for (let i = 0; i <= dist; i++) {
                let x = startX + i;
                let y = centerY;
                if (this._isPlaying && !this._isDragging) {
                    const startDamping = Math.min(1, i / 15);
                    const endDamping = Math.min(1, (dist - i) / 15);
                    y += Math.sin(i * WAVE_FREQUENCY - this._phase) * WAVE_AMPLITUDE * startDamping * endDamping;
                }
                cr.lineTo(x, y);
            }
            cr.stroke();
        }

        cr.setSourceRGBA(1, 1, 1, 1.0);
        cr.arc(currentX, centerY, 8, 0, 2 * Math.PI);
        cr.fill();
        
        return true;
    }

    _startAnimation() {
        if (this._timeoutId) return;
        this._lastFrameTime = GLib.get_monotonic_time();
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
            this._onTick();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopAnimation() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }

    _onTick() {
        if (this._isDisabled) return true;

        const now = GLib.get_monotonic_time();
        const dt = (now - this._lastFrameTime) / 1000000;
        this._lastFrameTime = now;

        if (this._isPlaying && !this._isDragging) {
            const effectiveRate = (this._rate && this._rate > 0) ? this._rate : 1.0;
            this._position += dt * effectiveRate;
            
            if (this._position > this._duration + 2) this._position = this._duration;
            
            this._phase += WAVE_SPEED;
        }

        this.elapsedLabel.text = formatTime(this._position);

        if (this._canDrawSnake) {
            if (this._canvas) this._canvas.invalidate();
            else this._sliderActor.queue_repaint();
        } else if (this._progressBar) {
             const ratio = this._position / (this._duration || 1);
             const w = this._sliderActor.get_width();
             this._progressBar.width = w * ratio;
        }
    }

    reset() {
        this._isDragging = false;
        this._position = 0;
        this._phase = 0;
        this.elapsedLabel.text = "00:00";
        if (this._canDrawSnake) {
            if (this._canvas) this._canvas.invalidate();
            else this._sliderActor.queue_repaint();
        }
    }

    updateSlider(position, length, rate, trackId) {
        if (this._isDragging) return;
        
        this._rate = rate || 1.0;
        this.setLength(length);

        if (trackId && this._currentTrackId !== trackId) {
            this._currentTrackId = trackId;
            this._position = 0;
            this.elapsedLabel.text = "00:00";
            if (this._canDrawSnake && this._canvas) this._canvas.invalidate();
        }

        const newPos = position / 1000000;
        
        if (newPos < this._position - 2.0) {
             this._position = newPos; 
        } 
        else if (Math.abs(this._position - newPos) > 1.0) {
             this._position = newPos;
        }
    }

    setRate(rate) { this._rate = rate || 1.0; }

    setPosition(position) {
        if (this._isDragging) return;
        this._position = position / 1000000; 
        this.elapsedLabel.text = formatTime(this._position);
        if (this._canDrawSnake) {
            if(this._canvas) this._canvas.invalidate();
            else this._sliderActor.queue_repaint();
        }
    }

    setLength(length) {
        const seconds = length / 1000000;
        this._duration = seconds;
        this.durationLabel.text = formatTime(seconds);
    }

    pauseTransition() {
        this._isPlaying = false;
        this._stopAnimation(); 
        if (this._canDrawSnake) {
             if(this._canvas) this._canvas.invalidate();
             else this._sliderActor.queue_repaint();
        }
    }

    resumeTransition() {
        if (!this._isDisabled) {
            this._isPlaying = true;
            this._lastFrameTime = GLib.get_monotonic_time();
            this._startAnimation();
        }
    }

    setDisabled(disabled) {
        this._isDisabled = disabled;
        this._sliderActor.reactive = !disabled;
        this.opacity = disabled ? 127 : 255;
        if (disabled) {
            this._stopAnimation();
            this.durationLabel.text = "00:00";
            this.elapsedLabel.text = "00:00";
            this._position = 0;
            this._isPlaying = false;
            if (this._canDrawSnake) {
                if(this._canvas) this._canvas.invalidate();
                else this._sliderActor.queue_repaint();
            }
        }
    }

    _getPosFromEvent(event) {
        const [x] = event.get_coords();
        const [absX] = this._sliderActor.get_transformed_position();
        let relX = x - absX;
        const width = this._sliderActor.get_width();
        const drawWidth = width - (SIDE_PADDING * 2);
        relX = relX - SIDE_PADDING;
        return Math.min(1, Math.max(0, relX / drawWidth));
    }

    _onPress(actor, event) {
        if (this._isDisabled) return Clutter.EVENT_PROPAGATE;
        this._isDragging = true;
        this._position = this._getPosFromEvent(event) * this._duration;
        this.elapsedLabel.text = formatTime(this._position);
        if(this._canDrawSnake) this._sliderActor.queue_repaint();
        return Clutter.EVENT_STOP;
    }

    _onMotion(actor, event) {
        if (this._isDragging) {
            this._position = this._getPosFromEvent(event) * this._duration;
            this.elapsedLabel.text = formatTime(this._position);
            if(this._canDrawSnake) this._sliderActor.queue_repaint();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _onRelease(actor, event) {
        if (this._isDragging) {
            this._isDragging = false;
            const seekPct = this._getPosFromEvent(event);
            const seekSeconds = seekPct * this._duration;
            this._position = seekSeconds;
            this.emit("seeked", Math.floor(seekSeconds * 1000000));
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    onDestroy() {
        this._stopAnimation();
    }
}

export default MenuSlider;