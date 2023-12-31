import GObject from "gi://GObject?version=2.0";
import Clutter from "gi://Clutter?version=13";
import GLib from "gi://GLib?version=2.0";
import Gio from "gi://Gio?version=2.0";
import St from "gi://St?version=13";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";

import MediaControls from "../extension.js";
import PlayerProxy from "./PlayerProxy.js";
import ScrollingLabel from "./ScrollingLabel.js";
import { LabelTypes, LoopStatus, MouseActions, PanelElements, PlaybackStatus } from "../types/enums.js";
import { debugLog, msToHHMMSS } from "../utils/common.js";
import { getAppByIdAndEntry, getImage } from "../utils/extension.js";
import { KeysOf } from "../types/common.js";
import { PlayerProxyProperties } from "../types/dbus.js";

const menuControlIcons = {
    loopNone: {
        name: "loop",
        iconName: "media-playlist-no-repeat-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.START,
    },
    loopTrack: {
        name: "loop",
        iconName: "media-playlist-repeat-song-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.START,
    },
    loopPlaylist: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.START,
    },
    previous: {
        name: "previous",
        iconName: "media-skip-backward-symbolic",
        xExpand: true,
        xAlign: Clutter.ActorAlign.END,
        marginRight: 5,
    },
    play: {
        name: "playpause",
        iconName: "media-playback-start-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.CENTER,
    },
    pause: {
        name: "playpause",
        iconName: "media-playback-pause-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.CENTER,
    },
    next: {
        name: "next",
        iconName: "media-skip-forward-symbolic",
        xExpand: true,
        xAlign: Clutter.ActorAlign.START,
        marginLeft: 5,
    },
    shuffle: {
        name: "shuffle",
        iconName: "media-playlist-shuffle-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.END,
    },
    noShuffle: {
        name: "shuffle",
        iconName: "media-playlist-no-shuffle-symbolic",
        xExpand: false,
        xAlign: Clutter.ActorAlign.END,
    },
};

class PanelButton extends PanelMenu.Button {
    private playerProxy: PlayerProxy;
    private extension: MediaControls;

    private buttonIcon: St.Icon;
    private buttonLabel: typeof ScrollingLabel.prototype;
    private buttonControls: St.BoxLayout;
    private buttonBox: St.BoxLayout;

    private menuBox: PopupMenu.PopupBaseMenuItem;
    private menuPlayers: St.BoxLayout;
    private menuImage: St.Icon;
    private menuLabel: St.BoxLayout;
    private menuSlider: St.BoxLayout;
    private menuControls: St.BoxLayout;

    private menuPlayersTextBox: St.BoxLayout;
    private menuPlayersTextBoxIcon: St.Icon;
    private menuPlayersTextBoxLabel: St.Label;
    private menuPlayersIcons: St.BoxLayout;

    private menuLabelTitle: typeof ScrollingLabel.prototype;
    private menuLabelArtist: typeof ScrollingLabel.prototype;

    private menuSliderTextBox: St.BoxLayout;
    private menuSliderPositionLabel: St.Label;
    private menuSliderDurationLabel: St.Label;
    private menuSliderSlider: Slider.Slider;

    private doubleTapSourceId: number;
    private sliderSourceId: number;
    private changeListenerIds: Map<KeysOf<PlayerProxyProperties>, number>;

    constructor(playerProxy: PlayerProxy, extension: MediaControls) {
        super(0.5, "Media Controls", false);

        this.playerProxy = playerProxy;
        this.extension = extension;
        this.changeListenerIds = new Map();

        this.updateWidgets();
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
            this.updateWidgets();
            this.addProxyListeners();
        }

        this.addMenuPlayers();
    }

    public isSamePlayer(playerProxy: PlayerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    public updateWidgets(noReplace = false) {
        this.updateButton(noReplace);
        this.updateMenu();
    }

    private updateButton(noReplace: boolean) {
        if (this.buttonBox == null) {
            this.buttonBox = new St.BoxLayout({
                styleClass: "panel-button-box",
            });
        } else if (noReplace) {
            this.buttonBox.remove_all_children();
        }

        let addedCount = 0;

        for (const element of this.extension.elementsOrder) {
            if (PanelElements[element] === PanelElements.ICON) {
                if (this.extension.showPlayerIcon) {
                    this.addButtonIcon(addedCount);
                    addedCount++;
                } else if (this.buttonIcon != null) {
                    this.buttonBox.remove_child(this.buttonIcon);
                    this.buttonIcon = null;
                }
            } else if (PanelElements[element] === PanelElements.LABEL) {
                if (this.extension.showLabel) {
                    this.addButtonLabel(addedCount);
                    addedCount++;
                } else if (this.buttonLabel != null) {
                    this.buttonBox.remove_child(this.buttonLabel);
                    this.buttonLabel = null;
                }
            } else if (PanelElements[element] === PanelElements.CONTROLS) {
                if (this.extension.showControlIcons) {
                    this.addButtonControls(addedCount, noReplace);
                    addedCount++;
                } else if (this.buttonControls != null) {
                    this.buttonBox.remove_child(this.buttonControls);
                    this.buttonControls = null;
                }
            }
        }

        if (this.buttonBox.get_parent() == null) {
            this.add_child(this.buttonBox);
        }

        debugLog("Updated button");
    }

    private updateMenu() {
        if (this.menuBox == null) {
            this.menuBox = new PopupMenu.PopupBaseMenuItem({
                style_class: "no-padding popup-menu-box",
                activate: false,
            });

            this.menuBox.set_vertical(true);
            this.menuBox.remove_style_class_name("popup-menu-item");
            this.menuBox.remove_all_children();
        }

        this.addMenuPlayers();
        this.addMenuImage();
        this.addMenuLabel();
        this.addMenuSlider();
        this.addMenuControls();

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
                    xExpand: true,
                    xAlign: Clutter.ActorAlign.FILL,
                });

                if (isSamePlayer) {
                    icon.add_style_class_name("popup-menu-player-icons-icon-active");
                } else {
                    const tapAction = new Clutter.TapAction();

                    tapAction.connect("tap", () => {
                        debugLog("Switched player");
                        this.updateProxy(player);
                    });

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

    private addMenuLabel() {
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
            this.extension.isFixedLabelWidth,
            this.extension.scrollLabels,
            this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
        );

        this.menuLabelTitle.label.add_style_class_name("popup-menu-label-title");
        this.menuLabelTitle.label.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabelTitle.label.xExpand = true;

        this.menuLabelArtist = new ScrollingLabel(
            this.playerProxy.metadata["xesam:artist"]?.join(", ") ?? "Unknown artist",
            this.extension.labelWidth,
            this.extension.isFixedLabelWidth,
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

        debugLog("Added menu label");
    }

    private async addMenuSlider() {
        if (this.menuSlider == null) {
            this.menuSlider = new St.BoxLayout({
                vertical: true,
            });

            this.menuSlider.connect("destroy", () => {
                if (this.sliderSourceId != null) {
                    GLib.source_remove(this.sliderSourceId);
                    this.sliderSourceId = null;
                }
            });
        }

        if (this.menuSliderSlider == null) {
            this.menuSliderSlider = new Slider.Slider(0);

            this.menuSliderSlider.connect("drag-end", (event) => {
                const newPosition = event._value * this.playerProxy.metadata["mpris:length"];
                this.playerProxy.setPosition(this.playerProxy.metadata["mpris:trackid"], newPosition);
            });
        }

        if (this.menuSliderTextBox == null) {
            this.menuSliderTextBox = new St.BoxLayout({
                name: "text-box",
            });
        }

        if (this.menuSliderPositionLabel == null) {
            this.menuSliderPositionLabel = new St.Label({
                name: "position-label",
                text: "00:00",
                xExpand: true,
                xAlign: Clutter.ActorAlign.START,
            });
        }

        if (this.menuSliderDurationLabel == null) {
            this.menuSliderDurationLabel = new St.Label({
                name: "duration-label",
                text: "00:00",
                xExpand: true,
                xAlign: Clutter.ActorAlign.END,
            });
        }

        if (this.sliderSourceId == null) {
            this.sliderSourceId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 1, () => {
                this.playerProxy.position.then((position) => {
                    if (position == null) {
                        GLib.source_remove(this.sliderSourceId);
                        this.sliderSourceId = null;
                        return;
                    }

                    this.menuSliderSlider.value = position / this.playerProxy.metadata["mpris:length"];
                    this.menuSliderPositionLabel.text = msToHHMMSS(position);
                    this.menuSliderDurationLabel.text = msToHHMMSS(this.playerProxy.metadata["mpris:length"]);
                });

                return GLib.SOURCE_CONTINUE;
            });
        }

        if (this.menuSliderTextBox.get_parent() == null) {
            this.menuSlider.insert_child_at_index(this.menuSliderTextBox, 0);
        }

        if (this.menuSliderPositionLabel.get_parent() == null) {
            this.menuSliderTextBox.insert_child_at_index(this.menuSliderPositionLabel, 0);
        }

        if (this.menuSliderDurationLabel.get_parent() == null) {
            this.menuSliderTextBox.insert_child_at_index(this.menuSliderDurationLabel, 1);
        }

        if (this.menuSliderSlider.get_parent() == null) {
            this.menuSlider.insert_child_at_index(this.menuSliderSlider, 1);
        }

        if (this.menuSlider.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuSlider, 3);
        }

        debugLog("Added menu slider");
    }

    private addMenuControls() {
        if (this.menuControls == null) {
            this.menuControls = new St.BoxLayout();
        }

        this.addMenuControlIcon(
            this.playerProxy.loopStatus === LoopStatus.NONE
                ? "loopNone"
                : this.playerProxy.loopStatus === LoopStatus.TRACK
                  ? "loopTrack"
                  : "loopPlaylist",
            this.playerProxy.loopStatus != null,
            this.playerProxy.toggleLoop.bind(this.playerProxy),
        );

        this.addMenuControlIcon(
            "previous",
            this.playerProxy.canGoPrevious && this.playerProxy.canControl,
            this.playerProxy.previous.bind(this.playerProxy),
        );

        if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
            this.addMenuControlIcon(
                "play",
                this.playerProxy.canPlay && this.playerProxy.canControl,
                this.playerProxy.play.bind(this.playerProxy),
            );
        } else {
            this.addMenuControlIcon(
                "pause",
                this.playerProxy.canPause && this.playerProxy.canControl,
                this.playerProxy.pause.bind(this.playerProxy),
            );
        }

        this.addMenuControlIcon(
            "next",
            this.playerProxy.canGoNext && this.playerProxy.canControl,
            this.playerProxy.next.bind(this.playerProxy),
        );

        this.addMenuControlIcon(
            this.playerProxy.shuffle ? "noShuffle" : "shuffle",
            this.playerProxy.shuffle != null,
            this.playerProxy.toggleShuffle.bind(this.playerProxy),
        );

        if (this.menuControls.get_parent() == null) {
            this.menuBox.insert_child_at_index(this.menuControls, 4);
        }
    }

    private addMenuControlIcon(name: KeysOf<typeof menuControlIcons>, reactive: boolean, onClick: () => void) {
        const props = menuControlIcons[name];
        const icon = new St.Icon({
            styleClass: "popup-menu-icon popup-menu-control-icon",
            trackHover: reactive,
            opacity: reactive ? 255 : 180,
            reactive,
            ...props,
        });

        const tapAction = new Clutter.TapAction();
        tapAction.connect("tap", onClick);
        icon.add_action(tapAction);

        const oldIcon = this.menuControls.find_child_by_name(props.name);

        if (oldIcon?.get_parent() === this.menuControls) {
            this.menuControls.replace_child(oldIcon, icon);
        } else {
            this.menuControls.add_child(icon);
        }
    }

    private addButtonIcon(index?: number) {
        index = index ?? this.buttonBox.get_n_children();

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

    private addButtonLabel(index?: number) {
        index = index ?? this.buttonBox.get_n_children();

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

    private addButtonControls(index?: number, noReplace = false) {
        index = index ?? this.buttonBox.get_n_children();

        let addedCount = 0;

        if (this.buttonControls == null || noReplace) {
            this.buttonControls = new St.BoxLayout({
                styleClass: "panel-controls-box",
            });
        }

        if (this.extension.showControlIconsSeekBackward) {
            this.addButtonControlIcon(
                "seekBack",
                "media-seek-backward-symbolic",
                this.playerProxy.seek.bind(this.playerProxy, -5000000),
                this.playerProxy.canSeek && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeButtonControlIcon("seekBack");
        }

        if (this.extension.showControlIconsPrevious) {
            this.addButtonControlIcon(
                "previous",
                "media-skip-backward-symbolic",
                this.playerProxy.previous.bind(this.playerProxy),
                this.playerProxy.canGoPrevious && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeButtonControlIcon("previous");
        }

        if (this.extension.showControlIconsPlay) {
            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.addButtonControlIcon(
                    "play",
                    "media-playback-start-symbolic",
                    this.playerProxy.play.bind(this.playerProxy),
                    this.playerProxy.canPlay && this.playerProxy.canControl,
                    addedCount,
                );
                addedCount++;
            } else {
                this.addButtonControlIcon(
                    "play",
                    "media-playback-pause-symbolic",
                    this.playerProxy.pause.bind(this.playerProxy),
                    this.playerProxy.canPause && this.playerProxy.canControl,
                    addedCount,
                );
                addedCount++;
            }
        } else {
            this.removeButtonControlIcon("play");
        }

        if (this.extension.showControlIconsNext) {
            this.addButtonControlIcon(
                "next",
                "media-skip-forward-symbolic",
                this.playerProxy.next.bind(this.playerProxy),
                this.playerProxy.canGoNext && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeButtonControlIcon("next");
        }

        if (this.extension.showControlIconsSeekForward) {
            this.addButtonControlIcon(
                "seekForward",
                "media-seek-forward-symbolic",
                this.playerProxy.seek.bind(this.playerProxy, 5000000),
                this.playerProxy.canSeek && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeButtonControlIcon("seekForward");
        }

        if (this.buttonControls.get_parent() == null) {
            this.buttonBox.insert_child_at_index(this.buttonControls, index);
        }

        debugLog("Added controls");
    }

    private addButtonControlIcon(
        name: string,
        iconName: string,
        onClick: () => void,
        reactive: boolean,
        index?: number,
    ) {
        index = index ?? this.buttonControls.get_n_children();

        const icon = new St.Icon({
            name,
            iconName,
            styleClass: "system-status-icon no-margin",
            opacity: reactive ? 255 : 180,
            reactive,
        });

        const tapAction = new Clutter.TapAction();
        tapAction.connect("tap", onClick);

        icon.add_action(tapAction);

        const oldIcon = this.buttonControls.find_child_by_name(name);

        if (oldIcon != null) {
            this.buttonControls.replace_child(oldIcon, icon);
        } else {
            this.buttonControls.insert_child_at_index(icon, index);
        }
    }

    private removeButtonControlIcon(name: string) {
        const icon = this.buttonControls.find_child_by_name(name);

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

        const updateControls = () => {
            this.addButtonControls();
            this.addMenuControls();
        };

        this.addProxyListener("Metadata", () => {
            this.addButtonLabel();
            this.addMenuImage();
            this.addMenuLabel();
            this.addMenuSlider();
        });

        this.addProxyListener("PlaybackStatus", () => {
            updateControls();

            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.buttonLabel.pauseScrolling();
                this.menuLabelTitle.pauseScrolling();
                this.menuLabelArtist.pauseScrolling();
            } else {
                this.buttonLabel.resumeScrolling();
                this.menuLabelTitle.resumeScrolling();
                this.menuLabelArtist.resumeScrolling();
            }
        });

        this.addProxyListener("CanPlay", updateControls.bind(this));
        this.addProxyListener("CanPause", updateControls.bind(this));
        this.addProxyListener("CanSeek", updateControls.bind(this));
        this.addProxyListener("CanGoNext", updateControls.bind(this));
        this.addProxyListener("CanGoPrevious", updateControls.bind(this));
        this.addProxyListener("CanControl", updateControls.bind(this));

        this.addProxyListener("Shuffle", this.addMenuControls.bind(this));
        this.addProxyListener("LoopStatus", this.addMenuControls.bind(this));
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
