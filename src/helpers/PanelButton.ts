import GObject from "gi://GObject?version=2.0";
import Clutter from "gi://Clutter?version=13";
import GLib from "gi://GLib?version=2.0";
import Shell from "gi://Shell?version=13";
import St from "gi://St?version=13";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";

import MediaControls from "../extension.js";
import PlayerProxy from "./PlayerProxy.js";
import ScrollingLabel from "./ScrollingLabel.js";
import { LabelTypes, LoopStatus, MouseActions, PanelElements, PlaybackStatus } from "../types/enums.js";
import { debugLog } from "../utils/common.js";

class PanelButton extends PanelMenu.Button {
    private playerProxy: PlayerProxy;
    private extension: MediaControls;

    private icon: St.Icon;
    private label: typeof ScrollingLabel.prototype;
    private controls: St.BoxLayout;
    private box: St.BoxLayout;

    private doubleTapSourceId: number;

    constructor(playerProxy: PlayerProxy, extension: MediaControls) {
        super(0.5, "Media Controls", true);

        this.playerProxy = playerProxy;
        this.extension = extension;
        this.styleClass = "panel-button";

        this.drawWidgets();
        this.addListeners();
        this.initActions();
    }

    public updateProxy(playerProxy: PlayerProxy) {
        if (this.isSamePlayer(playerProxy) === false) {
            this.playerProxy = playerProxy;
            this.drawWidgets();
        }
    }

    public isSamePlayer(playerProxy: PlayerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    public drawWidgets(noReplace = false) {
        if (this.box == null) {
            this.box = new St.BoxLayout({
                styleClass: "panel-button-box",
            });
        } else if (noReplace) {
            this.box.remove_all_children();
        }

        let addedCount = 0;

        for (const element of this.extension.elementsOrder) {
            if (PanelElements[element] === PanelElements.ICON) {
                if (this.extension.showPlayerIcon) {
                    this.addIcon(addedCount);
                    addedCount++;
                } else if (this.icon != null) {
                    this.box.remove_child(this.icon);
                    this.icon = null;
                }
            } else if (PanelElements[element] === PanelElements.LABEL) {
                if (this.extension.showLabel) {
                    this.addLabel(addedCount);
                    addedCount++;
                } else if (this.label != null) {
                    this.box.remove_child(this.label);
                    this.label = null;
                }
            } else if (PanelElements[element] === PanelElements.CONTROLS) {
                if (this.extension.showControlIcons) {
                    this.addControls(addedCount, noReplace);
                    addedCount++;
                } else if (this.controls != null) {
                    this.box.remove_child(this.controls);
                    this.controls = null;
                }
            }
        }

        if (this.box.get_parent() == null) {
            this.add_child(this.box);
        }

        debugLog("Added widgets");
    }

    private addListeners() {
        this.playerProxy.onChanged("PlaybackStatus", () => {
            this.addControls();

            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.label.pauseScrolling();
            } else {
                this.label.resumeScrolling();
            }
        });

        this.playerProxy.onChanged("Metadata", this.addLabel.bind(this));
        this.playerProxy.onChanged("CanPlay", this.addControls.bind(this));
        this.playerProxy.onChanged("CanPause", this.addControls.bind(this));
        this.playerProxy.onChanged("CanSeek", this.addControls.bind(this));
        this.playerProxy.onChanged("CanGoNext", this.addControls.bind(this));
        this.playerProxy.onChanged("CanGoPrevious", this.addControls.bind(this));
        this.playerProxy.onChanged("CanControl", this.addControls.bind(this));
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
                const loopStatuses = Object.values(LoopStatus);
                const currentIndex = loopStatuses.findIndex((loop) => loop === this.playerProxy.loopStatus);
                const nextIndex = (currentIndex + 1 + loopStatuses.length) % loopStatuses.length;

                this.playerProxy.loopStatus = loopStatuses[nextIndex];
                break;
            }
            case MouseActions.TOGGLE_SHUFFLE: {
                this.playerProxy.shuffle = !this.playerProxy.shuffle;
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

    private addIcon(index?: number) {
        index = index ?? this.box.get_n_children();

        const appSystem = Shell.AppSystem.get_default();
        const runningApps = appSystem.get_running();
        const app = runningApps.find((app) => app.get_name() === this.playerProxy.identity);

        if (app == null) {
            return;
        }

        const coloredClass = this.extension.coloredPlayerIcon ? "colored-icon" : "symbolic-icon";

        const icon = new St.Icon({
            gicon: app.get_icon(),
            styleClass: `system-status-icon no-margin ${coloredClass}`,
        });

        if (this.icon?.get_parent() === this.box) {
            this.box.replace_child(this.icon, icon);
        } else {
            this.box.insert_child_at_index(icon, index);
        }

        this.icon = icon;

        debugLog("Added icon");
    }

    private addLabel(index?: number) {
        index = index ?? this.box.get_n_children();

        const label = new ScrollingLabel(
            this.getLabelText(),
            this.extension.labelWidth,
            this.extension.fixedLabelWidth,
            this.extension.scrollLabels,
            this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
        );

        if (this.label?.get_parent() === this.box) {
            this.box.replace_child(this.label, label);
        } else {
            this.box.insert_child_at_index(label, index);
        }

        this.label = label;

        debugLog("Added label");
    }

    private addControls(index?: number, noReplace = false) {
        index = index ?? this.box.get_n_children();

        let addedCount = 0;

        if (this.controls == null || noReplace) {
            this.controls = new St.BoxLayout({
                styleClass: "controls-box",
            });
        }

        if (this.extension.showControlIconsSeekBackward) {
            this.addControlIcon(
                "seekBack",
                "media-seek-backward-symbolic",
                this.playerProxy.seek.bind(this.playerProxy, -5000000),
                this.playerProxy.canSeek && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeControlIcon("seekBack");
        }

        if (this.extension.showControlIconsPrevious) {
            this.addControlIcon(
                "previous",
                "media-skip-backward-symbolic",
                this.playerProxy.previous.bind(this.playerProxy),
                this.playerProxy.canGoPrevious && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeControlIcon("previous");
        }

        if (this.extension.showControlIconsPlay) {
            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.addControlIcon(
                    "play",
                    "media-playback-start-symbolic",
                    this.playerProxy.play.bind(this.playerProxy),
                    this.playerProxy.canPlay && this.playerProxy.canControl,
                    addedCount,
                );
                addedCount++;
            } else {
                this.addControlIcon(
                    "play",
                    "media-playback-pause-symbolic",
                    this.playerProxy.pause.bind(this.playerProxy),
                    this.playerProxy.canPause && this.playerProxy.canControl,
                    addedCount,
                );
                addedCount++;
            }
        } else {
            this.removeControlIcon("play");
        }

        if (this.extension.showControlIconsNext) {
            this.addControlIcon(
                "next",
                "media-skip-forward-symbolic",
                this.playerProxy.next.bind(this.playerProxy),
                this.playerProxy.canGoNext && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeControlIcon("next");
        }

        if (this.extension.showControlIconsSeekForward) {
            this.addControlIcon(
                "seekForward",
                "media-seek-forward-symbolic",
                this.playerProxy.seek.bind(this.playerProxy, 5000000),
                this.playerProxy.canSeek && this.playerProxy.canControl,
                addedCount,
            );
            addedCount++;
        } else {
            this.removeControlIcon("seekForward");
        }

        if (this.controls.get_parent() == null) {
            this.box.insert_child_at_index(this.controls, index);
        }

        debugLog("Added controls");
    }

    private addControlIcon(name: string, iconName: string, onClick: () => void, reactive: boolean, index?: number) {
        index = index ?? this.controls.get_n_children();

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

        const oldIcon = this.controls.find_child_by_name(name);

        if (oldIcon != null) {
            this.controls.replace_child(oldIcon, icon);
        } else {
            this.controls.insert_child_at_index(icon, index);
        }
    }

    private removeControlIcon(name: string) {
        const icon = this.controls.find_child_by_name(name);

        if (icon != null) {
            this.controls.remove_child(icon);
        }
    }

    private getLabelText() {
        const labelTextElements = [];

        for (const labelElement of this.extension.labelsOrder) {
            if (LabelTypes[labelElement] === LabelTypes.TITLE) {
                labelTextElements.push(this.playerProxy.metadata["xesam:title"]);
            } else if (LabelTypes[labelElement] === LabelTypes.ARTIST) {
                labelTextElements.push(this.playerProxy.metadata["xesam:artist"].join(", "));
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
}

const classPropertiers = {
    GTypeName: "McPanelButton",
    Properties: {},
};

export default GObject.registerClass(classPropertiers, PanelButton);
