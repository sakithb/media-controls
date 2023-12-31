import GObject from "gi://GObject?version=2.0";
import Clutter from "gi://Clutter?version=13";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import St from "gi://St?version=13";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import MediaControls from "../extension.js";
import PlayerProxy from "./PlayerProxy.js";
import ScrollingLabel from "./ScrollingLabel.js";
import MenuSlider from "./MenuSlider.js";
import { LabelTypes, MouseActions, PanelElements } from "../types/enums/common.js";
import { LoopStatus, PlaybackStatus, WidgetFlags, ControlIconOptions } from "../types/enums/panel.js";
import { debugLog } from "../utils/common.js";
import { getAppByIdAndEntry, getImage } from "../utils/panel.js";
import { KeysOf } from "../types/common.js";
import { PlayerProxyProperties } from "../types/dbus.js";

/**
 * TODO: Make slider a animation
 * TODO: Handle players not supporting position
 * TODO: Pin player feature
 * TODO: Look into hover transitions
 */

class PanelButton extends PanelMenu.Button {
    private playerProxy: PlayerProxy;
    private extension: MediaControls;

    private buttonIcon: St.Icon;
    private buttonLabel: InstanceType<typeof ScrollingLabel>;
    private buttonControls: St.BoxLayout;
    private buttonBox: St.BoxLayout;

    private menuBox: PopupMenu.PopupBaseMenuItem;
    private menuPlayers: St.BoxLayout;
    private menuImage: St.Icon;
    private menuLabel: St.BoxLayout;
    private menuSlider: InstanceType<typeof MenuSlider>;
    private menuControls: St.BoxLayout;

    private menuPlayersTextBox: St.BoxLayout;
    private menuPlayersTextBoxIcon: St.Icon;
    private menuPlayersTextBoxLabel: St.Label;
    private menuPlayersIcons: St.BoxLayout;

    private menuLabelTitle: InstanceType<typeof ScrollingLabel>;
    private menuLabelArtist: InstanceType<typeof ScrollingLabel>;

    private doubleTapSourceId: number;
    private changeListenerIds: Map<KeysOf<PlayerProxyProperties>, number>;

    constructor(playerProxy: PlayerProxy, extension: MediaControls) {
        super(0.5, "Media Controls", false);

        this.playerProxy = playerProxy;
        this.extension = extension;
        this.changeListenerIds = new Map();

        this.updateWidgets(WidgetFlags.ALL);
        this.addProxyListeners();
        this.initActions();

        this.menu.box.add_style_class_name("popup-menu-container");

        this.connect("destroy", () => {
            this.removeProxyListeners();
        });
    }

    public updateProxy(playerProxy: PlayerProxy) {
        if (this.isSamePlayer(playerProxy) === false) {
            debugLog("Updated player proxy");
            this.playerProxy = playerProxy;
            this.updateWidgets(WidgetFlags.ALL);
            this.addProxyListeners();
        }
    }

    public isSamePlayer(playerProxy: PlayerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    public async updateWidgets(flags: WidgetFlags) {
        if (this.buttonBox == null) {
            this.buttonBox = new St.BoxLayout({
                styleClass: "panel-button-box",
            });
        } else if (flags & WidgetFlags.PANEL_NO_REPLACE) {
            this.buttonBox.remove_all_children();
        }

        if (this.menuBox == null) {
            this.menuBox = new PopupMenu.PopupBaseMenuItem({
                style_class: "no-padding popup-menu-box",
                activate: false,
            });

            this.menuBox.set_vertical(true);
            this.menuBox.remove_style_class_name("popup-menu-item");
            this.menuBox.remove_all_children();
        }

        for (let i = 0; i < this.extension.elementsOrder.length; i++) {
            const element = PanelElements[this.extension.elementsOrder[i]];

            if (
                element === PanelElements.ICON &&
                (flags & WidgetFlags.PANEL_ICON || flags & WidgetFlags.PANEL_NO_REPLACE)
            ) {
                if (this.extension.showPlayerIcon) {
                    this.addButtonIcon(i);
                } else {
                    this.buttonBox.remove_child(this.buttonIcon);
                    this.buttonIcon = null;
                }
            }

            if (
                element === PanelElements.LABEL &&
                (flags & WidgetFlags.PANEL_LABEL || flags & WidgetFlags.PANEL_NO_REPLACE)
            ) {
                if (this.extension.showLabel) {
                    this.addButtonLabel(i);
                } else {
                    this.buttonBox.remove_child(this.buttonLabel);
                    this.buttonLabel = null;
                }
            }

            if (
                element === PanelElements.CONTROLS &&
                (flags & WidgetFlags.PANEL_CONTROLS || flags & WidgetFlags.PANEL_NO_REPLACE)
            ) {
                if (this.extension.showControlIcons) {
                    this.addButtonControls(i, flags);
                } else {
                    this.buttonBox.remove_child(this.buttonControls);
                    this.buttonControls = null;
                }
            }
        }

        if (flags & WidgetFlags.MENU_PLAYERS) {
            this.addMenuPlayers();
        }

        if (flags & WidgetFlags.MENU_IMAGE) {
            await this.addMenuImage();
        }

        if (flags & WidgetFlags.MENU_LABELS) {
            this.addMenuLabels();
        }

        if (flags & WidgetFlags.MENU_SLIDER) {
            await this.addMenuSlider();
        }

        if (flags & WidgetFlags.MENU_CONTROLS) {
            this.addMenuControls(flags);
        }

        if (this.buttonBox.get_parent() == null) {
            this.add_child(this.buttonBox);
        }

        if (this.menuBox.get_parent() == null) {
            this.menu.addMenuItem(this.menuBox);
        }
    }

    private addMenuPlayers() {
        if (this.menuPlayers == null) {
            this.menuPlayers = new St.BoxLayout({
                vertical: true,
            });
        }

        if (this.menuPlayersTextBox == null) {
            this.menuPlayersTextBox = new St.BoxLayout();
        }

        if (this.menuPlayersTextBoxIcon == null) {
            this.menuPlayersTextBoxIcon = new St.Icon({
                styleClass: "popup-menu-icon popup-menu-player-label",
                xAlign: Clutter.ActorAlign.END,
                xExpand: true,
            });
        }

        if (this.menuPlayersTextBoxLabel == null) {
            this.menuPlayersTextBoxLabel = new St.Label({
                xAlign: Clutter.ActorAlign.START,
                xExpand: true,
            });
        }

        const players = this.extension.getPlayers();

        if (players.length > 1 && this.menuPlayersIcons == null) {
            this.menuPlayersIcons = new St.BoxLayout({
                styleClass: "popup-menu-player-icons",
            });
        } else if (players.length === 1 && this.menuPlayersIcons != null) {
            this.menuPlayers.remove_child(this.menuPlayersIcons);
        } else {
            this.menuPlayersIcons?.remove_all_children();
        }

        for (const player of players) {
            const app = getAppByIdAndEntry(player.identity, player.desktopEntry);
            const isSamePlayer = this.isSamePlayer(player);

            if (isSamePlayer) {
                this.menuPlayersTextBoxLabel.text = app.get_name();

                if (players.length > 1) {
                    this.menuPlayersTextBoxIcon.gicon = null;
                } else {
                    this.menuPlayersTextBoxIcon.gicon = app.get_icon();
                }
            }

            if (players.length > 1) {
                const icon = new St.Icon({
                    styleClass: "popup-menu-icon popup-menu-player-icons-icon",
                    gicon: app.get_icon(),
                    trackHover: true,
                    reactive: true,
                    xAlign: Clutter.ActorAlign.FILL,
                    xExpand: true,
                });

                if (isSamePlayer) {
                    icon.add_style_class_name("popup-menu-player-icons-icon-active");
                } else {
                    const tapAction = new Clutter.TapAction();
                    tapAction.connect("tap", this.updateProxy.bind(this, player));

                    icon.add_action(tapAction);
                }

                this.menuPlayersIcons.add_child(icon);
            }
        }

        if (this.menuPlayersTextBoxIcon.get_parent() == null) {
            this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxIcon, 0);
        }

        if (this.menuPlayersTextBoxLabel.get_parent() == null) {
            this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxLabel, 1);
        }

        if (this.menuPlayersTextBox.get_parent() == null) {
            this.menuPlayers.insert_child_at_index(this.menuPlayersTextBox, 0);
        }

        if (this.menuPlayersIcons && this.menuPlayersIcons.get_parent() == null) {
            this.menuPlayers.insert_child_at_index(this.menuPlayersIcons, 1);
        }

        if (this.menuPlayers.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuPlayers, 0);
        }

        debugLog("Added menu players");
    }

    private async addMenuImage() {
        if (this.menuImage == null) {
            this.menuImage = new St.Icon({
                xExpand: true,
                yExpand: true,
            });

            const signalId = this.menuBox.connect("notify::width", () => {
                if (this.menuBox.width > 0) {
                    this.menuImage.set_icon_size(this.menuBox.width);
                    this.menuBox.disconnect(signalId);
                }
            });
        }

        const imgUrl = this.playerProxy.metadata["mpris:artUrl"];
        const bytes = await getImage(imgUrl);

        if (bytes == null) {
            this.menuImage.gicon = Gio.Icon.new_for_string("audio-x-generic-symbolic");
        } else {
            this.menuImage.gicon = Gio.BytesIcon.new(bytes);
        }

        if (this.menuImage.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuImage, 1);
        }

        debugLog("Added menu image");
    }

    private addMenuLabels() {
        if (this.menuLabel == null) {
            this.menuLabel = new St.BoxLayout({
                vertical: true,
            });
        }

        if (this.menuLabelTitle != null) {
            this.menuLabel.remove_child(this.menuLabelTitle);
        }

        if (this.menuLabelArtist != null) {
            this.menuLabel.remove_child(this.menuLabelArtist);
        }

        this.menuLabelTitle = new ScrollingLabel(
            this.playerProxy.metadata["xesam:title"],
            this.extension.labelWidth,
            true,
            this.extension.scrollLabels,
            this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
        );

        this.menuLabelTitle.label.add_style_class_name("popup-menu-label-title");
        this.menuLabelTitle.label.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabelTitle.label.xExpand = true;

        this.menuLabelArtist = new ScrollingLabel(
            this.playerProxy.metadata["xesam:artist"]?.join(", ") ?? "Unknown artist",
            this.extension.labelWidth,
            true,
            this.extension.scrollLabels,
            this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
        );

        // this.menuLabelArtist.label.add_style_class_name("popup-menu-label-artist");
        this.menuLabelArtist.label.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabelArtist.label.xExpand = true;

        this.menuLabel.add_child(this.menuLabelTitle);
        this.menuLabel.add_child(this.menuLabelArtist);

        if (this.menuLabel.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuLabel, 2);
        }

        debugLog("Added menu labels");
    }

    private async addMenuSlider() {
        const position = await this.playerProxy.position;
        const length = this.playerProxy.metadata["mpris:length"];

        if (this.menuSlider == null) {
            this.menuSlider = new MenuSlider(
                position,
                length,
                this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
            );

            this.menuSlider.connect("seeked", (_, position) => {
                this.playerProxy.setPosition(this.playerProxy.metadata["mpris:trackid"], position);
            });
        }

        this.menuSlider.setPosition(position);
        this.menuSlider.setLength(length);

        if (this.menuSlider.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuSlider, 3);
        }

        debugLog("Added menu slider");
    }

    private addMenuControls(flags: WidgetFlags) {
        if (this.menuControls == null) {
            this.menuControls = new St.BoxLayout();
        }

        if (flags & WidgetFlags.MENU_CONTROLS_LOOP) {
            this.addMenuControlIcon(
                this.playerProxy.loopStatus === LoopStatus.NONE
                    ? ControlIconOptions.LOOP_NONE
                    : this.playerProxy.loopStatus === LoopStatus.TRACK
                      ? ControlIconOptions.LOOP_TRACK
                      : ControlIconOptions.LOOP_PLAYLIST,
                this.playerProxy.loopStatus != null,
                this.playerProxy.toggleLoop.bind(this.playerProxy),
            );
        }

        if (flags & WidgetFlags.MENU_CONTROLS_PREV) {
            this.addMenuControlIcon(
                ControlIconOptions.PREVIOUS,
                this.playerProxy.canGoPrevious && this.playerProxy.canControl,
                this.playerProxy.previous.bind(this.playerProxy),
            );
        }

        if (flags & WidgetFlags.MENU_CONTROLS_PLAYPAUSE) {
            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.addMenuControlIcon(
                    ControlIconOptions.PLAY,
                    this.playerProxy.canPlay && this.playerProxy.canControl,
                    this.playerProxy.play.bind(this.playerProxy),
                );
            } else {
                this.addMenuControlIcon(
                    ControlIconOptions.PAUSE,
                    this.playerProxy.canPause && this.playerProxy.canControl,
                    this.playerProxy.pause.bind(this.playerProxy),
                );
            }
        }

        if (flags & WidgetFlags.MENU_CONTROLS_NEXT) {
            this.addMenuControlIcon(
                ControlIconOptions.NEXT,
                this.playerProxy.canGoNext && this.playerProxy.canControl,
                this.playerProxy.next.bind(this.playerProxy),
            );
        }

        if (flags & WidgetFlags.MENU_CONTROLS_SHUFFLE) {
            this.addMenuControlIcon(
                this.playerProxy.shuffle ? ControlIconOptions.SHUFFLE_OFF : ControlIconOptions.SHUFFLE_ON,
                this.playerProxy.shuffle != null,
                this.playerProxy.toggleShuffle.bind(this.playerProxy),
            );
        }

        if (this.menuControls.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuControls, 4);
        }

        debugLog("Added menu controls");
    }

    private addMenuControlIcon(options: ControlIconOptions, reactive: boolean, onClick: () => void) {
        const icon = new St.Icon({
            name: options.name,
            iconName: options.iconName,
            styleClass: "popup-menu-icon popup-menu-control-icon",
            trackHover: reactive,
            opacity: reactive ? 255 : 180,
            reactive,
            ...options.menuProps,
        });

        const tapAction = new Clutter.TapAction();
        tapAction.connect("tap", onClick);
        icon.add_action(tapAction);

        const oldIcon = this.menuControls.find_child_by_name(options.name);

        if (oldIcon?.get_parent() === this.menuControls) {
            this.menuControls.replace_child(oldIcon, icon);
        } else {
            this.menuControls.add_child(icon);
        }
    }

    private addButtonIcon(index: number) {
        const app = getAppByIdAndEntry(this.playerProxy.identity, this.playerProxy.desktopEntry);

        if (app == null) {
            return;
        }

        const coloredClass = this.extension.coloredPlayerIcon ? "colored-icon" : "symbolic-icon";

        const icon = new St.Icon({
            gicon: app.get_icon(),
            styleClass: `system-status-icon no-margin ${coloredClass}`,
        });

        if (this.buttonIcon?.get_parent() === this.buttonBox) {
            this.buttonBox.replace_child(this.buttonIcon, icon);
        } else {
            this.buttonBox.insert_child_at_index(icon, index);
        }

        this.buttonIcon = icon;

        debugLog("Added icon");
    }

    private addButtonLabel(index: number) {
        const label = new ScrollingLabel(
            this.getLabelText(),
            this.extension.labelWidth,
            this.extension.isFixedLabelWidth,
            this.extension.scrollLabels,
            this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
        );

        if (this.buttonLabel?.get_parent() === this.buttonBox) {
            this.buttonBox.replace_child(this.buttonLabel, label);
        } else {
            this.buttonBox.insert_child_at_index(label, index);
        }

        this.buttonLabel = label;

        debugLog("Added label");
    }

    private addButtonControls(index: number, flags: WidgetFlags) {
        if (this.buttonControls == null) {
            this.buttonControls = new St.BoxLayout({
                name: "controls-box",
                styleClass: "panel-controls-box",
            });
        }

        if (flags & WidgetFlags.PANEL_CONTROLS_SEEK_BACKWARD) {
            if (this.extension.showControlIconsSeekBackward) {
                this.addButtonControlIcon(
                    ControlIconOptions.SEEK_BACKWARD,
                    this.playerProxy.seek.bind(this.playerProxy, -5000000),
                    this.playerProxy.canSeek && this.playerProxy.canControl,
                );
            } else {
                this.removeButtonControlIcon(ControlIconOptions.SEEK_BACKWARD);
            }
        }

        if (flags & WidgetFlags.PANEL_CONTROLS_PREVIOUS) {
            if (this.extension.showControlIconsPrevious) {
                this.addButtonControlIcon(
                    ControlIconOptions.PREVIOUS,
                    this.playerProxy.previous.bind(this.playerProxy),
                    this.playerProxy.canGoPrevious && this.playerProxy.canControl,
                );
            } else {
                this.removeButtonControlIcon(ControlIconOptions.PREVIOUS);
            }
        }

        if (flags & WidgetFlags.PANEL_CONTROLS_PLAYPAUSE) {
            if (this.extension.showControlIconsPlay) {
                if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                    this.addButtonControlIcon(
                        ControlIconOptions.PLAY,
                        this.playerProxy.play.bind(this.playerProxy),
                        this.playerProxy.canPlay && this.playerProxy.canControl,
                    );
                } else {
                    this.addButtonControlIcon(
                        ControlIconOptions.PAUSE,
                        this.playerProxy.pause.bind(this.playerProxy),
                        this.playerProxy.canPause && this.playerProxy.canControl,
                    );
                }
            } else {
                this.removeButtonControlIcon(ControlIconOptions.PLAY);
            }
        }

        if (flags & WidgetFlags.PANEL_CONTROLS_NEXT) {
            if (this.extension.showControlIconsNext) {
                this.addButtonControlIcon(
                    ControlIconOptions.NEXT,
                    this.playerProxy.next.bind(this.playerProxy),
                    this.playerProxy.canGoNext && this.playerProxy.canControl,
                );
            } else {
                this.removeButtonControlIcon(ControlIconOptions.NEXT);
            }
        }

        if (flags & WidgetFlags.PANEL_CONTROLS_SEEK_FORWARD) {
            if (this.extension.showControlIconsSeekForward) {
                this.addButtonControlIcon(
                    ControlIconOptions.SEEK_FORWARD,
                    this.playerProxy.seek.bind(this.playerProxy, 5000000),
                    this.playerProxy.canSeek && this.playerProxy.canControl,
                );
            } else {
                this.removeButtonControlIcon(ControlIconOptions.SEEK_FORWARD);
            }
        }

        if (this.buttonControls.get_parent() == null) {
            this.buttonBox.insert_child_at_index(this.buttonControls, index);
        }

        debugLog("Added controls");
    }

    private addButtonControlIcon(options: ControlIconOptions, onClick: () => void, reactive: boolean) {
        const icon = new St.Icon({
            name: options.name,
            iconName: options.iconName,
            styleClass: "system-status-icon no-margin",
            opacity: reactive ? 255 : 180,
            reactive,
        });

        const tapAction = new Clutter.TapAction();
        tapAction.connect("tap", onClick);

        icon.add_action(tapAction);

        const oldIcon = this.buttonControls.find_child_by_name(options.name);

        if (oldIcon != null) {
            this.buttonControls.replace_child(oldIcon, icon);
        } else {
            this.buttonControls.insert_child_at_index(icon, options.panelProps.index);
        }
    }

    private removeButtonControlIcon(options: ControlIconOptions) {
        const icon = this.buttonControls.find_child_by_name(options.name);

        if (icon != null) {
            this.buttonControls.remove_child(icon);
        }
    }

    private getLabelText() {
        const labelTextElements = [];

        for (const labelElement of this.extension.labelsOrder) {
            if (LabelTypes[labelElement] === LabelTypes.TITLE) {
                labelTextElements.push(this.playerProxy.metadata["xesam:title"]);
            } else if (LabelTypes[labelElement] === LabelTypes.ARTIST) {
                labelTextElements.push(this.playerProxy.metadata["xesam:artist"]?.join(", ") ?? "Unknown artist");
            } else if (LabelTypes[labelElement] === LabelTypes.ALBUM) {
                labelTextElements.push(this.playerProxy.metadata["xesam:album"]);
            } else if (LabelTypes[labelElement] === LabelTypes.DISC_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:discNumber"]);
            } else if (LabelTypes[labelElement] === LabelTypes.TRACK_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:trackNumber"]);
            } else {
                labelTextElements.push(labelElement);
            }
        }

        return labelTextElements.join(" ");
    }

    private addProxyListeners() {
        this.removeProxyListeners();

        this.addProxyListener("Metadata", () => {
            this.updateWidgets(
                WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_IMAGE | WidgetFlags.MENU_LABELS | WidgetFlags.MENU_SLIDER,
            );
        });

        this.addProxyListener("PlaybackStatus", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_PLAYPAUSE | WidgetFlags.MENU_CONTROLS_PLAYPAUSE);

            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.buttonLabel.pauseScrolling();
                this.menuLabelTitle.pauseScrolling();
                this.menuLabelArtist.pauseScrolling();
                this.menuSlider.pauseTransition();
            } else {
                this.buttonLabel.resumeScrolling();
                this.menuLabelTitle.resumeScrolling();
                this.menuLabelArtist.resumeScrolling();
                this.menuSlider.resumeTransition();
            }
        });

        this.addProxyListener("CanPlay", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_PLAYPAUSE | WidgetFlags.MENU_CONTROLS_PLAYPAUSE);
        });

        this.addProxyListener("CanPause", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_PLAYPAUSE | WidgetFlags.MENU_CONTROLS_PLAYPAUSE);
        });

        this.addProxyListener("CanSeek", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_SEEK_FORWARD | WidgetFlags.PANEL_CONTROLS_SEEK_BACKWARD);
        });

        this.addProxyListener("CanGoNext", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_NEXT | WidgetFlags.MENU_CONTROLS_NEXT);
        });

        this.addProxyListener("CanGoPrevious", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_PREVIOUS | WidgetFlags.MENU_CONTROLS_PREV);
        });

        this.addProxyListener("CanControl", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS | WidgetFlags.MENU_CONTROLS);
        });

        this.addProxyListener("Shuffle", () => {
            this.updateWidgets(WidgetFlags.MENU_CONTROLS_SHUFFLE);
        });

        this.addProxyListener("LoopStatus", () => {
            this.updateWidgets(WidgetFlags.MENU_CONTROLS_LOOP);
        });

        this.playerProxy.onSeeked((position) => {
            this.menuSlider.setPosition(position);
        });
    }

    private removeProxyListeners() {
        for (const [property, id] of this.changeListenerIds.entries()) {
            this.playerProxy.removeListener(property, id);
        }
    }

    private addProxyListener(property: KeysOf<PlayerProxyProperties>, callback: () => void) {
        const id = this.playerProxy.onChanged(property, callback);
        this.changeListenerIds.set(property, id);
    }

    private initActions() {
        const tapAction = new Clutter.TapAction();
        const swipeAction = new Clutter.SwipeAction();

        tapAction.connect("tap", () => {
            const device = tapAction.get_device(tapAction.nTouchPoints - 1);
            const event = tapAction.get_last_event(tapAction.nTouchPoints - 1);
            const button = event.get_button();

            if (this.doubleTapSourceId != null) {
                GLib.source_remove(this.doubleTapSourceId);
                this.doubleTapSourceId = null;

                this.doMouseAction(this.extension.mouseActionDouble);
                return;
            }

            this.doubleTapSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this.doubleTapSourceId = null;

                if (device.deviceType !== Clutter.InputDeviceType.POINTER_DEVICE) {
                    this.doMouseAction(this.extension.mouseActionLeft);
                    return;
                }

                if (button === Clutter.BUTTON_PRIMARY) {
                    this.doMouseAction(this.extension.mouseActionLeft);
                }

                if (button === Clutter.BUTTON_MIDDLE) {
                    this.doMouseAction(this.extension.mouseActionMiddle);
                }

                if (button === Clutter.BUTTON_SECONDARY) {
                    this.doMouseAction(this.extension.mouseActionRight);
                }

                return GLib.SOURCE_REMOVE;
            });
        });

        swipeAction.connect("swipe", (_, __, direction) => {
            if (direction === Clutter.SwipeDirection.RIGHT) {
                this.doMouseAction(this.extension.mouseActionScrollUp);
            }

            if (direction === Clutter.SwipeDirection.LEFT) {
                this.doMouseAction(this.extension.mouseActionScrollDown);
            }
        });

        this.connect("scroll-event", (_: Clutter.Actor, event: Clutter.Event) => {
            const direction = event.get_scroll_direction();

            if (direction === Clutter.ScrollDirection.UP) {
                this.doMouseAction(this.extension.mouseActionScrollUp);
            }

            if (direction === Clutter.ScrollDirection.DOWN) {
                this.doMouseAction(this.extension.mouseActionScrollDown);
            }
        });

        // Tap action is added last to prevent it from blocking button press events
        this.add_action(swipeAction);
        this.add_action(tapAction);
    }

    private doMouseAction(action: MouseActions) {
        switch (action) {
            case MouseActions.PLAY_PAUSE: {
                this.playerProxy.playPause();
                break;
            }
            case MouseActions.PLAY: {
                this.playerProxy.play();
                break;
            }
            case MouseActions.PAUSE: {
                this.playerProxy.pause();
                break;
            }
            case MouseActions.NEXT_TRACK: {
                this.playerProxy.next();
                break;
            }
            case MouseActions.PREVIOUS_TRACK: {
                this.playerProxy.previous();
                break;
            }
            case MouseActions.VOLUME_UP: {
                this.playerProxy.volume = Math.min(this.playerProxy.volume + 0.05, 1);
                break;
            }
            case MouseActions.VOLUME_DOWN: {
                this.playerProxy.volume = Math.max(this.playerProxy.volume - 0.05, 0);
                break;
            }
            case MouseActions.TOGGLE_LOOP: {
                this.playerProxy.toggleLoop();
                break;
            }
            case MouseActions.TOGGLE_SHUFFLE: {
                this.playerProxy.toggleShuffle();
                break;
            }
            case MouseActions.SHOW_POPUP_MENU: {
                this.menu.toggle();
                break;
            }
            case MouseActions.RAISE_PLAYER: {
                this.playerProxy.raise();
                break;
            }
            case MouseActions.QUIT_PLAYER: {
                this.playerProxy.quit();
                break;
            }
            default:
                break;
        }
    }
}

const classPropertiers = {
    GTypeName: "McPanelButton",
    Properties: {},
};

export default GObject.registerClass(classPropertiers, PanelButton);
