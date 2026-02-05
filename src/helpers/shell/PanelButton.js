/** @import PlayerProxy from './PlayerProxy.js' */
/** @import MediaControls from '../../extension.js' */
/** @import { KeysOf } from '../../types/misc.js' */
/** @import { PlayerProxyProperties } from '../../types/dbus.js' */

import GObject from "gi://GObject";
import Clutter from "gi://Clutter";
import GdkPixbuf from "gi://GdkPixbuf";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import St from "gi://St";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";

import ScrollingLabel from "./ScrollingLabel.js";
import MenuSlider from "./MenuSlider.js";
import { debugLog, errorLog } from "../../utils/common.js";
import { getAppByIdAndEntry, getImage, getDominantColor, ControlIconOptions } from "../../utils/shell_only.js";
import {
    LabelTypes,
    PanelElements,
    MouseActions,
    LoopStatus,
    PlaybackStatus,
    WidgetFlags,
} from "../../types/enums/common1.js";
import { LyricsClient } from "../../utils/LyricsClient.js";
import { LyricsWidget } from "../../utils/LyricsWidget.js";

Gio._promisify(GdkPixbuf.Pixbuf, "new_from_stream_async", "new_from_stream_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");

/** @extends PanelMenu.Button */
class PanelButton extends PanelMenu.Button {
    static {
        GObject.registerClass(
            {
                GTypeName: "PanelButton",
            },
            this
        );
    }

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

        // Initialize UI
        this.updateWidgets(WidgetFlags.ALL);

        // Listeners
        this.addProxyListeners();
        this.initActions();

        // @ts-expect-error
        this.menu.box.add_style_class_name("popup-menu-container");
        this.connect("destroy", this.onDestroy.bind(this));

        // Lyrics
        this.lyricsClient = new LyricsClient();
        this.isLyricsMode = false; // Toggle state
        this._currentLyricsTrackId = null;
        this._currentLyricsData = null;
        this._currentLyricsState = null; // 'lyrics' | 'empty'
    }

    /**
     * Override vfunc_event to handle button clicks before parent class
     */
    vfunc_event(_event) {
        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * @public
     * @param {PlayerProxy} playerProxy
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
     */
    isSamePlayer(playerProxy) {
        return this.playerProxy.busName === playerProxy.busName;
    }

    /**
     * @public
     * @param {WidgetFlags} flags
     */
    updateWidgets(flags) {
        this._ensureButtonBox();
        this._ensureMenuBox();

        // Panel Elements (Icon, Label, Controls)
        for (let i = 0; i < this.extension.elementsOrder.length; i++) {
            const element = PanelElements[this.extension.elementsOrder[i]];

            if (element === PanelElements.ICON && (flags & WidgetFlags.PANEL_ICON || flags & WidgetFlags.PANEL_NO_REPLACE)) {
                this.extension.showPlayerIcon ? this.addButtonIcon(i) : this._destroyChild("buttonIcon");
            }

            if (element === PanelElements.LABEL && (flags & WidgetFlags.PANEL_LABEL || flags & WidgetFlags.PANEL_NO_REPLACE)) {
                this.extension.showLabel ? this.addButtonLabel(i) : this._destroyChild("buttonLabel");
            }

            if (element === PanelElements.CONTROLS && (flags & WidgetFlags.PANEL_CONTROLS || flags & WidgetFlags.PANEL_NO_REPLACE)) {
                this.extension.showControlIcons ? this.addButtonControls(i, flags) : this._destroyChild("buttonControls");
            }
        }

        // Menu Elements
        if (flags & WidgetFlags.MENU_PLAYERS) this.addMenuPlayers();
        if (flags & WidgetFlags.MENU_IMAGE) this.addMenuImage().catch(errorLog);
        if (flags & WidgetFlags.MENU_LABELS) this.addMenuLabels();

        if (flags & WidgetFlags.MENU_SLIDER) {
            this.extension.showTrackSlider ? this.addMenuSlider().catch(errorLog) : this._destroyChild("menuSlider");
        }

        if (flags & WidgetFlags.MENU_CONTROLS) this.addMenuControls(flags);

        // Attach boxes if needed
        if (this.buttonBox.get_parent() == null) this.add_child(this.buttonBox);
        // @ts-expect-error
        if (this.menuBox.get_parent() == null) this.menu.addMenuItem(this.menuBox);
    }

    /* --- PRIVATE UI BUILDERS --- */

    _ensureButtonBox() {
        if (!this.buttonBox) {
            this.buttonBox = new St.BoxLayout({ styleClass: "panel-button-box" });
        }
    }

    _ensureMenuBox() {
        if (!this.menuBox) {
            this.menuBox = new PopupMenu.PopupBaseMenuItem({
                style_class: "no-padding popup-menu-box",
                activate: false,
            });
            this.menuBox.set_vertical(true);
            this.menuBox.remove_style_class_name("popup-menu-item");
            this.menuBox.remove_all_children();
        }
    }

    addMenuPlayers() {
        if (!this.menuPlayers) this.menuPlayers = new St.BoxLayout({ vertical: true });

        // Header (Icon + Name + Pin)
        if (!this.menuPlayersTextBox) {
            this.menuPlayersTextBox = new St.BoxLayout({
                marginBottom: 6,
                style_class: "popup-menu-header-box" // Helper class for alignment
            });

            this.menuPlayersTextBoxIcon = new St.Icon({
                styleClass: "popup-menu-icon",
                yAlign: Clutter.ActorAlign.CENTER,
                xAlign: Clutter.ActorAlign.CENTER
            });

            this.menuPlayersTextBoxLabel = new St.Label({
                styleClass: "popup-menu-player-label",
                yAlign: Clutter.ActorAlign.CENTER,
                xAlign: Clutter.ActorAlign.CENTER
            });

            this.menuPlayersTextBoxPin = new St.Icon({
                iconName: "view-pin-symbolic",
                styleClass: "popup-menu-icon",
                reactive: true,
                yAlign: Clutter.ActorAlign.CENTER,
                xAlign: Clutter.ActorAlign.CENTER
            });

            this._bindClick(this.menuPlayersTextBoxPin, () => {
                this.playerProxy.isPlayerPinned() ? this.playerProxy.unpinPlayer() : this.playerProxy.pinPlayer();
            });
        }

        // Icons List
        const players = this.extension.getPlayers();
        if (players.length > 1 && !this.menuPlayerIcons) {
            this.menuPlayerIcons = new St.BoxLayout({ styleClass: "popup-menu-player-icons" });
        } else if (players.length <= 1 && this.menuPlayerIcons) {
            this.menuPlayerIcons.destroy_all_children();
            this.menuPlayerIcons.destroy();
            this.menuPlayerIcons = null;
        } else if (this.menuPlayerIcons) {
            this.menuPlayerIcons.destroy_all_children();
        }

        const isPinned = this.playerProxy.isPlayerPinned();
        this.menuPlayersTextBoxPin.opacity = isPinned ? 255 : 160;
        if (this.menuPlayerIcons) this.menuPlayerIcons.opacity = isPinned ? 160 : 255;

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const app = getAppByIdAndEntry(player.identity, player.desktopEntry);
            const isSamePlayer = this.isSamePlayer(player);
            const appName = app?.get_name() ?? (player.identity || _("Unknown player"));
            const appIcon = app?.get_icon() ?? Gio.Icon.new_for_string("audio-x-generic-symbolic");

            if (isSamePlayer) {
                this.menuPlayersTextBoxLabel.text = appName;
                this._arrangePlayerHeader(players.length > 1, appIcon);
            }

            if (players.length > 1) {
                const icon = new St.Icon({
                    styleClass: "popup-menu-icon popup-menu-player-icons-icon",
                    gicon: appIcon,
                    reactive: !isPinned,
                    trackHover: !isPinned,
                    xAlign: Clutter.ActorAlign.FILL, xExpand: true,
                });

                if (i === 0) icon.add_style_class_name("popup-menu-player-icons-icon-first");
                if (i === players.length - 1) icon.add_style_class_name("popup-menu-player-icons-icon-last");
                if (isSamePlayer) icon.add_style_class_name("popup-menu-player-icons-icon-active");
                else {
                    this._bindClick(icon, () => this.updateProxy(player));
                }
                this.menuPlayerIcons.add_child(icon);
            }
        }

        if (!this.menuPlayersTextBoxLabel.get_parent()) this.menuPlayersTextBox.add_child(this.menuPlayersTextBoxLabel);
        if (!this.menuPlayersTextBox.get_parent()) this.menuPlayers.add_child(this.menuPlayersTextBox);
        if (this.menuPlayerIcons && !this.menuPlayerIcons.get_parent()) this.menuPlayers.add_child(this.menuPlayerIcons);
        if (!this.menuPlayers.get_parent()) this.menuBox.add_child(this.menuPlayers);
    }

    _arrangePlayerHeader(hasMultiple, appIcon) {
        if (this.menuPlayersTextBoxIcon.get_parent()) this.menuPlayersTextBox.remove_child(this.menuPlayersTextBoxIcon);
        if (this.menuPlayersTextBoxPin.get_parent()) this.menuPlayersTextBox.remove_child(this.menuPlayersTextBoxPin);

        if (hasMultiple) {
            this.menuPlayersTextBoxIcon.gicon = null;
            this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxPin, 1);
            this.menuPlayersTextBox.xAlign = Clutter.ActorAlign.FILL;
            this.menuPlayersTextBoxLabel.xExpand = true;
            this.menuPlayersTextBoxLabel.xAlign = Clutter.ActorAlign.START;
        } else {
            this.menuPlayersTextBoxIcon.gicon = appIcon;
            this.menuPlayersTextBox.insert_child_at_index(this.menuPlayersTextBoxIcon, 0);
            this.menuPlayersTextBox.xAlign = Clutter.ActorAlign.CENTER; 
            this.menuPlayersTextBoxLabel.xExpand = false;
            this.menuPlayersTextBoxLabel.xAlign = Clutter.ActorAlign.CENTER;
        }
    }

    async addMenuImage() {
        if (!this.artStack) {
            this.artStack = new St.Widget({
                layout_manager: new Clutter.BinLayout(),
                x_expand: true,
                y_expand: true,
                reactive: true,
                track_hover: true,
            });

            this._bindClick(this.artStack, () => this._toggleLyricsView());

            // Album Art
            this.menuImage = new St.Icon({
                x_expand: true,
                y_expand: true,
                x_align: Clutter.ActorAlign.CENTER,
                style_class: "popup-menu-icon-art",
                reactive: false
            });

            // Lyrics Widget
            this.lyricsWidget = new LyricsWidget(270, 270);
            this.lyricsWidget.visible = false;
            this.lyricsWidget.reactive = false;

            // --- Hover Overlay Label ---
            this.lyricsOverlayLabel = new St.Label({
                text: "Show Lyrics",
                style_class: "lyrics-overlay-label",
                opacity: 0,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                reactive: false
            });

            this._overlayTimeoutId = null;

            const resetOverlayTimer = () => {
                if (this._overlayTimeoutId) GLib.source_remove(this._overlayTimeoutId);

                this.lyricsOverlayLabel.ease({
                    opacity: 100,
                    duration: 200,
                    mode: Clutter.AnimationMode.EASE_OUT_QUAD
                });

                this._overlayTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                    this.lyricsOverlayLabel.ease({
                        opacity: 0,
                        duration: 1000,
                        mode: Clutter.AnimationMode.EASE_IN_QUAD
                    });
                    this._overlayTimeoutId = null;
                    return GLib.SOURCE_REMOVE;
                });
            };

            this.artStack.connect("motion-event", () => {
                if (this.artStack.hover) resetOverlayTimer();
                return Clutter.EVENT_PROPAGATE;
            });

            this.artStack.connect("notify::hover", () => {
                if (this.artStack.hover) {
                    this.lyricsOverlayLabel.text = this.isLyricsMode ? "Hide Lyrics" : "Show Lyrics";
                    resetOverlayTimer();
                } else {
                    if (this._overlayTimeoutId) {
                        GLib.source_remove(this._overlayTimeoutId);
                        this._overlayTimeoutId = null;
                    }
                    this.lyricsOverlayLabel.opacity = 0;
                }
            });

            this.artStack.add_child(this.menuImage);
            this.artStack.add_child(this.lyricsWidget);
            this.artStack.add_child(this.lyricsOverlayLabel);
        }


        // --- Metadata Fetching---
        let artUrl = this.playerProxy.metadata["mpris:artUrl"];
        let stream = await getImage(artUrl);

        if (!stream && this.playerProxy.metadata["xesam:url"]) {
            try {
                const trackUri = GLib.uri_parse(this.playerProxy.metadata["xesam:url"], GLib.UriFlags.NONE);
                if (trackUri?.get_scheme() === "file") {
                    const file = Gio.File.new_for_uri(trackUri.to_string());
                    const info = await file.query_info_async(
                        `${Gio.FILE_ATTRIBUTE_THUMBNAIL_PATH},${Gio.FILE_ATTRIBUTE_STANDARD_ICON}`,
                        Gio.FileQueryInfoFlags.NONE, null, null
                    );
                    if (info) {
                        const path = info.get_attribute_byte_string(Gio.FILE_ATTRIBUTE_THUMBNAIL_PATH);
                        if (path) {
                            const thumb = Gio.File.new_for_path(path);
                            artUrl = thumb.get_uri();
                            stream = await getImage(artUrl);
                        } else {
                            this.menuImage.gicon = info.get_icon();
                        }
                    }
                }
            } catch (e) {
                // Ignore
            }
        }

        // --- SIZE CALCULATION ---
        let width = this._getMenuItemWidth();
        if (!width || width < 100) {
            width = 270;
        }
        const height = width;

        // Update Lyrics Widget Size
        this.lyricsWidget.set_width(width);
        this.lyricsWidget.set_height(height);

        let artSet = false;

        if (stream) {
            try {
                const pixbuf = await GdkPixbuf.Pixbuf.new_from_stream_async(stream, null);
                if (pixbuf) {
                    const scaledPixbuf = pixbuf.scale_simple(width, height, GdkPixbuf.InterpType.BILINEAR);
                    const [success, buffer] = scaledPixbuf.save_to_bufferv("png", [], []);
                    if (success) {
                        this.menuImage.content = null;
                        this.menuImage.gicon = Gio.BytesIcon.new(GLib.Bytes.new(buffer));

                        this.menuImage.icon_size = -1;
                        this.menuImage.set_size(width, height);
                        this.menuImage.set_style(`width: ${width}px; height: ${height}px; icon-size: ${width}px;`);

                        artSet = true;
                    }
                }
            } catch (e) {
                errorLog("Failed to load pixbuf", e);
            }
        }

        if (!artSet) {
            this.menuImage.content = null;
            this.menuImage.gicon = Gio.ThemedIcon.new("audio-x-generic-symbolic");

            const iconSize = width / 2;
            this.menuImage.icon_size = iconSize;
            this.menuImage.set_size(width, width);
            this.menuImage.set_style(null);
            this.menuBox.set_style(null);
        } else {
            const colorStream = await getImage(artUrl);
            const baseColor = await getDominantColor(colorStream);

            if (baseColor) {
                const rgb = baseColor.replace("rgb(", "").replace(")", "");
                const startColor = `rgba(${rgb}, 0.95)`;
                const endColor = `rgba(0, 0, 0, 0.85)`;
                this.menuBox.set_style(
                    `background-gradient-direction: vertical;
                     background-gradient-start: ${startColor};
                     background-gradient-end: ${endColor};`
                );
            } else {
                this.menuBox.set_style(null);
            }
        }

        // --- Add Stack to MenuBox ---
        if (!this.artStack.get_parent()) {
            this.menuBox.insert_child_above(this.artStack, this.menuPlayers);
            debugLog("Added menu image stack");
        }
    }

    addMenuLabels() {
        if (!this.menuLabels) this.menuLabels = new St.BoxLayout({ vertical: true });

        this._destroyChild("menuLabelTitle");
        this._destroyChild("menuLabelSubtitle");

        const width = this._getMenuItemWidth();
        const isPaused = this.playerProxy.playbackStatus !== PlaybackStatus.PLAYING;

        this.menuLabelTitle = new ScrollingLabel({
            text: this.playerProxy.metadata["xesam:title"],
            isScrolling: this.extension.scrollLabels,
            initPaused: isPaused,
            width,
            scrollSpeed: this.extension.scrollSpeed,
        });

        const artist = this.playerProxy.metadata["xesam:artist"]?.join(", ") || _("Unknown artist");
        const album = this.playerProxy.metadata["xesam:album"] || "";
        const subText = album === "" ? artist : `${artist} / ${album}`;

        this.menuLabelSubtitle = new ScrollingLabel({
            text: subText,
            isScrolling: this.extension.scrollLabels,
            initPaused: isPaused,
            direction: Clutter.TimelineDirection.BACKWARD,
            width,
            scrollSpeed: this.extension.scrollSpeed,
        });

        // Use CSS classes
        this.menuLabelTitle.label.add_style_class_name("popup-menu-label-title");
        this.menuLabelSubtitle.label.add_style_class_name("popup-menu-label-title"); // Reusing title style, or define new one
        this.menuLabelSubtitle.label.style = "font-size: 1.05em; opacity: 0.8;"; // Minor inline override allowed for specificity, or move to CSS

        this.menuLabelTitle.box.xAlign = Clutter.ActorAlign.CENTER;
        this.menuLabelSubtitle.box.xAlign = Clutter.ActorAlign.CENTER;

        this.menuLabels.add_child(this.menuLabelTitle);
        this.menuLabels.add_child(this.menuLabelSubtitle);

        if (!this.menuLabels.get_parent()) {
            this.menuBox.add_child(this.menuLabels);
            debugLog("Added menu labels");
        }
    }

    async addMenuSlider() {
        if (!this.menuSlider) {
            this.menuSlider = new MenuSlider();
            this.menuSlider.connect("seeked", (_, pos) => {
                this.playerProxy.setPosition(this.playerProxy.metadata["mpris:trackid"], pos);
            });
        }

        const position = await this.playerProxy.position.catch(errorLog);
        const length = this.playerProxy.metadata["mpris:length"];

        if (position != null && length > 0) {
            this.menuSlider.setDisabled(false);
            this.menuSlider.updateSlider(position, length, this.playerProxy.rate);
            this.playerProxy.playbackStatus === PlaybackStatus.PLAYING
                ? this.menuSlider.resumeTransition()
                : this.menuSlider.pauseTransition();
        } else {
            this.menuSlider.setDisabled(true);
        }

        if (!this.menuSlider.get_parent()) {
            this.menuBox.insert_child_above(this.menuSlider, this.menuLabels);
        }
    }

    addMenuControls(flags) {
        if (!this.menuControls) this.menuControls = new St.BoxLayout();

        const p = this.playerProxy;
        const canCtrl = p.canControl;
        const isPlaying = p.playbackStatus === PlaybackStatus.PLAYING;

        if (flags & WidgetFlags.MENU_CONTROLS_LOOP) {
            const loopOpt = p.loopStatus === LoopStatus.NONE ? ControlIconOptions.LOOP_NONE :
                p.loopStatus === LoopStatus.TRACK ? ControlIconOptions.LOOP_TRACK :
                    ControlIconOptions.LOOP_PLAYLIST;
            this.addMenuControlIcon(loopOpt, p.loopStatus != null, () => p.toggleLoop());
        }

        if (flags & WidgetFlags.MENU_CONTROLS_PREV) {
            this.addMenuControlIcon(ControlIconOptions.PREVIOUS, p.canGoPrevious && canCtrl, () => p.previous());
        }

        if (flags & WidgetFlags.MENU_CONTROLS_PLAYPAUSE) {
            if (!isPlaying) {
                this.addMenuControlIcon(ControlIconOptions.PLAY, p.canPlay && canCtrl, () => p.play());
            } else if (canCtrl && !p.canPause) {
                this.addMenuControlIcon(ControlIconOptions.STOP, canCtrl, () => p.stop());
            } else {
                this.addMenuControlIcon(ControlIconOptions.PAUSE, p.canPause && canCtrl, () => p.pause());
            }
        }

        if (flags & WidgetFlags.MENU_CONTROLS_NEXT) {
            this.addMenuControlIcon(ControlIconOptions.NEXT, p.canGoNext && canCtrl, () => p.next());
        }

        if (flags & WidgetFlags.MENU_CONTROLS_SHUFFLE) {
            this.addMenuControlIcon(
                p.shuffle ? ControlIconOptions.SHUFFLE_OFF : ControlIconOptions.SHUFFLE_ON,
                p.shuffle != null,
                () => p.toggleShuffle()
            );
        }

        if (!this.menuControls.get_parent()) {
            this.menuBox.add_child(this.menuControls);
            debugLog("Added menu controls");
        }
    }

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

        this._bindClick(icon, onClick);

        const oldIcon = this._findChildByName(this.menuControls, options.name);
        if (oldIcon) {
            this.menuControls.replace_child(oldIcon, icon);
        } else {
            this.menuControls.insert_child_at_index(icon, options.menuProps.index);
        }
    }

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
        }
        this.buttonIcon = icon;
    }

    addButtonLabel(index) {
        const label = new ScrollingLabel({
            text: this.getButtonLabelText(),
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
        }
        this.buttonLabel = label;
    }

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

    addButtonControlIcon(options, onClick, reactive) {
        if (options.panelProps === undefined) return;

        const icon = new St.Icon({
            name: options.name,
            iconName: options.iconName,
            styleClass: "system-status-icon no-margin",
            opacity: reactive ? 255 : 160,
            reactive,
        });

        this._bindClick(icon, onClick);

        const oldIcon = this._findChildByName(this.buttonControls, options.name);
        if (oldIcon) {
            this.buttonControls.replace_child(oldIcon, icon);
        } else {
            this.buttonControls.insert_child_at_index(icon, options.panelProps.index);
        }
    }

    removeButtonControlIcon(options) {
        const icon = this._findChildByName(this.buttonControls, options.name);
        if (icon) {
            this.buttonControls.remove_child(icon);
            icon.destroy();
        }
    }


    /* --- LYRICS --- */
    _toggleLyricsView() {
        this.isLyricsMode = !this.isLyricsMode;

        if (this.lyricsOverlayLabel) {
            this.lyricsOverlayLabel.text = this.isLyricsMode ? "Hide Lyrics" : "Show Lyrics";
        }
        const duration = 500;

        if (this.isLyricsMode) {
            this.lyricsWidget.opacity = 0;
            this.lyricsWidget.show();

            this.menuImage.ease({
                opacity: 0,
                duration,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.menuImage.hide()
            });

            this.lyricsWidget.ease({
                opacity: 255,
                duration,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });

            this._manageLyricsTimer(true);
            this._fetchLyricsIfNeeded();
        } else {
            this.menuImage.opacity = 0;
            this.menuImage.show();

            this.lyricsWidget.ease({
                opacity: 0,
                duration,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.lyricsWidget.hide()
            });

            this.menuImage.ease({
                opacity: 255,
                duration,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });

            this._manageLyricsTimer(false);
        }
    }

    _manageLyricsTimer(shouldRun) {
        if (shouldRun) {
            if (this._lyricsTimer) return;

            this._lyricsTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                if (!this.isLyricsMode || !this.playerProxy) {
                    this._lyricsTimer = null;
                    return GLib.SOURCE_REMOVE;
                }

                if (this.playerProxy.playbackStatus === PlaybackStatus.PLAYING) {
                    this.playerProxy.position.then(pos => {
                        // MPRIS returns microseconds, convert to Milliseconds
                        if (pos != null && this.lyricsWidget) {
                            this.lyricsWidget.updatePosition(pos / 1000);
                        }
                    }).catch(() => { });
                }
                return GLib.SOURCE_CONTINUE;
            });
        } else {
            if (this._lyricsTimer) {
                GLib.source_remove(this._lyricsTimer);
                this._lyricsTimer = null;
            }
        }
    }

    async _fetchLyricsIfNeeded() {
        const title = this.playerProxy.metadata["xesam:title"];
        const artist = this.playerProxy.metadata["xesam:artist"]?.join(", ");
        const album = this.playerProxy.metadata["xesam:album"];
        const length = this.playerProxy.metadata["mpris:length"] / 1000000;

        const trackId = title + artist;

        /* ---------- SAME SONG CACHE HIT ---------- */
        if (this._currentLyricsTrackId === trackId) {
            if (this._currentLyricsState === 'lyrics') {
                this.lyricsWidget.setLyrics(this._currentLyricsData);
            } else if (this._currentLyricsState === 'empty') {
                this.lyricsWidget.showEmpty();
            }
            return;
        }

        /* ---------- NEW SONG ---------- */
        this._currentLyricsTrackId = trackId;
        this._currentLyricsData = null;
        this._currentLyricsState = null;

        this.lyricsWidget.showLoading();

        const lyrics = await this.lyricsClient.getLyrics(
            title,
            artist,
            album,
            length
        );

        if (lyrics && lyrics.length > 0) {
            this._currentLyricsData = lyrics;
            this._currentLyricsState = 'lyrics';
            this.lyricsWidget.setLyrics(lyrics);
        } else {
            this._currentLyricsData = null;
            this._currentLyricsState = 'empty';
            this.lyricsWidget.showEmpty();
        }
    }


    /* --- HELPERS --- */

    _bindClick(actor, callback) {
        if (typeof Clutter.ClickGesture !== "undefined") {
            const gesture = new Clutter.ClickGesture();
            gesture.set_n_clicks_required(1);
            if (gesture.set_recognize_on_press) gesture.set_recognize_on_press(true);
            gesture.connect("recognize", () => {
                callback();
                return Clutter.EVENT_STOP;
            });
            actor.add_action(gesture);
        } else {
            const action = new Clutter.ClickAction();
            action.connect("clicked", () => callback());
            actor.add_action(action);
        }
    }

    _findChildByName(parent, name) {
        if (!parent) return null;
        return parent.get_children().find(child => child.get_name() === name);
    }

    _destroyChild(propertyName) {
        if (this[propertyName]) {
            if (this[propertyName].get_parent?.()) {
                this[propertyName].get_parent().remove_child(this[propertyName]);
            }
            this[propertyName].destroy();
            this[propertyName] = null;
        }
    }

    _getMenuItemWidth() {
        // @ts-expect-error
        const menuContainer = this.menu.box.get_parent().get_parent();
        const minWidth = menuContainer.get_theme_node().get_min_width() - 100;
        return Math.max(minWidth, this.extension.labelWidth + 100);
    }

    getButtonLabelText() {
        const labelTextElements = [];
        const metadata = this.playerProxy.metadata;

        for (const labelElement of this.extension.labelsOrder) {
            switch (LabelTypes[labelElement]) {
                case LabelTypes.TITLE: labelTextElements.push(metadata["xesam:title"]); break;
                case LabelTypes.ARTIST: labelTextElements.push(metadata["xesam:artist"]?.join(", ") || _("Unknown artist")); break;
                case LabelTypes.ALBUM: labelTextElements.push(metadata["xesam:album"] || _("Unknown album")); break;
                case LabelTypes.DISC_NUMBER: labelTextElements.push(metadata["xesam:discNumber"]); break;
                case LabelTypes.TRACK_NUMBER: labelTextElements.push(metadata["xesam:trackNumber"]); break;
                default: labelTextElements.push(labelElement);
            }
        }
        return labelTextElements.join(" ").replace(/[\r\n]+/g, " ");
    }

    /* --- LISTENERS & ACTIONS --- */

    addProxyListeners() {
        // Mapping properties to widget updates
        const map = {
            "Metadata":
                WidgetFlags.PANEL_LABEL |
                WidgetFlags.MENU_IMAGE |
                WidgetFlags.MENU_LABELS |
                WidgetFlags.MENU_SLIDER,

            "PlaybackStatus":
                WidgetFlags.PANEL_CONTROLS_PLAYPAUSE |
                WidgetFlags.MENU_CONTROLS_PLAYPAUSE,

            "CanPlay":
                WidgetFlags.PANEL_CONTROLS_PLAYPAUSE |
                WidgetFlags.MENU_CONTROLS_PLAYPAUSE,

            "CanPause":
                WidgetFlags.PANEL_CONTROLS_PLAYPAUSE |
                WidgetFlags.MENU_CONTROLS_PLAYPAUSE,

            "CanSeek":
                WidgetFlags.PANEL_CONTROLS_SEEK_FORWARD |
                WidgetFlags.PANEL_CONTROLS_SEEK_BACKWARD,

            "CanGoNext":
                WidgetFlags.PANEL_CONTROLS_NEXT |
                WidgetFlags.MENU_CONTROLS_NEXT,

            "CanGoPrevious":
                WidgetFlags.PANEL_CONTROLS_PREVIOUS |
                WidgetFlags.MENU_CONTROLS_PREV,

            "CanControl":
                WidgetFlags.PANEL_CONTROLS |
                WidgetFlags.MENU_CONTROLS,

            "Shuffle":
                WidgetFlags.MENU_CONTROLS_SHUFFLE,

            "LoopStatus":
                WidgetFlags.MENU_CONTROLS_LOOP,

            "IsPinned":
                WidgetFlags.MENU_PLAYERS
        };

        for (const [evt, flag] of Object.entries(map)) {
            this._addProxyListener(evt, () => {
                this.updateWidgets(flag);

                /* ---------- SONG CHANGE HANDLING ---------- */
                if (evt === "Metadata") {
                    this._currentLyricsTrackId = null;
                    this._currentLyricsData = null;
                    this._currentLyricsState = null;

                    if (this.isLyricsMode) {
                        this._fetchLyricsIfNeeded();
                    }
                }

                /* ---------- PLAY / PAUSE ANIMATIONS ---------- */
                if (evt === "PlaybackStatus") {
                    this._toggleAnimations();
                }
            });
        }

        /* ---------- RATE CHANGE ---------- */
        this._addProxyListener("Rate", () => {
            this.menuSlider?.setRate(this.playerProxy.rate);
        });

        /* ---------- SEEK SYNC ---------- */
        this.playerProxy.onSeeked((position) => {
            // Slider update
            this.menuSlider?.setPosition(position);

            // Lyrics auto-follow (only if visible)
            if (this.isLyricsMode && this.lyricsWidget) {
                // µs → ms
                this.lyricsWidget.updatePosition(position / 1000);
            }
        });
    }


    _toggleAnimations() {
        const isPlaying = this.playerProxy.playbackStatus === PlaybackStatus.PLAYING;

        if (isPlaying) {
            if (!this._lyricsTimer) {
                this._lyricsTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                    if (this.isLyricsMode && this.playerProxy) {
                        this.playerProxy.position.then(pos => {
                            this.lyricsWidget.updatePosition(pos / 1000);
                        }).catch(() => { });
                    }
                    return GLib.SOURCE_CONTINUE;
                });
            }
        } else {
            if (this._lyricsTimer) {
                GLib.source_remove(this._lyricsTimer);
                this._lyricsTimer = null;
            }
        }

        const method = isPlaying ? 'resume' : 'pause';

        this.buttonLabel?.[`${method}Scrolling`]?.();
        this.menuLabelTitle?.[`${method}Scrolling`]?.();
        this.menuLabelSubtitle?.[`${method}Scrolling`]?.();
        this.menuSlider?.[`${method}Transition`]?.();
    }

    removeProxyListeners() {
        for (const [property, id] of this.changeListenerIds.entries()) {
            this.playerProxy.removeListener(property, id);
        }
    }

    _addProxyListener(property, callback) {
        const safeCallback = () => {
            if (this.playerProxy) callback();
        };
        const id = this.playerProxy.onChanged(property, safeCallback);
        this.changeListenerIds.set(property, id);
    }

    initActions() {
        this.connect("button-press-event", (_, event) => {
            const button = event.get_button();
            if (button === Clutter.BUTTON_PRIMARY) {
                this.handleLeftClick();
                return Clutter.EVENT_STOP;
            }
            const action = button === Clutter.BUTTON_MIDDLE ? this.extension.mouseActionMiddle
                : button === Clutter.BUTTON_SECONDARY ? this.extension.mouseActionRight
                    : MouseActions.NONE;

            if (action !== MouseActions.NONE) {
                this.doMouseAction(action);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.connect("touch-event", (_, event) => {
            if (event.type() === Clutter.EventType.TOUCH_BEGIN) {
                this.handleLeftClick();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.connect("scroll-event", (_, event) => {
            const dir = event.get_scroll_direction();
            if (dir === Clutter.ScrollDirection.UP) this.doMouseAction(this.extension.mouseActionScrollUp);
            if (dir === Clutter.ScrollDirection.DOWN) this.doMouseAction(this.extension.mouseActionScrollDown);
            return Clutter.EVENT_STOP;
        });
    }

    handleLeftClick() {
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

    doMouseAction(action) {
        const p = this.playerProxy;
        switch (action) {
            case MouseActions.PLAY_PAUSE: p.playPause(); break;
            case MouseActions.PLAY: p.play(); break;
            case MouseActions.PAUSE: p.pause(); break;
            case MouseActions.NEXT_TRACK: p.next(); break;
            case MouseActions.PREVIOUS_TRACK: p.previous(); break;
            case MouseActions.VOLUME_UP: p.volume = Math.min(p.volume + 0.05, 1); break;
            case MouseActions.VOLUME_DOWN: p.volume = Math.max(p.volume - 0.05, 0); break;
            case MouseActions.TOGGLE_LOOP: p.toggleLoop(); break;
            case MouseActions.TOGGLE_SHUFFLE: p.toggleShuffle(); break;
            case MouseActions.SHOW_POPUP_MENU: this.menu.toggle(); break;
            case MouseActions.RAISE_PLAYER: p.raise(); break;
            case MouseActions.QUIT_PLAYER: p.quit(); break;
            case MouseActions.OPEN_PREFERENCES: this.extension.openPreferences(); break;
        }
    }

    onDestroy() {
        this.removeProxyListeners();
        this.playerProxy = null;

        // Clean up widgets
        this._destroyChild("menuSlider");
        this._destroyChild("menuPlayers");
        this._destroyChild("menuImage");
        this._destroyChild("menuLabels");
        this._destroyChild("menuControls");
        this._destroyChild("buttonIcon");
        this._destroyChild("buttonLabel");
        this._destroyChild("buttonControls");
        this._destroyChild("buttonBox");
        this._destroyChild("menuBox");
        this._currentLyricsTrackId = null;
        this._currentLyricsData = null;
        this._currentLyricsState = null;


        if (this.doubleTapSourceId != null) {
            GLib.source_remove(this.doubleTapSourceId);
            this.doubleTapSourceId = null;
        }
    }
}

export default PanelButton;