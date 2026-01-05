/** @import PlayerProxy from './PlayerProxy.js' */
/** @import MediaControls from '../../extension.js' */
/** @import { SignalMap } from 'resource:///org/gnome/shell/misc/signals.js' */
/** @import { KeysOf } from '../../types/misc.js' */
/** @import { PlayerProxyProperties } from '../../types/dbus.js' */
/** @import { PanelControlIconOptions, MenuControlIconOptions } from '../../types/enums/shell_only.js' */

import GObject from "gi://GObject";
import Clutter from "gi://Clutter";
import GdkPixbuf from "gi://GdkPixbuf";
import GLib from "gi://GLib";
import Cogl from "gi://Cogl";
import Gio from "gi://Gio";
import St from "gi://St";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

import ScrollingLabel from "./ScrollingLabel.js";
import MenuSlider from "./MenuSlider.js";
import { debugLog, errorLog } from "../../utils/common.js";
import { getAppByIdAndEntry, getImage } from "../../utils/shell_only.js";
import { ControlIconOptions } from "../../types/enums/shell_only.js";
import {
    LabelTypes,
    PanelElements,
    MouseActions,
    LoopStatus,
    PlaybackStatus,
    WidgetFlags,
} from "../../types/enums/common.js";

Gio._promisify(GdkPixbuf.Pixbuf, "new_from_stream_async", "new_from_stream_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");

/**
 * @param {Clutter.Actor} parent
 * @param {string} name
 * @returns {any}
 */
function find_child_by_name(parent, name) {
    const children = parent.get_children();
    for (const child of children) {
        if (child.get_name() === name) {
            return child;
        }
    }
}

/** @extends PanelMenu.Button */
class PanelButton extends PanelMenu.Button {
    /**
     * @private
     * @type {PlayerProxy}
     */
    playerProxy;
    /**
     * @private
     * @type {MediaControls}
     */
    extension;

    /**
     * @private
     * @type {St.Icon}
     */
    buttonIcon;
    /**
     * @private
     * @type {InstanceType<typeof ScrollingLabel>}
     */
    buttonLabel;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    buttonControls;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    buttonBox;

    /**
     * @private
     * @type {PopupMenu.PopupBaseMenuItem}
     */
    menuBox;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    menuPlayers;
    /**
     * @private
     * @type {St.Icon}
     */
    menuImage;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    menuLabels;
    /**
     * @private
     * @type {InstanceType<typeof MenuSlider>}
     */
    menuSlider;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    menuControls;

    /**
     * @private
     * @type {St.BoxLayout}
     */
    menuPlayersTextBox;
    /**
     * @private
     * @type {St.Icon}
     */
    menuPlayersTextBoxIcon;
    /**
     * @private
     * @type {St.Label}
     */
    menuPlayersTextBoxLabel;
    /**
     * @private
     * @type {St.Icon}
     */
    menuPlayersTextBoxPin;
    /**
     * @private
     * @type {St.BoxLayout}
     */
    menuPlayerIcons;

    /**
     * @private
     * @type {InstanceType<typeof ScrollingLabel>}
     */
    menuLabelTitle;
    /**
     * @private
     * @type {InstanceType<typeof ScrollingLabel>}
     */
    menuLabelSubtitle;

    /**
     * @private
     * @type {number | null}
     */
    doubleTapSourceId;
    /**
     * @private
     * @type {Map<KeysOf<PlayerProxyProperties>, number>}
     */
    changeListenerIds;

    /**
     * @param {PlayerProxy} playerProxy
     * @param {MediaControls} extension
     */
    constructor(playerProxy, extension) {
        super(0.5, "Media Controls", false);
        this.playerProxy = playerProxy;
        this.extension = extension;
        this.changeListenerIds = new Map();
        this.doubleTapSourceId = null;
        this.updateWidgets(WidgetFlags.ALL);
        this.addProxyListeners();
        this.initActions();
        // @ts-expect-error
        this.menu.box.add_style_class_name("popup-menu-container");
        this.connect("destroy", this.onDestroy.bind(this));
    }

    /**
     * Override vfunc_event to handle button clicks before parent class
     * @param {Clutter.Event} _event
     * @returns {boolean}
     */
    vfunc_event(_event) {
        // Do not call super.vfunc_event() because it will handle the event
        // and possibly open the menu
        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * @public
     * @param {PlayerProxy} playerProxy
     * @returns {void}
     */
    updateProxy(playerProxy) {
        if (this.isSamePlayer(playerProxy) === false) {
            debugLog(`Updating proxy to ${playerProxy.busName}`);
            this.removeProxyListeners();
            this.playerProxy = playerProxy;
            this.updateWidgets(WidgetFlags.ALL);
            this.addProxyListeners();
        }
    }

    /**
     * @public
     * @param {PlayerProxy} playerProxy
     * @returns {boolean}
     */
    isSamePlayer(playerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    /**
     * @public
     * @param {WidgetFlags} flags
     * @returns {void}
     */
    updateWidgets(flags) {
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
                } else if (this.buttonIcon != null) {
                    this.buttonBox.remove_child(this.buttonIcon);
                    this.buttonIcon.destroy();
                    this.buttonIcon = null;
                }
            }
            if (
                element === PanelElements.LABEL &&
                (flags & WidgetFlags.PANEL_LABEL || flags & WidgetFlags.PANEL_NO_REPLACE)
            ) {
                if (this.extension.showLabel) {
                    this.addButtonLabel(i);
                } else if (this.buttonLabel != null) {
                    this.buttonBox.remove_child(this.buttonLabel);
                    this.buttonLabel.destroy();
                    this.buttonLabel = null;
                }
            }
            if (
                element === PanelElements.CONTROLS &&
                (flags & WidgetFlags.PANEL_CONTROLS || flags & WidgetFlags.PANEL_NO_REPLACE)
            ) {
                if (this.extension.showControlIcons) {
                    this.addButtonControls(i, flags);
                } else if (this.buttonControls != null) {
                    this.buttonBox.remove_child(this.buttonControls);
                    this.buttonControls.destroy();
                    this.buttonControls = null;
                }
            }
        }
        if (flags & WidgetFlags.MENU_PLAYERS) {
            this.addMenuPlayers();
        }
        if (flags & WidgetFlags.MENU_IMAGE) {
            this.addMenuImage().catch(errorLog);
        }
        if (flags & WidgetFlags.MENU_LABELS) {
            this.addMenuLabels();
        }
        if (flags & WidgetFlags.MENU_SLIDER) {
            if (this.extension.showTrackSlider) {
                this.addMenuSlider().catch(errorLog);
            } else if (this.menuSlider != null) {
                this.menuBox.remove_child(this.menuSlider);
                this.menuSlider.destroy();
                this.menuSlider = null;
            }
        }
        if (flags & WidgetFlags.MENU_CONTROLS) {
            this.addMenuControls(flags);
        }
        if (this.buttonBox.get_parent() == null) {
            this.add_child(this.buttonBox);
        }
        if (this.menuBox.get_parent() == null) {
            // @ts-expect-error
            this.menu.addMenuItem(this.menuBox);
        }
    }

    /**
     * @private
     * @returns {void}
     */
    addMenuPlayers() {
        if (this.menuPlayers == null) {
            this.menuPlayers = new St.BoxLayout({
                vertical: true,
            });
        }
        if (this.menuPlayersTextBox == null) {
            this.menuPlayersTextBox = new St.BoxLayout({
                marginBottom: 3,
            });
        }
        if (this.menuPlayersTextBoxIcon == null) {
            this.menuPlayersTextBoxIcon = new St.Icon({
                styleClass: "popup-menu-icon",
                yAlign: Clutter.ActorAlign.END,
                xAlign: Clutter.ActorAlign.END,
                xExpand: true,
                yExpand: true,
            });
        }
        if (this.menuPlayersTextBoxLabel == null) {
            this.menuPlayersTextBoxLabel = new St.Label({
                styleClass: "popup-menu-player-label",
                yAlign: Clutter.ActorAlign.END,
                yExpand: true,
            });
        }
        if (this.menuPlayersTextBoxPin == null) {
            this.menuPlayersTextBoxPin = new St.Icon({
                iconName: "view-pin-symbolic",
                styleClass: "popup-menu-icon",
                yAlign: Clutter.ActorAlign.END,
                xAlign: Clutter.ActorAlign.START,
                yExpand: true,
                xExpand: true,
                reactive: true,
            });

            if (typeof Clutter.ClickGesture !== "undefined") {
                const pinClickAction = new Clutter.ClickGesture();
                pinClickAction.set_n_clicks_required(1);
                if (pinClickAction.set_recognize_on_press) {
                    pinClickAction.set_recognize_on_press(true);
                }
                pinClickAction.connect("recognize", () => {
                    if (this.playerProxy.isPlayerPinned()) {
                        this.playerProxy.unpinPlayer();
                    } else {
                        this.playerProxy.pinPlayer();
                    }
                    return Clutter.EVENT_STOP;
                });
                this.menuPlayersTextBoxPin.add_action(pinClickAction);
            } else {
                const pinClickAction = new Clutter.ClickAction();
                pinClickAction.connect("clicked", () => {
                    if (this.playerProxy.isPlayerPinned()) {
                        this.playerProxy.unpinPlayer();
                    } else {
                        this.playerProxy.pinPlayer();
                    }
                });
                this.menuPlayersTextBoxPin.add_action(pinClickAction);
            }
        }
        const players = this.extension.getPlayers();
        if (players.length > 1 && this.menuPlayerIcons == null) {
            this.menuPlayerIcons = new St.BoxLayout({
                styleClass: "popup-menu-player-icons",
            });
        } else if (players.length === 1 && this.menuPlayerIcons != null) {
            this.menuPlayerIcons.get_children().forEach((child) => child.destroy());
            this.menuPlayers.remove_child(this.menuPlayerIcons);
            this.menuPlayerIcons.destroy();
            this.menuPlayerIcons = null;
        } else if (this.menuPlayerIcons != null) {
            this.menuPlayerIcons.get_children().forEach((child) => child.destroy());
        }
        const isPinned = this.playerProxy.isPlayerPinned();
        this.menuPlayersTextBoxPin.opacity = isPinned ? 255 : 160;
        if (this.menuPlayerIcons != null) {
            this.menuPlayerIcons.opacity = isPinned ? 160 : 255;
        }
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const app = getAppByIdAndEntry(player.identity, player.desktopEntry);
            const isSamePlayer = this.isSamePlayer(player);
            const appName = app?.get_name() ?? (player.identity || _("Unknown player"));
            const appIcon = app?.get_icon() ?? Gio.Icon.new_for_string("audio-x-generic-symbolic");
            if (isSamePlayer) {
                this.menuPlayersTextBoxLabel.text = appName;
                if (this.menuPlayersTextBoxIcon?.get_parent() != null) {
                    this.menuPlayersTextBox.remove_child(this.menuPlayersTextBoxIcon);
                }
                if (this.menuPlayersTextBoxPin.get_parent() != null) {
                    this.menuPlayersTextBox.remove_child(this.menuPlayersTextBoxPin);
                }
                if (players.length > 1) {
                    this.menuPlayersTextBoxIcon.gicon = null;
                    this.menuPlayersTextBoxLabel.xAlign = Clutter.ActorAlign.END;
                    this.menuPlayersTextBoxLabel.xExpand = true;
                    this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxPin, 1);
                } else {
                    this.menuPlayersTextBoxIcon.gicon = appIcon;
                    this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxIcon, 0);
                    this.menuPlayersTextBoxLabel.xAlign = Clutter.ActorAlign.START;
                    this.menuPlayersTextBoxLabel.xExpand = true;
                }
            }
            if (players.length > 1) {
                const icon = new St.Icon({
                    styleClass: "popup-menu-icon popup-menu-player-icons-icon",
                    gicon: appIcon,
                    reactive: isPinned === false,
                    trackHover: isPinned === false,
                    xAlign: Clutter.ActorAlign.FILL,
                    xExpand: true,
                });
                if (i === 0) {
                    icon.add_style_class_name("popup-menu-player-icons-icon-first");
                } else if (i === players.length - 1) {
                    icon.add_style_class_name("popup-menu-player-icons-icon-last");
                }
                if (isSamePlayer) {
                    icon.add_style_class_name("popup-menu-player-icons-icon-active");
                } else {
                    if (typeof Clutter.ClickGesture !== "undefined") {
                        const clickAction = new Clutter.ClickGesture();
                        if (clickAction.set_recognize_on_press) {
                            clickAction.set_recognize_on_press(true);
                        }
                        clickAction.connect("recognize", () => {
                            this.updateProxy(player);
                            return Clutter.EVENT_STOP;
                        });
                        icon.add_action(clickAction);
                    } else {
                        const clickAction = new Clutter.ClickAction();
                        clickAction.connect("clicked", () => {
                            this.updateProxy(player);
                        });
                        icon.add_action(clickAction);
                    }
                }
                this.menuPlayerIcons.add_child(icon);
            }
        }
        if (this.menuPlayersTextBoxLabel.get_parent() == null) {
            this.menuPlayersTextBox.add_child(this.menuPlayersTextBoxLabel);
        }
        if (this.menuPlayersTextBox.get_parent() == null) {
            this.menuPlayers.add_child(this.menuPlayersTextBox);
        }
        if (this.menuPlayerIcons && this.menuPlayerIcons.get_parent() == null) {
            this.menuPlayers.add_child(this.menuPlayerIcons);
        }
        if (this.menuPlayers.get_parent() == null) {
            this.menuBox.add_child(this.menuPlayers);
            debugLog("Added menu players");
        }
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async addMenuImage() {
        if (this.menuImage == null) {
            this.menuImage = new St.Icon({
                xExpand: false,
                yExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            });
        }
        let artSet = false;
        let stream = await getImage(this.playerProxy.metadata["mpris:artUrl"]);
        if (stream == null && this.playerProxy.metadata["xesam:url"] != null) {
            const trackUri = GLib.uri_parse(this.playerProxy.metadata["xesam:url"], GLib.UriFlags.NONE);
            if (trackUri != null && trackUri.get_scheme() === "file") {
                const file = Gio.File.new_for_uri(trackUri.to_string());
                const info = await file
                    .query_info_async(
                        `${Gio.FILE_ATTRIBUTE_THUMBNAIL_PATH},${Gio.FILE_ATTRIBUTE_STANDARD_ICON}`,
                        Gio.FileQueryInfoFlags.NONE,
                        null,
                        null,
                    )
                    .catch(errorLog);
                if (info != null) {
                    const path = info.get_attribute_byte_string(Gio.FILE_ATTRIBUTE_THUMBNAIL_PATH);
                    if (path == null) {
                        this.menuImage.gicon = info.get_icon();
                    } else {
                        const thumb = Gio.File.new_for_path(path);
                        stream = await getImage(thumb.get_uri());
                    }
                }
            }
        }
        const width = this.getMenuItemWidth();
        if (stream != null) {
            /** @type {Promise<GdkPixbuf.Pixbuf>} */
            const pixbufPromise = /** @type {any} */ (GdkPixbuf.Pixbuf.new_from_stream_async(stream, null));
            const pixbuf = await pixbufPromise.catch(errorLog);
            if (pixbuf != null) {
                const aspectRatio = pixbuf.width / pixbuf.height;
                const height = width / aspectRatio;
                const format = pixbuf.hasAlpha ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888;
                const image = /** @type {St.ImageContent} */ (St.ImageContent.new_with_preferred_size(width, height));
                image.set_bytes(pixbuf.pixelBytes, format, pixbuf.width, pixbuf.height, pixbuf.rowstride);
                this.menuImage.iconSize = -1;
                this.menuImage.gicon = null;
                this.menuImage.width = width;
                this.menuImage.height = height;
                this.menuImage.content = image;
                artSet = true;
            }
        }
        if (artSet === false) {
            this.menuImage.content = null;
            this.menuImage.gicon = Gio.ThemedIcon.new("audio-x-generic-symbolic");
            this.menuImage.width = width;
            this.menuImage.height = width;
            this.menuImage.iconSize = width;
        }
        if (this.menuImage.get_parent() == null) {
            this.menuBox.insert_child_above(this.menuImage, this.menuPlayers);
            debugLog("Added menu image");
        }
    }

    /**
     * @private
     * @returns {void}
     */
    addMenuLabels() {
        if (this.menuLabels == null) {
            this.menuLabels = new St.BoxLayout({
                vertical: true,
            });
        }
        if (this.menuLabelTitle != null) {
            this.menuLabels.remove_child(this.menuLabelTitle);
            this.menuLabelTitle.destroy();
        }
        if (this.menuLabelSubtitle != null) {
            this.menuLabels.remove_child(this.menuLabelSubtitle);
            this.menuLabelSubtitle.destroy();
        }
        const width = this.getMenuItemWidth();
        this.menuLabelTitle = new ScrollingLabel({
            text: this.playerProxy.metadata["xesam:title"],
            isScrolling: this.extension.scrollLabels,
            initPaused: this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
            width,
            scrollSpeed: this.extension.scrollSpeed,
        });
        const artistText = this.playerProxy.metadata["xesam:artist"]?.join(", ") || _("Unknown artist");
        const albumText = this.playerProxy.metadata["xesam:album"] || "";
        this.menuLabelSubtitle = new ScrollingLabel({
            text: albumText === "" ? artistText : `${artistText} / ${albumText}`,
            isScrolling: this.extension.scrollLabels,
            initPaused: this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
            direction: Clutter.TimelineDirection.BACKWARD,
            width,
            scrollSpeed: this.extension.scrollSpeed,
        });
        this.menuLabelTitle.label.add_style_class_name("popup-menu-label-title");
        this.menuLabelTitle.box.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabelSubtitle.box.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabels.add_child(this.menuLabelTitle);
        this.menuLabels.add_child(this.menuLabelSubtitle);
        if (this.menuLabels.get_parent() == null) {
            this.menuBox.add_child(this.menuLabels);
            debugLog("Added menu labels");
        }
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async addMenuSlider() {
        const position = await this.playerProxy.position.catch(errorLog);
        const length = this.playerProxy.metadata["mpris:length"];
        const rate = this.playerProxy.rate;
        if (this.menuSlider == null) {
            this.menuSlider = new MenuSlider();
            this.menuSlider.connect("seeked", (_, position) => {
                this.playerProxy.setPosition(this.playerProxy.metadata["mpris:trackid"], position);
            });
        }
        if (position != null && length != null && length > 0) {
            this.menuSlider.setDisabled(false);
            this.menuSlider.updateSlider(position, length, rate);
            if (this.playerProxy.playbackStatus === PlaybackStatus.PLAYING) {
                this.menuSlider.resumeTransition();
            } else {
                this.menuSlider.pauseTransition();
            }
        } else {
            this.menuSlider.setDisabled(true);
        }
        if (this.menuSlider.get_parent() == null) {
            this.menuBox.insert_child_above(this.menuSlider, this.menuLabels);
            debugLog("Added menu slider");
        }
    }

    /**
     * @private
     * @param {WidgetFlags} flags
     * @returns {void}
     */
    addMenuControls(flags) {
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
                if (this.playerProxy.canControl && !this.playerProxy.canPause) {
                    this.addMenuControlIcon(
                        ControlIconOptions.STOP,
                        this.playerProxy.canControl,
                        this.playerProxy.stop.bind(this.playerProxy),
                    );
                } else {
                    this.addMenuControlIcon(
                        ControlIconOptions.PAUSE,
                        this.playerProxy.canPause && this.playerProxy.canControl,
                        this.playerProxy.pause.bind(this.playerProxy),
                    );
                }
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
            this.menuBox.add_child(this.menuControls);
            debugLog("Added menu controls");
        }
    }

    /**
     * @private
     * @param {MenuControlIconOptions} options
     * @param {boolean} reactive
     * @param {() => void} onClick
     * @returns {void}
     */
    addMenuControlIcon(options, reactive, onClick) {
        const icon = new St.Icon({
            name: options.name,
            iconName: options.iconName,
            styleClass: "popup-menu-icon popup-menu-control-icon",
            trackHover: reactive,
            opacity: reactive ? 255 : 160,
            reactive,
            ...options.menuProps.options,
        });

        if (typeof Clutter.ClickGesture !== "undefined") {
            const clickGesture = new Clutter.ClickGesture();
            clickGesture.set_n_clicks_required(1);
            if (clickGesture.set_recognize_on_press) {
                clickGesture.set_recognize_on_press(true);
            }
            clickGesture.connect("recognize", () => {
                onClick();
                return Clutter.EVENT_STOP;
            });
            icon.add_action(clickGesture);
        } else {
            const clickAction = new Clutter.ClickAction();
            clickAction.connect("clicked", () => {
                onClick();
            });
            icon.add_action(clickAction);
        }

        const oldIcon = find_child_by_name(this.menuControls, options.name);
        if (oldIcon?.get_parent() === this.menuControls) {
            this.menuControls.replace_child(oldIcon, icon);
        } else {
            this.menuControls.insert_child_at_index(icon, options.menuProps.index);
        }
    }

    /**
     * @private
     * @param {number} index
     * @returns {void}
     */
    addButtonIcon(index) {
        const app = getAppByIdAndEntry(this.playerProxy.identity, this.playerProxy.desktopEntry);
        const appIcon = app?.get_icon() ?? Gio.Icon.new_for_string("audio-x-generic-symbolic");
        const coloredClass = this.extension.coloredPlayerIcon ? "colored-icon" : "symbolic-icon";
        const icon = new St.Icon({
            gicon: appIcon,
            styleClass: `system-status-icon no-margin ${coloredClass}`,
        });
        if (this.buttonIcon?.get_parent() === this.buttonBox) {
            this.buttonBox.replace_child(this.buttonIcon, icon);
        } else {
            this.buttonBox.insert_child_at_index(icon, index);
            debugLog("Added icon");
        }
        this.buttonIcon = icon;
    }

    /**
     * @private
     * @param {number} index
     * @returns {void}
     */
    addButtonLabel(index) {
        const text = this.getButtonLabelText();

        // Reuse existing label
        if (this.buttonLabel != null) {
            this.buttonLabel.text = text;
            return;
        }

        const label = new ScrollingLabel({
            text, 
            width: this.extension.labelWidth,
            isFixedWidth: this.extension.isFixedLabelWidth,
            isScrolling: this.extension.scrollLabels,
            initPaused: this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING,
            scrollSpeed: this.extension.scrollSpeed,
            scrollPauseTime: this.extension.scrollPauseTime,
        });

        if (this.buttonLabel?.get_parent() === this.buttonBox) {
            this.buttonBox.replace_child(this.buttonLabel, label);
        } else {
            this.buttonBox.insert_child_at_index(label, index);
            debugLog("Added label");
        }
        this.buttonLabel = label;
    }

    /**
     * @private
     * @param {number} index
     * @param {WidgetFlags} flags
     * @returns {void}
     */
    addButtonControls(index, flags) {
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
                    if (this.playerProxy.canControl && !this.playerProxy.canPause) {
                        this.addButtonControlIcon(
                            ControlIconOptions.STOP,
                            this.playerProxy.stop.bind(this.playerProxy),
                            this.playerProxy.canControl,
                        );
                    } else {
                        this.addButtonControlIcon(
                            ControlIconOptions.PAUSE,
                            this.playerProxy.pause.bind(this.playerProxy),
                            this.playerProxy.canPause && this.playerProxy.canControl,
                        );
                    }
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
            debugLog("Added controls");
        }
    }

    /**
     * @private
     * @param {PanelControlIconOptions} options
     * @param {() => void} onClick
     * @param {boolean} reactive
     * @returns {void}
     */
    addButtonControlIcon(options, onClick, reactive) {
        if (options.panelProps === undefined) {
            debugLog(`Media Controls: panelProps is undefined for ${options.name}`);
            return;
        }

        const icon = new St.Icon({
            name: options.name,
            iconName: options.iconName,
            styleClass: "system-status-icon no-margin",
            opacity: reactive ? 255 : 160,
            reactive,
        });

        if (typeof Clutter.ClickGesture !== "undefined") {
            const clickAction = new Clutter.ClickGesture();
            clickAction.set_n_clicks_required(1);
            if (clickAction.set_recognize_on_press) {
                clickAction.set_recognize_on_press(true);
            }
            clickAction.connect("recognize", () => {
                onClick();
                return Clutter.EVENT_STOP;
            });
            icon.add_action(clickAction);
        } else {
            const clickAction = new Clutter.ClickAction();
            clickAction.connect("clicked", () => {
                onClick();
            });
            icon.add_action(clickAction);
        }

        const oldIcon = find_child_by_name(this.buttonControls, options.name);
        if (oldIcon != null) {
            this.buttonControls.replace_child(oldIcon, icon);
        } else {
            this.buttonControls.insert_child_at_index(icon, options.panelProps.index);
        }
    }

    /**
     * @private
     * @param {ControlIconOptions} options
     * @returns {void}
     */
    removeButtonControlIcon(options) {
        const icon = find_child_by_name(this.buttonControls, options.name);
        if (icon != null) {
            this.buttonControls.remove_child(icon);
            icon.destroy();
        }
    }

    /**
     * @private
     * @returns {string}
     */
    getButtonLabelText() {
        const labelTextElements = [];
        for (const labelElement of this.extension.labelsOrder) {
            if (LabelTypes[labelElement] === LabelTypes.TITLE) {
                labelTextElements.push(this.playerProxy.metadata["xesam:title"]);
            } else if (LabelTypes[labelElement] === LabelTypes.ARTIST) {
                labelTextElements.push(this.playerProxy.metadata["xesam:artist"]?.join(", ") || _("Unknown artist"));
            } else if (LabelTypes[labelElement] === LabelTypes.ALBUM) {
                labelTextElements.push(this.playerProxy.metadata["xesam:album"] || _("Unknown album"));
            } else if (LabelTypes[labelElement] === LabelTypes.DISC_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:discNumber"]);
            } else if (LabelTypes[labelElement] === LabelTypes.TRACK_NUMBER) {
                labelTextElements.push(this.playerProxy.metadata["xesam:trackNumber"]);
            } else {
                labelTextElements.push(labelElement);
            }
        }
        return labelTextElements.join(" ").replace(/[\r\n]+/g, " ");
    }

    /**
     * @private
     * @returns {number}
     */
    getMenuItemWidth() {
        // @ts-expect-error
        const menuContainer = this.menu.box.get_parent().get_parent();
        const minWidth = menuContainer.get_theme_node().get_min_width() - 24;
        return Math.max(minWidth, this.extension.labelWidth);
    }

    /**
     * @private
     * @returns {void}
     */
    addProxyListeners() {
        this.addProxyListener("Metadata", () => {
            this.updateWidgets(
                WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_IMAGE | WidgetFlags.MENU_LABELS | WidgetFlags.MENU_SLIDER,
            );
        });
        this.addProxyListener("PlaybackStatus", () => {
            this.updateWidgets(WidgetFlags.PANEL_CONTROLS_PLAYPAUSE | WidgetFlags.MENU_CONTROLS_PLAYPAUSE);
            if (this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING) {
                this.buttonLabel?.pauseScrolling();
                this.menuLabelTitle.pauseScrolling();
                this.menuLabelSubtitle.pauseScrolling();
                this.menuSlider?.pauseTransition();
            } else {
                this.buttonLabel?.resumeScrolling();
                this.menuLabelTitle.resumeScrolling();
                this.menuLabelSubtitle.resumeScrolling();
                this.menuSlider?.resumeTransition();
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
        this.addProxyListener("IsPinned", () => {
            this.updateWidgets(WidgetFlags.MENU_PLAYERS);
        });
        this.addProxyListener("Rate", () => {
            this.menuSlider?.setRate(this.playerProxy.rate);
        });
        this.playerProxy.onSeeked((position) => {
            this.menuSlider?.setPosition(position);
        });
    }

    /**
     * @private
     * @returns {void}
     */
    removeProxyListeners() {
        for (const [property, id] of this.changeListenerIds.entries()) {
            this.playerProxy.removeListener(property, id);
        }
    }

    /**
     * @private
     * @param {KeysOf<PlayerProxyProperties>} property
     * @param {(...args: unknown[]) => void} callback
     * @returns {void}
     */
    addProxyListener(property, callback) {
        const safeCallback = () => {
            if (this.playerProxy != null) {
                callback();
            }
        };
        const id = this.playerProxy.onChanged(property, safeCallback);
        this.changeListenerIds.set(property, id);
    }

    /**
     * @private
     * @returns {void}
     */
    initActions() {
        this.connect("button-press-event", (_, /** @type {Clutter.Event} */ event) => {
            const button = event.get_button();

            if (button === Clutter.BUTTON_PRIMARY) {
                this.handleLeftClick();
                return Clutter.EVENT_STOP;
            }

            let action;
            if (button === Clutter.BUTTON_MIDDLE) {
                action = this.extension.mouseActionMiddle;
            } else if (button === Clutter.BUTTON_SECONDARY) {
                action = this.extension.mouseActionRight;
            }

            if (action === MouseActions.NONE) {
                return Clutter.EVENT_PROPAGATE;
            }

            this.doMouseAction(action);
            return Clutter.EVENT_STOP;
        });

        this.connect("touch-event", (_, /** @type {Clutter.Event} */ event) => {
            const eventType = event.type();
            if (eventType === Clutter.EventType.TOUCH_BEGIN) {
                this.handleLeftClick();
                return Clutter.EVENT_STOP;
            }

            return Clutter.EVENT_PROPAGATE;
        });

        this.connect("scroll-event", (_, /** @type {Clutter.Event} */ event) => {
            const direction = event.get_scroll_direction();
            if (direction === Clutter.ScrollDirection.UP) {
                this.doMouseAction(this.extension.mouseActionScrollUp);
            } else if (direction === Clutter.ScrollDirection.DOWN) {
                this.doMouseAction(this.extension.mouseActionScrollDown);
            }
            return Clutter.EVENT_STOP;
        });
    }

    handleLeftClick() {
        // Left click uses double-tap detection, but only if there is a
        // double click action set by the user
        if (this.extension.mouseActionDouble === MouseActions.NONE) {
            this.doMouseAction(this.extension.mouseActionLeft);
            return;
        }

        if (this.doubleTapSourceId === null) {
            this.doubleTapSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this.doubleTapSourceId = null;
                this.doMouseAction(this.extension.mouseActionLeft);
                return GLib.SOURCE_REMOVE;
            });
        } else {
            GLib.source_remove(this.doubleTapSourceId);
            this.doubleTapSourceId = null;
            this.doMouseAction(this.extension.mouseActionDouble);
        }
    }

    /**
     * @private
     * @param {MouseActions} action
     * @returns {void}
     */
    doMouseAction(action) {
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
            case MouseActions.OPEN_PREFERENCES: {
                this.extension.openPreferences();
                break;
            }
            default:
                break;
        }
    }

    /**
     * @private
     * @returns {void}
     */
    onDestroy() {
        this.removeProxyListeners();
        this.playerProxy = null;
        // Null out references to child widgets before parent destroys them
        this.menuSlider = null;
        this.menuPlayers = null;
        this.menuImage = null;
        this.menuLabels = null;
        this.menuControls = null;
        this.buttonIcon?.destroy();
        this.buttonLabel?.destroy();
        this.buttonControls?.destroy();
        this.buttonBox?.destroy();
        this.buttonIcon = null;
        this.buttonLabel = null;
        this.buttonControls = null;
        this.buttonBox = null;
        this.menuBox = null;
        this.menuPlayersTextBox = null;
        this.menuPlayersTextBoxIcon = null;
        this.menuPlayersTextBoxLabel = null;
        this.menuPlayersTextBoxPin = null;
        if (this.menuPlayerIcons != null) {
            this.menuPlayerIcons.get_children().forEach((child) => child.destroy());
        }
        this.menuPlayerIcons = null;
        this.menuLabelTitle = null;
        this.menuLabelSubtitle = null;
        if (this.doubleTapSourceId != null) {
            GLib.source_remove(this.doubleTapSourceId);
            this.doubleTapSourceId = null;
        }
    }
}

const GPanelButton = GObject.registerClass(
    {
        GTypeName: "PanelButton",
        Properties: {},
    },
    PanelButton,
);

export default GPanelButton;
