import Gio from "gi://Gio";
import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import Pango from "gi://Pango";

import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";

import * as BoxPointer from "resource:///org/gnome/shell/ui/boxpointer.js";

import { createProxy } from "./dbus.js";
import { parseMetadata, stripInstanceNumbers, getRequest, wrappingText, msToHHMMSS } from "./utils.js";

const urlRegexp = new RegExp(
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+~#?&/=]*)/
);

let mouseActionTypes = {
    LEFT_CLICK: 0,
    RIGHT_CLICK: 1,
    MIDDLE_CLICK: 2,
    LEFT_DBL_CLICK: 3,
    RIGHT_DBL_CLICK: 4,
    SCROLL_UP: 5,
    SCROLL_DOWN: 6,
    HOVER: 7,
};

export const Player = GObject.registerClass(
    class Player extends PanelMenu.Button {
        _init(busName, parent) {
            super._init(0.5, "Media Controls Track Information");

            this.busName = busName;
            this._timeoutSourceId = null;
            this._intervalSourceId = null;
            this._scrollSourceId = null;
            this._doubleClick = false;
            this._clicked = false;
            this._extension = parent;

            return (async () => {
                try {
                    this._playerProxy = createProxy(
                        "org.mpris.MediaPlayer2.Player",
                        busName,
                        "/org/mpris/MediaPlayer2"
                    );

                    this._otherProxy = createProxy("org.mpris.MediaPlayer2", busName, "/org/mpris/MediaPlayer2");

                    [this._playerProxy, this._otherProxy] = await Promise.all([this._playerProxy, this._otherProxy]);

                    this._metadata = parseMetadata(this._playerProxy.Metadata);
                    this._status = this._playerProxy.PlaybackStatus;

                    this._playerProxy.connect("g-properties-changed", this._playerPropsChanged.bind(this));
                    this._otherProxy.connect("g-properties-changed", this._otherPropsChanged.bind(this));

                    this.menu.connect("open-state-changed", this._menuOpenStateChanged.bind(this));

                    this._saveImage();
                } catch (error) {
                    logError(error);
                }

                return this;
            })();
        }

        initWidgets() {
            // Title/artist and separators

            this.labelTitle = new St.Label({
                text: this.label || "No track",
                y_align: Clutter.ActorAlign.CENTER,
                style: "text-align: center;",
                style_class: "no-spacing",
            });

            this.dummyLabelTitle = new St.Label({
                text: this.label || "No track",
                y_align: Clutter.ActorAlign.CENTER,
            });

            this.dummyLabelTitle.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

            this.labelSeperatorStart = new St.Label({
                text: this._extension.sepChars[0],
                style: "padding: 0px 3px 0px 0px; margin: 0px;",
                y_align: Clutter.ActorAlign.CENTER,
            });

            this.labelSeperatorEnd = new St.Label({
                text: this._extension.sepChars[1],
                style: "padding: 0px 0px 0px 3px; margin: 0px;",
                y_align: Clutter.ActorAlign.CENTER,
            });

            this.subContainerLabel = new St.BoxLayout({
                style_class: "no-spacing",
            });

            this.subContainerLabel.add(this.dummyLabelTitle);
            this.dummyLabelTitle.hide();

            this.containerButtonLabel = new St.Bin({
                style_class: "panel-button",
                style: "padding: 0px 5px; margin: 0px;",
            });

            this.containerButtonLabel.set_child(this.subContainerLabel);

            // Player icon

            this.buttonPlayer = new St.Bin({
                style_class: "popup-menu-button",
                style: "padding: 0px 5px; margin: 0px;",
            });

            this.iconPlayer = new St.Icon({
                fallback_icon_name: "audio-x-generic",
                icon_name: this.icon,
                style_class: "system-status-icon",
            });

            this.buttonPlayer.set_child(this.iconPlayer);

            // Player controls

            this.iconSeekBack = new St.Icon({
                icon_name: "media-seek-backward-symbolic",
                style_class: "system-status-icon",
            });
            this.iconPrev = new St.Icon({
                icon_name: "media-skip-backward-symbolic",
                style_class: "system-status-icon",
            });
            this.iconPlayPause = new St.Icon({
                icon_name: this.isPlaying ? "media-playback-pause-symbolic" : "media-playback-start-symbolic",
                style_class: "system-status-icon",
            });
            this.iconNext = new St.Icon({
                icon_name: "media-skip-forward-symbolic",
                style_class: "system-status-icon",
            });
            this.iconSeekForward = new St.Icon({
                icon_name: "media-seek-forward-symbolic",
                style_class: "system-status-icon",
            });

            this.buttonSeekBack = new St.Button({
                style_class: "panel-button no-spacing",
            });
            this.buttonPrev = new St.Button({
                style_class: "panel-button no-spacing",
            });
            this.buttonPlayPause = new St.Button({
                style_class: "panel-button no-spacing",
            });
            this.buttonNext = new St.Button({
                style_class: "panel-button no-spacing",
            });
            this.buttonSeekForward = new St.Button({
                style_class: "panel-button no-spacing",
            });

            this.buttonSeekBack.connect("button-release-event", () => {
                this._seekBack();
            });

            this.buttonPrev.connect("button-release-event", () => {
                this._playerProxy.PreviousRemote();
            });

            this.buttonPlayPause.connect("button-release-event", () => {
                this._playerProxy.PlayPauseRemote();
            });

            this.buttonNext.connect("button-release-event", () => {
                this._playerProxy.NextRemote();
            });

            this.buttonSeekForward.connect("button-release-event", () => {
                this._seekForward();
            });

            this.buttonSeekBack.connect("touch-event", () => {
                this._seekBack();
            });

            this.buttonPrev.connect("touch-event", () => {
                this._playerProxy.PreviousRemote();
            });

            this.buttonPlayPause.connect("touch-event", () => {
                this._playerProxy.PlayPauseRemote();
            });

            this.buttonNext.connect("touch-event", () => {
                this._playerProxy.NextRemote();
            });

            this.buttonSeekForward.connect("touch-event", () => {
                this._seekForward();
            });

            this.buttonSeekBack.set_child(this.iconSeekBack);
            this.buttonNext.set_child(this.iconNext);
            this.buttonPlayPause.set_child(this.iconPlayPause);
            this.buttonPrev.set_child(this.iconPrev);
            this.buttonSeekForward.set_child(this.iconSeekForward);

            this.containerControls = new St.BoxLayout({
                style_class: "no-spacing",
            });

            // Sources dropdown button
            this.buttonMenu = new St.Button({
                style_class: "popup-menu-button",
            });

            this.buttonMenu.set_child(PopupMenu.arrowIcon(St.Side.BOTTOM));

            this.buttonMenu.connect("button-release-event", () => {
                this._extension.menu.toggle();
            });

            this.buttonMenu.connect("touch-event", () => {
                this._extension.menu.toggle();
            });

            this.dummyContainer = new St.BoxLayout();
            this.add_style_class_name("no-spacing");
            this.add_child(this.dummyContainer);

            this._addInfoMenuItems();
            this._updateLoopIcon();
            this._updateShuffleIcon();
            this._addScrollingTimer();

            this.updateWidgetWidths();
            this.updateIconEffects();
        }

        _menuOpenStateChanged(menu, open) {
            this._updatePosition(null, open);
        }

        // Not taking rate into account
        _updatePosition(_, open) {
            if (!this.infoSlider) return;

            if (open) {
                const length = this._metadata.length;
                this.infoTt.set_text(msToHHMMSS(length));

                const timerFunc = () => {
                    const position = this._getPosition();

                    this.infoSlider.value = position / length;
                    this.infoEt.set_text(msToHHMMSS(position));

                    return GLib.SOURCE_CONTINUE;
                };

                timerFunc();

                this._intervalSourceId = GLib.timeout_add(GLib.PRIORITY_LOW, 1000, timerFunc);
            } else if (this._intervalSourceId) {
                GLib.Source.remove(this._intervalSourceId);
                this._intervalSourceId = null;
            }
        }

        _handleSliderDragEnd(event) {
            this._setPosition(event._value * this._metadata.length);
        }

        _getPosition() {
            try {
                const position = this._playerProxy
                    .get_connection()
                    .call_sync(
                        this.busName,
                        "/org/mpris/MediaPlayer2",
                        "org.freedesktop.DBus.Properties",
                        "Get",
                        new GLib.Variant("(ss)", ["org.mpris.MediaPlayer2.Player", "Position"]),
                        null,
                        Gio.DBusCallFlags.NONE,
                        -1,
                        null
                    );

                if (position instanceof GLib.Variant) {
                    return position.recursiveUnpack()[0];
                } else {
                    return undefined;
                }
            } catch (error) {
                return undefined;
            }
        }

        _setPosition(position) {
            this._playerProxy.SetPositionRemote(this._metadata.trackid, position);
        }

        _seekBack() {
            const offset = this._extension.seekInterval * 1_000_000;

            if (this._extension.preferNativeSeek) {
                this._playerProxy.SeekRemote(-offset);
            } else {
                const position = this._getPosition();
                const metadata = parseMetadata(this._playerProxy.Metadata);

                if (position !== undefined && metadata !== undefined && metadata.trackid !== undefined) {
                    const newPosition = Math.max(position - offset, 0);
                    this._playerProxy.SetPositionRemote(metadata.trackid, newPosition);
                }
            }
        }

        _seekForward() {
            const offset = this._extension.seekInterval * 1_000_000;

            if (this._extension.preferNativeSeek) {
                this._playerProxy.SeekRemote(offset);
            } else {
                const position = this._getPosition();
                const metadata = parseMetadata(this._playerProxy.Metadata);

                if (position !== undefined && metadata !== undefined && metadata.trackid !== undefined) {
                    const newPosition = Math.min(position + offset, metadata.length);
                    this._playerProxy.setPositionRemote(metadata.trackid, newPosition);
                }
            }
        }

        _playerPropsChanged(proxy, changed, invalidated) {
            changed = changed.recursiveUnpack();

            if (changed.Metadata) {
                this._metadata = parseMetadata(changed.Metadata);
                if (this._metadata["title"]) {
                    if (this.hidden) {
                        this._extension.unhidePlayer(this.busName);
                    }

                    this.updateWidgets();
                    this._saveImage();
                } else {
                    this._extension.hidePlayer(this.busName);
                }
            }

            if (changed.PlaybackStatus) {
                this._status = changed.PlaybackStatus;
                if (this.isPlaying && !this._extension.isFixedPlayer && !this._active) {
                    this._extension.updatePlayer(this.busName);
                }

                this._updateStatusIcons();
            }

            if (changed.LoopStatus) {
                this._updateLoopIcon();
            }

            if (changed.Shuffle !== undefined) {
                this._updateShuffleIcon();
            }
        }

        _otherPropsChanged(proxy, changed, invalidated) {
            changed = changed.recursiveUnpack();
            if (changed.Identity) {
                this.infoMenuPlayerIcon.set_icon_name(this.icon);
                this.iconPlayer.set_icon_name(this.icon);
                this.infoMenuPlayerName.set_text(this.name);
            }
        }

        _widthToPos(text, width) {
            this.dummyLabelTitle.set_text(text);
            return this.dummyLabelTitle.clutter_text.coords_to_position(width, 0);
        }

        _addScrollingTimer() {
            if (this._scrollSourceId) {
                GLib.Source.remove(this._scrollSourceId);
            }
            if (!this._extension.scrolltracklabel) {
                return false;
            }

            const maxWidgetWidth = this._extension.maxWidgetWidth;
            const labelLength = this.label.length;
            const duplicatedLabel = `${this.label} ${this.label}`;
            let offset = 0;

            this._scrollSourceId = GLib.timeout_add(GLib.PRIORITY_LOW, 250, () => {
                if (!this.isPlaying) {
                    return GLib.SOURCE_CONTINUE;
                }

                if (offset === labelLength) {
                    offset = 0;
                }

                const labelMaxPos = this._widthToPos(duplicatedLabel.slice(offset), maxWidgetWidth);
                const endOffset = offset + labelMaxPos;

                let newLabel = this.label.slice(offset, Math.min(labelLength, endOffset));

                if (endOffset >= labelLength) {
                    const extraOffset = endOffset - labelLength;
                    const extraLabel = this.label.slice(0, extraOffset);

                    newLabel += " ";
                    newLabel += extraLabel;
                }

                this.labelTitle.set_text(newLabel);

                offset++;

                return GLib.SOURCE_CONTINUE;
            });
        }

        updateWidgets() {
            if (this.iconPlayer) {
                this.iconPlayer.set_icon_name(this.icon);
                this.labelTitle.set_text(this.label);

                this._addScrollingTimer();
                this._updateStatusIcons();
            }

            if (this.menuItem) {
                this._menuIcon.set_gicon(this.trackIcon);
                this._menuLabel.set_text(this.label);
            }

            if (this._infoItem) {
                this._infoIcon.set_gicon(this.trackIcon);
                this.infoTitleLabel.set_text(this.title);
                this.infoArtistLabel.set_text(this.artist);

                this._updateInfoIcon();
            }
        }

        _updateStatusIcons() {
            if (this.iconPlayPause) {
                this.iconPlayPause.set_icon_name(
                    this.isPlaying ? "media-playback-pause-symbolic" : "media-playback-start-symbolic"
                );
            }
            if (this.infoIconPlayPause) {
                this.infoIconPlayPause.set_icon_name(
                    this.isPlaying ? "media-playback-pause-symbolic" : "media-playback-start-symbolic"
                );
            }
        }

        _updateLoopIcon() {
            if (this._playerProxy.LoopStatus) {
                switch (this._playerProxy.LoopStatus) {
                    case "None":
                        this.infoIconLoop.set_icon_name("media-playlist-consecutive-symbolic");
                        this.infoButtonLoop.remove_style_class_name("popup-menu-button-active");
                        break;
                    case "Track":
                        this.infoIconLoop.set_icon_name("media-playlist-repeat-song-symbolic");
                        this.infoButtonLoop.add_style_class_name("popup-menu-button-active");
                        break;
                    case "Playlist":
                        this.infoIconLoop.set_icon_name("media-playlist-repeat-symbolic");
                        this.infoButtonLoop.add_style_class_name("popup-menu-button-active");
                        break;
                    default:
                        break;
                }
            } else {
                this.infoButtonLoop.set_reactive(false);
                this.infoButtonLoop.remove_style_class_name("popup-menu-button-active");
            }
        }

        _updateShuffleIcon() {
            if (this._playerProxy.Shuffle === true) {
                this.infoShuffleButton.add_style_class_name("popup-menu-button-active");
            } else if (this._playerProxy.Shuffle === false) {
                this.infoShuffleButton.remove_style_class_name("popup-menu-button-active");
            } else {
                this.infoShuffleButton.set_reactive(false);
            }
        }

        _updateInfoIcon() {
            const iconSize = Math.max(200, this.infoTitleLabel.width, this.infoArtistLabel.width);
            this._infoIcon.set_icon_size(iconSize);
        }

        updateWidgetWidths() {
            if (this.labelTitle) {
                this.labelTitle.width = this._extension.maxWidgetWidth;
            }

            if (this.menuItem) {
                this._menuLabel.set_style(this.maxWidthStyle);
            }

            if (this._infoItem) {
                this.infoArtistLabel.set_style(this.maxWidthStyle);
                this.infoTitleLabel.set_style(`font-size: large; ${this.maxWidthStyle}`);

                wrappingText(!this._extension.settings.cliptextsmenu, this.infoTitleLabel);
                wrappingText(!this._extension.settings.cliptextsmenu, this.infoArtistLabel);

                if (this._extension.maxWidgetWidth !== 0) {
                    this._infoIcon.set_icon_size(this._extension.maxWidgetWidth);
                } else {
                    this._updateInfoIcon();
                }
            }
        }

        updateIconEffects() {
            if (this._extension.coloredPlayerIcon) {
                this.iconPlayer.clear_effects();
                this.iconPlayer.set_style("margin: 0px; padding: 0px; -st-icon-style: requested;");
                this.iconPlayer.set_fallback_icon_name("audio-x-generic");

                this.infoMenuPlayerIcon.clear_effects();
                this.infoMenuPlayerIcon.set_style("-st-icon-style: requested; padding-right: 6px;");
                this.infoMenuPlayerIcon.set_fallback_icon_name("audio-x-generic");
            } else {
                this.iconPlayer.set_style("margin: 0px; padding: 0px; -st-icon-style: symbolic;");
                this.iconPlayer.add_effect(new Clutter.DesaturateEffect());
                this.iconPlayer.set_fallback_icon_name("audio-x-generic-symbolic");

                this.infoMenuPlayerIcon.set_style("-st-icon-style: symbolic;  padding-right: 6px;");
                this.infoMenuPlayerIcon.add_effect(new Clutter.DesaturateEffect());
                this.infoMenuPlayerIcon.set_fallback_icon_name("audio-x-generic-symbolic");
            }
        }

        _addInfoMenuItems() {
            if (!this._infoItem) {
                this._infoItem = new PopupMenu.PopupBaseMenuItem({
                    activate: false,
                    style_class: "info-item",
                });

                this._infoItem.remove_style_class_name("popup-menu-item");
                this._infoItem.remove_child(this._infoItem._ornamentIcon);

                this._infoItem.set_track_hover(false);
                this._infoItem.set_vertical(true);

                // Player icon and name

                const playerIconLabelContainer = new St.BoxLayout({
                    x_align: Clutter.ActorAlign.CENTER,
                    reactive: false,
                });

                this.infoMenuPlayerIcon = new St.Icon({
                    icon_name: this.icon,
                    fallback_icon_name: "audio-x-generic-symbolic",
                    style_class: "popup-menu-icon",
                    style: "padding-right:6px;",
                    y_align: Clutter.ActorAlign.CENTER,
                });

                playerIconLabelContainer.add(this.infoMenuPlayerIcon);

                this.infoMenuPlayerName = new St.Label({
                    text: this._otherProxy.Identity,
                    y_align: Clutter.ActorAlign.CENTER,
                    style: "font-size: small;",
                });

                playerIconLabelContainer.add(this.infoMenuPlayerName);

                this._infoItem.add(playerIconLabelContainer);

                // Seperator

                const separator = new PopupMenu.PopupSeparatorMenuItem();
                this._infoItem.add(separator);

                // Album art

                this._infoIcon = new St.Icon({
                    gicon: this.trackIcon,
                    style: "padding-bottom: 10px;",
                });

                this._infoItem.add(this._infoIcon);

                // Track title and artist

                this.infoTitleLabel = new St.Label({
                    text: this.title,
                    x_align: Clutter.ActorAlign.CENTER,
                    style: "font-size: large;",
                });

                this.infoArtistLabel = new St.Label({
                    text: this.artist || "",
                    x_align: Clutter.ActorAlign.CENTER,
                });

                this._infoItem.add(this.infoTitleLabel);
                this._infoItem.add(this.infoArtistLabel);

                // Spacer

                const spacer = new St.BoxLayout({
                    style: "padding-top: 10px;",
                });
                this._infoItem.add(spacer);

                if (this._getPosition() !== undefined) {
                    // Elapsed time and total time

                    const rtttContainer = new St.BoxLayout();

                    this.infoEt = new St.Label({
                        text: "00:00",
                        x_expand: true,
                        x_align: Clutter.ActorAlign.START,
                        style: "font-size: small;",
                    });
                    this.infoTt = new St.Label({
                        text: "00:00",
                        x_expand: true,
                        x_align: Clutter.ActorAlign.END,
                        style: "font-size: small;",
                    });

                    rtttContainer.add(this.infoEt);
                    rtttContainer.add(this.infoTt);

                    this._infoItem.add(rtttContainer);

                    // Slider

                    const sliderContainer = new PopupMenu.PopupBaseMenuItem({
                        activate: false,
                    });

                    sliderContainer.remove_style_class_name("popup-menu-item");
                    sliderContainer.set_track_hover(false);

                    this.infoSlider = new Slider.Slider(1);

                    this.infoSlider.connect("drag-end", this._handleSliderDragEnd.bind(this));

                    sliderContainer.add(this.infoSlider);

                    sliderContainer._ornamentLabel.remove_style_class_name("popup-menu-ornament");

                    this._infoItem.add(sliderContainer);
                }

                // Controls

                // Play/pause button

                const mainControlButtons = new St.BoxLayout({
                    x_align: Clutter.ActorAlign.FILL,
                    style: "padding-top: 10px;",
                });

                this.infoIconLoop = new St.Icon({
                    icon_name: "media-playlist-repeat-symbolic",
                    style_class: "popup-menu-icon",
                });

                this.infoButtonLoop = new St.Button({
                    x_align: Clutter.ActorAlign.START,
                    x_expand: true,
                    style_class: "popup-menu-button",
                });

                this.infoButtonLoop.connect("button-press-event", this._changeLoop.bind(this));
                this.infoButtonLoop.connect("touch-event", this._changeLoop.bind(this));

                this.infoButtonLoop.set_child(this.infoIconLoop);

                mainControlButtons.add(this.infoButtonLoop);

                this.infoIconPlayPause = new St.Icon({
                    icon_name: this.isPlaying ? "media-playback-pause-symbolic" : "media-playback-start-symbolic",
                    style_class: "popup-menu-icon",
                });

                const buttonPlayPause = new St.Button({
                    style_class: "popup-menu-button",
                });

                buttonPlayPause.connect("button-press-event", () => {
                    this._playerProxy.PlayPauseRemote();
                });

                buttonPlayPause.connect("touch-event", () => {
                    this._playerProxy.PlayPauseRemote();
                });

                buttonPlayPause.set_child(this.infoIconPlayPause);

                const buttonPrev = new St.Button({
                    style_class: "popup-menu-button",
                });

                buttonPrev.connect("button-press-event", () => {
                    this._playerProxy.PreviousRemote();
                });

                buttonPrev.connect("touch-event", () => {
                    this._playerProxy.PreviousRemote();
                });

                buttonPrev.set_child(
                    new St.Icon({
                        icon_name: "media-skip-backward-symbolic",
                        style_class: "popup-menu-icon",
                    })
                );

                const buttonNext = new St.Button({
                    style_class: "popup-menu-button",
                });

                buttonNext.connect("button-press-event", () => {
                    this._playerProxy.NextRemote();
                });

                buttonNext.connect("touch-event", () => {
                    this._playerProxy.NextRemote();
                });

                buttonNext.set_child(
                    new St.Icon({
                        icon_name: "media-skip-forward-symbolic",
                        style_class: "popup-menu-icon",
                    })
                );

                const buttonSeekBack = new St.Button({
                    style_class: "popup-menu-button",
                });

                buttonSeekBack.connect("button-release-event", () => {
                    this._seekBack();
                });
                buttonSeekBack.connect("touch-event", () => {
                    this._seekBack();
                });

                buttonSeekBack.set_child(
                    new St.Icon({
                        icon_name: "media-seek-backward-symbolic",
                        style_class: "popup-menu-icon",
                    })
                );

                const buttonSeekForward = new St.Button({
                    style_class: "popup-menu-button",
                });

                buttonSeekForward.connect("button-release-event", () => {
                    this._seekForward();
                });

                buttonSeekForward.connect("touch-event", () => {
                    this._seekForward();
                });

                buttonSeekForward.set_child(
                    new St.Icon({
                        icon_name: "media-seek-forward-symbolic",
                        style_class: "popup-menu-icon",
                    })
                );

                mainControlButtons.add(buttonSeekBack);
                mainControlButtons.add(buttonPrev);
                mainControlButtons.add(buttonPlayPause);
                mainControlButtons.add(buttonNext);
                mainControlButtons.add(buttonSeekForward);

                this.infoShuffleIcon = new St.Icon({
                    icon_name: "media-playlist-shuffle-symbolic",
                    style_class: "popup-menu-icon",
                });

                this.infoShuffleButton = new St.Button({
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                    style_class: "popup-menu-button",
                });

                this.infoShuffleButton.connect("button-press-event", this._toggleShuffle.bind(this));
                this.infoShuffleButton.connect("touch-event", this._toggleShuffle.bind(this));

                this.infoShuffleButton.set_child(this.infoShuffleIcon);

                mainControlButtons.add(this.infoShuffleButton);

                this._infoItem.add(mainControlButtons);

                this.menu.addMenuItem(this._infoItem);
            }
        }

        _toggleShuffle() {
            if (typeof this._playerProxy.Shuffle === "boolean") {
                this._playerProxy.Shuffle = !this._playerProxy.Shuffle;
            }
        }

        _changeLoop() {
            switch (this._playerProxy.LoopStatus) {
                case "None":
                    this._playerProxy.LoopStatus = "Track";
                    break;
                case "Track":
                    this._playerProxy.LoopStatus = "Playlist";
                    break;
                case "Playlist":
                    this._playerProxy.LoopStatus = "None";
                    break;
            }
        }

        async _saveImage() {
            if (this._extension.cacheImages) {
                try {
                    if (urlRegexp.test(this.image)) {
                        const destination = GLib.build_filenamev([
                            this._extension.dataDir,
                            "media-controls",
                            "cache",
                            GLib.base64_encode(this.image),
                        ]);
                        const cacheFile = Gio.File.new_for_path(destination);
                        if (!cacheFile.query_exists(null)) {
                            const remoteIcon = await getRequest(this.image);
                            if (GLib.mkdir_with_parents(cacheFile.get_parent().get_path(), 0o744) === 0) {
                                cacheFile.replace_contents_bytes_async(
                                    remoteIcon,
                                    null,
                                    false,
                                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                                    null,
                                    null
                                );
                            } else {
                                throw new Error("Failed to save icon.");
                            }
                        }
                    }
                } catch (error) {
                    logError(error);
                }
            }
        }

        _getImage() {
            try {
                let destination = GLib.build_filenamev([
                    this._extension.dataDir,
                    "media-controls",
                    "cache",
                    GLib.base64_encode(this.image),
                ]);
                let cacheFile = Gio.File.new_for_path(destination);
                let [success, contents] = cacheFile.load_contents(null);
                if (success) {
                    return Gio.BytesIcon.new(contents);
                } else {
                    return null;
                }
            } catch (error) {
                return null;
            }
        }

        _mouseAction(index) {
            switch (this._extension.mouseActions[index]) {
                case "toggle_play":
                    this._playerProxy.PlayPauseRemote();
                    break;
                case "next":
                    this._playerProxy.NextRemote();
                    break;
                case "previous":
                    this._playerProxy.PreviousRemote();
                    break;
                case "play":
                    this._playerProxy.PlayRemote();
                    break;
                case "pause":
                    this._playerProxy.PauseRemote();
                    break;
                case "volume_up":
                    this._playerProxy.Volume = Math.min(this._playerProxy.Volume + 0.05, 1);
                    break;
                case "volume_down":
                    this._playerProxy.Volume = Math.max(this._playerProxy.Volume - 0.05, 0);
                    break;
                case "toggle_menu":
                    this.menu.close(BoxPointer.PopupAnimation.FULL);
                    this._extension.menu.toggle();
                    break;
                case "toggle_info":
                    this._extension.menu.close(BoxPointer.PopupAnimation.FULL);
                    this.menu.toggle();
                    break;
                case "toggle_loop":
                    this._changeLoop();
                    break;
                case "toggle_shuffle":
                    this._toggleShuffle();
                    break;
                case "raise":
                    this._otherProxy.RaiseRemote();
                    break;
                case "quit":
                    this._otherProxy.QuitRemote();
                    break;
                default:
                    break;
            }
        }

        _mouseActionButton(widget, event) {
            let button = event.get_button();
            if (!this._clicked) {
                this._timeoutSourceId = GLib.timeout_add(
                    GLib.PRIORITY_HIGH,
                    this._extension.clutterSettings.double_click_time,
                    () => {
                        if (!this._doubleClick) {
                            if (button === 1) {
                                this._mouseAction(mouseActionTypes.LEFT_CLICK);
                            } else if (button === 2) {
                                this._mouseAction(mouseActionTypes.MIDDLE_CLICK);
                            } else if (button === 3) {
                                this._mouseAction(mouseActionTypes.RIGHT_CLICK);
                            }
                        }
                        this._doubleClick = false;
                        this._clicked = false;
                        return GLib.SOURCE_REMOVE;
                    }
                );
            } else {
                this._doubleClick = true;
                if (button === 1) {
                    this._mouseAction(mouseActionTypes.LEFT_DBL_CLICK);
                } else if (button === 3) {
                    this._mouseAction(mouseActionTypes.RIGHT_DBL_CLICK);
                }
                this._clicked = false;
                return;
            }

            this._clicked = true;
        }

        _mouseActionScroll(widget, event) {
            if (event.get_scroll_direction() === Clutter.ScrollDirection.UP) {
                this._mouseAction(mouseActionTypes.SCROLL_UP);
            } else if (event.get_scroll_direction() === Clutter.ScrollDirection.DOWN) {
                this._mouseAction(mouseActionTypes.SCROLL_DOWN);
            }
        }

        _mouseActionHover() {
            this._mouseAction(mouseActionTypes.HOVER);
        }

        destroy() {
            if (this._timeoutSourceId) {
                GLib.Source.remove(this._timeoutSourceId);
                this._timeoutSourceId = null;
            }

            if (this._intervalSourceId) {
                GLib.Source.remove(this._intervalSourceId);
                this._intervalSourceId = null;
            }

            if (this._scrollSourceId) {
                GLib.Source.remove(this._scrollSourceId);
                this._scrollSourceId = null;
            }

            this._extension = null;
            this._playerProxy = null;
            this._otherProxy = null;
            this._doubleClick = null;
            this._clicked = null;
            super.destroy();
        }

        vfunc_event(event) {
            if (
                event.type() === Clutter.EventType.BUTTON_PRESS ||
                event.type() === Clutter.EventType.TOUCH_BEGIN ||
                event.type() === Clutter.EventType.KEY_PRESS
            ) {
                this._mouseActionButton(this, event);
            }

            if (event.type() === Clutter.EventType.SCROLL) {
                this._mouseActionScroll(this, event);
            }

            if (event.type() === Clutter.EventType.ENTER) {
                this._mouseActionHover();
            }

            return Clutter.EVENT_PROPAGATE;
        }

        get menuItem() {
            if (!this._menuItem) {
                this._menuItem = new PopupMenu.PopupBaseMenuItem();

                this._menuIcon = new St.Icon({
                    gicon: this.trackIcon,
                    style_class: "popup-menu-icon",
                });

                this._menuLabel = new St.Label({
                    text: this.label,
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                    style: this.maxWidthStyle,
                });

                this._menuCloseButton = new St.Button({
                    child: new St.Icon({
                        icon_name: "user-trash-symbolic",
                        style_class: "popup-menu-icon",
                    }),
                    style_class: "popup-menu-button",
                    x_align: Clutter.ActorAlign.END,
                    x_expand: true,
                });

                this._menuItem.busName = this.busName;
                this._menuItem.closeButton = this._menuCloseButton;

                this._menuItem.add(this._menuIcon);
                this._menuItem.add(this._menuLabel);
                this._menuItem.add(this._menuCloseButton);
            }

            return this._menuItem;
        }

        get trackIcon() {
            return this._getImage() || Gio.icon_new_for_string(this.image || "audio-x-generic-symbolic");
        }

        get isPlaying() {
            return this._status === "Playing";
        }

        get maxWidthStyle() {
            let maxWidth = this._extension.maxWidgetWidth;

            if (maxWidth !== 0) {
                maxWidth = `max-width: ${maxWidth}px;`;
            } else {
                maxWidth = "max-width: none;";
            }

            return maxWidth;
        }

        get icon() {
            let icon;

            if (this._otherProxy.DesktopEntry) {
                icon = this._otherProxy.DesktopEntry;
            } else {
                icon = this.name.toLowerCase().split(" ");
                icon = icon[icon.length - 1];
            }
            if (!icon.includes(".")) {
                let appsys = Shell.AppSystem.get_default();
                for (let app of appsys.get_running()) {
                    if (app.get_name().toLowerCase().includes(icon)) {
                        icon = app.get_id().replace(".desktop", "");
                    }
                }
            }
            return icon;
        }

        get label() {
            let label = "";

            let labelEls = {
                track: this.title,
                artist: this.artist === "Unknown artist" ? null : this.artist,
                url: this.url,
                name: this.name,
                status: this._status,
                file: this.file,
                none: null,
            };

            let trackLabelSetting = this._extension.trackLabel;

            let startLabel = labelEls[trackLabelSetting[0]] || "";
            let endLabel = labelEls[trackLabelSetting[2]] || "";
            let sepLabel = trackLabelSetting[1];

            if (!(startLabel && endLabel)) {
                sepLabel = "";
            } else if (!sepLabel) {
                sepLabel = " ";
            } else {
                sepLabel = ` ${sepLabel} `;
            }

            label = startLabel + sepLabel + endLabel;

            return label;
        }

        get name() {
            if (!this._strippedName) {
                this._strippedName = stripInstanceNumbers(this.busName).replace("org.mpris.MediaPlayer2.", "");
                this._strippedName = this._strippedName.charAt(0).toUpperCase() + this._strippedName.substr(1);
            }

            return this._otherProxy?.Identity || this._strippedName;
        }

        get title() {
            return this._metadata["title"] || "No track";
        }

        get artist() {
            let artist = this._metadata["artist"];
            return (Array.isArray(artist) ? artist.join(", ") : artist) || "Unknown artist";
        }

        get image() {
            return this._metadata["image"];
        }

        get url() {
            return this._metadata["url"];
        }

        get file() {
            let file = this._metadata["url"];

            if (file && urlRegexp.test(file)) {
                if (file.includes("file:")) {
                    file = file.split("/");
                    file = file[file.length - 1];
                } else {
                    file = null;
                }
            } else {
                file = null;
            }

            return file;
        }

        set active(active) {
            this._active = active;
            if (active) {
                this.menuItem.add_style_class_name("selected");
                this.menuItem.track_hover = false;
            } else {
                this.menuItem.remove_style_class_name("selected");
                this.menuItem.track_hover = true;
            }
        }
    }
);
