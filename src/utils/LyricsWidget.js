import GObject from 'gi://GObject';
import St from 'gi://St';
import PangoCairo from 'gi://PangoCairo';
import Pango from 'gi://Pango';
import GLib from 'gi://GLib';

export const LyricsWidget = GObject.registerClass({
    GTypeName: 'LyricsWidget'
}, class LyricsWidget extends St.DrawingArea {

    _init(width, height) {
        super._init({
            style_class: 'lyrics-widget',
            reactive: false,
            can_focus: false,
            x_expand: true,
            y_expand: true,
            width,
            height
        });

        this.set_style(`
            padding: 0;
            margin: 0;
        `);

        this._lyrics = [];
        this._lineGeometries = [];
        this._totalHeight = 0;

        this._activeIndex = -1;
        this._currentTime = 0;

        this._scrollOffset = 0;
        this._targetScrollOffset = 0;
        this._tickId = 0;

        this._state = 'loading';
    }

    /* ---------- STATE HELPERS ---------- */

    showLoading() {
        this._state = 'loading';
        this._lyrics = [];
        this.queue_repaint();
    }

    showEmpty() {
        this._state = 'empty';
        this._lyrics = [];
        this.queue_repaint();
    }

    setLyrics(lyrics) {
        if (!lyrics || lyrics.length === 0) {
            this.showEmpty();
            return;
        }

        this._state = 'lyrics';
        this._lyrics = lyrics;
        this._activeIndex = -1;
        this._currentTime = 0;
        this._scrollOffset = 0;
        this._targetScrollOffset = 0;
        this._lineGeometries = [];
        this.queue_repaint();
    }

    updatePosition(timeInMs) {
        if (this._state !== 'lyrics') return;

        this._currentTime = timeInMs;

        let newIndex = -1;
        for (let i = 0; i < this._lyrics.length; i++) {
            if (this._lyrics[i].time <= timeInMs)
                newIndex = i;
            else
                break;
        }

        if (this._activeIndex !== newIndex) {
            this._activeIndex = newIndex;
            this._startAnimation();
            this.queue_repaint();
        }
    }

    /* ---------- AUTO SCROLL ---------- */

    _startAnimation() {
        if (this._tickId) return;

        this._tickId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            16,
            () => this._onTick()
        );
    }

    _onTick() {
        const diff = this._targetScrollOffset - this._scrollOffset;

        if (Math.abs(diff) < 0.5) {
            this._scrollOffset = this._targetScrollOffset;
            this.queue_repaint();
            this._tickId = 0;
            return GLib.SOURCE_REMOVE;
        }

        this._scrollOffset += diff * 0.06;
        this.queue_repaint();

        return GLib.SOURCE_CONTINUE;
    }

    /* ---------- DRAW ---------- */

    vfunc_repaint() {
        const cr = this.get_context();
        const [width, height] = this.get_surface_size();
        const layout = PangoCairo.create_layout(cr);

        /* ---------- LOADING / EMPTY ---------- */

        if (this._state !== 'lyrics') {
            const text =
                this._state === 'loading'
                    ? 'Fetching lyrics...'
                    : 'No Lyrics Found';

            layout.set_text(text, -1);
            layout.set_alignment(Pango.Alignment.CENTER);

            const font = Pango.FontDescription.from_string(
                'Sans Bold 14'
            );
            layout.set_font_description(font);

            const [, logical] = layout.get_extents();
            const textWidth = logical.width / Pango.SCALE;
            const textHeight = logical.height / Pango.SCALE;

            cr.setSourceRGBA(1, 1, 1, 0.8);
            cr.moveTo(
                (width - textWidth) / 2,
                (height - textHeight) / 2
            );
            PangoCairo.show_layout(cr, layout);

            cr.$dispose();
            return;
        }

        /* ---------- LYRICS DRAW ---------- */

        const PADDING_X = 20;
        const TEXT_WIDTH = width - (PADDING_X * 2);

        layout.set_width(TEXT_WIDTH * Pango.SCALE);
        layout.set_wrap(Pango.WrapMode.WORD_CHAR);
        layout.set_alignment(Pango.Alignment.CENTER);

        this._lineGeometries = [];
        let cursorY = 0;
        const BASE_SPACING = 8;

        this._lyrics.forEach((line, index) => {
            const active = index === this._activeIndex;
            const neighbor = Math.abs(index - this._activeIndex) === 1;

            let fontSize = 11;
            if (active) fontSize = 16;
            else if (neighbor) fontSize = 12;

            const font = Pango.FontDescription.from_string(
                `Sans Bold ${fontSize}`
            );

            layout.set_font_description(font);
            layout.set_text(line.text, -1);

            const [, logical] = layout.get_extents();
            const textHeight = logical.height / Pango.SCALE;

            this._lineGeometries.push({
                y: cursorY,
                height: textHeight,
                text: line.text,
                font,
                active,
                neighbor
            });

            cursorY += textHeight + BASE_SPACING;
        });

        this._totalHeight = Math.max(cursorY - BASE_SPACING, 0);

        if (this._activeIndex >= 0) {
            const geo = this._lineGeometries[this._activeIndex];
            if (geo) {
                const maxScroll = Math.max(0, this._totalHeight - height);

                const TOP_LOCK_PX = geo.height * 2.5;
                const BOTTOM_LOCK_PX = this._totalHeight - (geo.height * 2.5);

                let target;
                if (geo.y < TOP_LOCK_PX) target = 0;
                else if (geo.y > BOTTOM_LOCK_PX) target = maxScroll;
                else target = (geo.y + geo.height / 2) - (height / 2);

                this._targetScrollOffset = Math.min(
                    Math.max(target, 0),
                    maxScroll
                );
            }
        }

        this._lineGeometries.forEach(geo => {
            const y = geo.y - this._scrollOffset;
            if (y + geo.height < -30 || y > height + 30) return;

            layout.set_font_description(geo.font);
            layout.set_text(geo.text, -1);

            if (geo.active)
                cr.setSourceRGBA(1, 1, 1, 1);
            else if (geo.neighbor)
                cr.setSourceRGBA(1, 1, 1, 0.60);
            else
                cr.setSourceRGBA(1, 1, 1, 0.25);

            cr.moveTo(PADDING_X, y);
            PangoCairo.show_layout(cr, layout);
        });

        cr.$dispose();
    }
});
