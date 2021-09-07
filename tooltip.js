/*
 * Copyright 2020 Jason Gray (JasonLG1979)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// No translatable strings in this file.
const { Atk, Clutter, GObject, St } = imports.gi;

const LayoutManager = imports.ui.main.layoutManager;

const TOOL_TIP_HOVER_DELAY = imports.ui.dash.DASH_ITEM_HOVER_TIMEOUT;
const TOOL_TIP_ANIMATION_TIME = imports.ui.boxpointer.POPUP_ANIMATION_TIME;

const DEFAULT_SYNC_CREATE_PROP_FLAGS = GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE;

// The point of this Constraint is to try to keep
// the tooltip in the proper place in relation to the
// indicator no matter what side of the monitor it's on.
const ToolTipConstraint = GObject.registerClass(
    {
        GTypeName: "ToolTipConstraint",
    },
    class ToolTipConstraint extends Clutter.Constraint {
        _init() {
            super._init();
        }

        _getIndicatorPosition(indicator) {
            // Try to detect what side of the monitor the panel is on
            // by checking the indicator's panel box to see if it's
            // vertical or horizontal and then comparing it's x or y
            // to the monitor's x or y. This has been tested to work
            // with horizontal and vertical panels both the default panel
            // and the dash to panel extension. (on a single monitor setup)
            let vertical = false;
            let side = St.Side.TOP;
            let box = indicator;
            // Walk the ancestors of the indicator
            // until we find a BoxLayout so we can tell
            // if the panel is horizontal or vertical.
            while (box) {
                box = box.get_parent();
                if (box instanceof St.BoxLayout) {
                    vertical = box.get_vertical();
                    break;
                }
            }
            // Get the monitor the the indicator is on and try to tell
            // which side it's on.
            let monitor = LayoutManager.findMonitorForActor(indicator);
            let [x, y] = indicator.get_transformed_position();
            if (vertical) {
                side = Math.floor(x) == monitor.x ? St.Side.LEFT : St.Side.RIGHT;
            } else {
                side = Math.floor(y) == monitor.y ? St.Side.TOP : St.Side.BOTTOM;
            }
            return [monitor, side, x, y];
        }

        vfunc_update_allocation(actor, box) {
            if (!actor.hasOwnProperty("indicator") || !actor.indicator) {
                return;
            }
            let thisWidth = box.x2 - box.x1;
            let thisHeight = box.y2 - box.y1;
            let indAllocation = actor.indicator.get_allocation_box();
            let indWidth = indAllocation.x2 - indAllocation.x1;
            let indHeight = indAllocation.y2 - indAllocation.y1;
            let [monitor, side, x, y] = this._getIndicatorPosition(actor.indicator);
            let tooltipTop = monitor.y;
            let tooltipLeft = monitor.x;
            switch (side) {
                // Positioning logic inspired by the Cinnamon Desktop's PanelItemTooltip.
                // Try to center the tooltip with the indicator but never go off screen
                // or cover the indicator or panel. And set the animation pivot point
                // so that the animation appears to come from/go to the indicator.
                case St.Side.BOTTOM:
                    tooltipTop = monitor.y + monitor.height - thisHeight - indHeight;
                    tooltipLeft = x - (thisWidth - indWidth) / 2;
                    tooltipLeft = Math.max(tooltipLeft, monitor.x);
                    tooltipLeft = Math.min(tooltipLeft, monitor.x + monitor.width - thisWidth);
                    break;
                case St.Side.TOP:
                    tooltipTop = monitor.y + indHeight;
                    tooltipLeft = x - (thisWidth - indWidth) / 2;
                    tooltipLeft = Math.max(tooltipLeft, monitor.x);
                    tooltipLeft = Math.min(tooltipLeft, monitor.x + monitor.width - thisWidth);
                    break;
                case St.Side.LEFT:
                    tooltipTop = y - (thisHeight - indHeight) / 2;
                    tooltipTop = Math.max(tooltipTop, monitor.y);
                    tooltipTop = Math.min(tooltipTop, monitor.y + monitor.height - thisHeight);
                    tooltipLeft = monitor.x + indWidth;
                    break;
                case St.Side.RIGHT:
                    tooltipTop = y - (thisHeight - indHeight) / 2;
                    tooltipTop = Math.max(tooltipTop, monitor.y);
                    tooltipTop = Math.min(tooltipTop, monitor.y + monitor.height - thisHeight);
                    tooltipLeft = monitor.x + monitor.width - thisWidth - indWidth;
                    break;
                default:
                    break;
            }

            tooltipTop = Math.round(tooltipTop);
            tooltipLeft = Math.round(tooltipLeft);

            let pivot_y = Math.max(0.0, Math.min((y + indHeight / 2 - tooltipTop) / thisHeight, 1.0));
            let pivot_x = Math.max(0.0, Math.min((x + indWidth / 2 - tooltipLeft) / thisWidth, 1.0));

            actor.set_pivot_point(pivot_x, pivot_y);
            box.set_origin(tooltipLeft, tooltipTop);
            super.vfunc_update_allocation(actor, box);
        }
    }
);

// This is an abstract base class to create Indicator tooltips.
// It is meant to make it easy for others to extend and use along
// with ToolTipConstraint (which should really never need to be touched)
// to add tooltips to their Indicators if they like.
var ToolTipBase = GObject.registerClass(
    {
        GTypeName: "ToolTipBase",
        GTypeFlags: GObject.TypeFlags.ABSTRACT,
        Properties: {
            text: GObject.ParamSpec.string(
                "text",
                "text-prop",
                "the tooltip's text",
                GObject.ParamFlags.READWRITE,
                ""
            ),
            "icon-name": GObject.ParamSpec.string(
                "icon-name",
                "icon-name-prop",
                "the tooltip's icon-name",
                GObject.ParamFlags.READWRITE,
                ""
            ),
            "label-style-class": GObject.ParamSpec.string(
                "label-style-class",
                "label-style-class-prop",
                "the style class of the tooltip's label",
                GObject.ParamFlags.READWRITE,
                ""
            ),
            "icon-style-class": GObject.ParamSpec.string(
                "icon-style-class",
                "text-style-class-prop",
                "the style class of the tooltip's icon",
                GObject.ParamFlags.READWRITE,
                ""
            ),
            "show-icon": GObject.ParamSpec.boolean(
                "show-icon",
                "show-icon-prop",
                "if the tooltip's icon should be shown",
                GObject.ParamFlags.READWRITE,
                false
            ),
        },
    },
    class ToolTipBase extends St.Widget {
        _init(
            indicator,
            wantsIcon = false,
            text = "",
            iconName = "",
            toolTipStyleClass = "",
            iconStyleClass = "",
            labelStyleClass = ""
        ) {
            super._init({
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                accessible_role: Atk.Role.TOOL_TIP,
                constraints: new ToolTipConstraint(),
                layout_manager: new Clutter.BoxLayout(),
                style_class: toolTipStyleClass,
                visible: false,
            });

            this._text = text;
            this._icon_name = iconName;
            this._label_style_class = labelStyleClass;
            this._icon_style_class = iconStyleClass;
            this._show_icon = wantsIcon;

            this._showing = false;

            this.indicator = indicator;

            this._signals = [];

            this._icon = new St.Icon({
                icon_size: 16,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.START,
            });

            this.add_child(this._icon);

            this._label = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.START,
            });

            this.add_child(this._label);

            this.label_actor = this._label;

            this.bind_property("text", this._label, "text", DEFAULT_SYNC_CREATE_PROP_FLAGS);

            this.bind_property("icon-name", this._icon, "icon-name", DEFAULT_SYNC_CREATE_PROP_FLAGS);

            this.bind_property(
                "label-style-class",
                this._label,
                "style-class",
                DEFAULT_SYNC_CREATE_PROP_FLAGS
            );

            this.bind_property("icon-style-class", this._icon, "style-class", DEFAULT_SYNC_CREATE_PROP_FLAGS);

            this.bind_property("show-icon", this._icon, "visible", DEFAULT_SYNC_CREATE_PROP_FLAGS);

            this.pushSignal(this, "notify::allocation", () => {
                this._label.clutter_text.queue_relayout();
            });

            // All handler functions can be overridden, just remember to chain up if you want
            // to maintain default behaviour.
            this.pushSignal(this.indicator, "notify::visible", this.onIndicatorVisibleChanged.bind(this));

            this.pushSignal(this.indicator, "notify::hover", this.onIndicatorHover.bind(this));

            this.pushSignal(
                this.indicator.menu,
                "open-state-changed",
                this.onIndicatorMenuOpenStateChanged.bind(this)
            );

            this.pushSignal(this.indicator, "destroy", this.onIndicatorDestroy.bind(this));

            LayoutManager.addTopChrome(this, { affectsInputRegion: false });
        }

        get text() {
            return this._text || "";
        }

        set text(text = "") {
            if (this._text !== text) {
                this._text = text;
                this.notify("text");
            }
        }

        get icon_name() {
            return this._icon_name || "";
        }

        set icon_name(icon_name = "") {
            if (this._icon_name !== icon_name) {
                this._icon_name = icon_name;
                this.notify("icon-name");
            }
        }

        get label_style_class() {
            return this._label_style_class || "";
        }

        set label_style_class(label_style_class = "") {
            if (this._label_style_class !== label_style_class) {
                this._label_style_class = label_style_class;
                this.notify("label-style-class");
            }
        }

        get icon_style_class() {
            return this._icon_style_class || "";
        }

        set icon_style_class(icon_style_class = "") {
            if (this._icon_style_class !== icon_style_class) {
                this._icon_style_class = icon_style_class;
                this.notify("icon-style-class");
            }
        }

        get show_icon() {
            return this._show_icon || false;
        }

        set show_icon(show_icon = false) {
            if (this._show_icon !== show_icon) {
                this._show_icon = show_icon;
                this.notify("show-icon");
            }
        }

        get indicatorMenuIsOpen() {
            // Not all indicators have real menus. Indicators without menus still have
            // dummy menus though that lack isOpen.
            return this.indicator.menu.hasOwnProperty("isOpen") && this.indicator.menu.isOpen;
        }

        pushSignal(obj, signalName, callback) {
            // This is a convenience function for connecting signals.
            // Use this to make sure all signal are disconnected
            // when the indicator is destroyed.
            // In theory Objects should not emit signals
            // after destruction, but that assumption is often
            // times false with St widgets and Clutter.
            let signalId = obj.connect(signalName, callback);
            this._signals.push({
                obj: obj,
                signalId: signalId,
            });
            return signalId;
        }

        onIndicatorVisibleChanged(indicator, pspec) {
            if (!this.indicator.visible) {
                this.unAnimatedHide();
            }
        }

        onIndicatorHover(indicator, pspec) {
            if (this.indicator.hover && this.text && !this.indicatorMenuIsOpen && !this.visible) {
                this.animatedShow();
            } else {
                this.animatedHide();
            }
        }

        onIndicatorMenuOpenStateChanged(indicatorMenu, open) {
            if (open) {
                this.unAnimatedHide();
            }
        }

        onIndicatorDestroy(indicator) {
            // All cleanup happens here.
            // The tooltip is destroyed with the indicator.
            // If you override this function you MUST chain up otherwise
            // clean up will not happen.
            this.remove_all_transitions();
            this._signals.forEach((signal) => signal.obj.disconnect(signal.signalId));
            this.indicator = null;
            this._signals = null;
            this._text = null;
            this._icon_name = null;
            this._label_style_class = null;
            this._icon_style_class = null;
            this._show_icon = null;
            this.destroy();
        }

        update(text = "", iconName = "") {
            let wasShowing = this._showing;
            this.remove_all_transitions();
            this.text = text;
            this.icon_name = iconName;
            if (wasShowing) {
                this.unAnimatedShow();
            } else {
                this.unAnimatedHide();
            }
        }

        updateText(text = "") {
            let wasShowing = this._showing;
            this.remove_all_transitions();
            this.text = text;
            if (wasShowing) {
                this.unAnimatedShow();
            } else {
                this.unAnimatedHide();
            }
        }

        updateIconName(iconName = "") {
            let wasShowing = this._showing;
            this.remove_all_transitions();
            this.icon_name = iconName;
            if (wasShowing) {
                this.unAnimatedShow();
            } else {
                this.unAnimatedHide();
            }
        }

        animatedUpdate(text = "", iconName = "") {
            if (this.visible && (this.text !== text || this.icon_name !== iconName)) {
                this.animatedHide(() => {
                    this.icon_name = iconName;
                    this.text = text;
                    this.animatedShow();
                });
            } else {
                this.icon_name = iconName;
                this.text = text;
            }
        }

        animatedUpdateText(text = "") {
            if (this.visible && this.text !== text) {
                this.animatedHide(() => {
                    this.text = text;
                    this.animatedShow();
                });
            } else {
                this.text = text;
            }
        }

        animatedUpdateIconName(iconName = "") {
            if (this.visible && this.icon_name !== iconName) {
                this.animatedHide(() => {
                    this.icon_name = iconName;
                    this.animatedShow();
                });
            } else {
                this.icon_name = iconName;
            }
        }

        updateAfterHide(text = "", iconName = "") {
            this.animatedHide(() => {
                this.icon_name = iconName;
                this.text = text;
            });
        }

        updateThenShow(text = "", iconName = "") {
            this.icon_name = iconName;
            this.text = text;
            this.animateShow();
        }

        // Below are variants of show and hide.
        // It is not advisable to call the default
        // show and hide functions if you ever
        // plan on animating anything.
        // Doing so can leave the tooltip
        // in an undefined state of scale
        // and/or opacity.
        animatedShow() {
            this.remove_all_transitions();
            this.show();
            this._showing = true;
            this.opacity = 0;
            this.scale_x = 0.0;
            this.scale_y = 0.0;
            this.ease({
                opacity: 255,
                scale_x: 1.0,
                scale_y: 1.0,
                duration: TOOL_TIP_ANIMATION_TIME,
                // Not only does this delay stop the tooltip
                // from popping up when the indicator is 'glanced over'
                // on the way to other UI elements,
                // it also prevents the tooltip
                // from strobing in the event of rapid updates,
                // which is potentially an accessibility issue.
                delay: TOOL_TIP_HOVER_DELAY,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onStopped: (isFinished) => {
                    if (!isFinished) {
                        this.hide();
                        this._showing = false;
                    }
                },
            });
        }

        animatedHide(onComplete = null) {
            this.remove_all_transitions();
            this._showing = false;
            this.ease({
                opacity: 0,
                scale_x: 0.0,
                scale_y: 0.0,
                duration: TOOL_TIP_ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onStopped: (isFinished) => {
                    if (isFinished) {
                        this.hide();
                    }
                    if (onComplete) {
                        onComplete();
                    }
                },
            });
        }

        unAnimatedShow() {
            this.remove_all_transitions();
            this._showing = true;
            this.scale_x = 1.0;
            this.scale_y = 1.0;
            this.opacity = 255;
            this.show();
        }

        unAnimatedHide() {
            this.remove_all_transitions();
            this._showing = false;
            this.hide();
            this.scale_x = 1.0;
            this.scale_y = 1.0;
            this.opacity = 255;
        }
    }
);
