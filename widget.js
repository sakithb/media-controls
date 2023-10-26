/**
 * Main entry point of the extension
 * Contains the main class of the extension
 */
import { createProxy } from "./dbus.js";
import { Player } from "./player.js";

import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Clutter from "gi://Clutter";
import Shell from "gi://Shell";
import Meta from "gi://Meta";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as BoxPointer from "resource:///org/gnome/shell/ui/boxpointer.js";
import * as Mpris from "resource:///org/gnome/shell/ui/mpris.js";

export const MediaControls = GObject.registerClass(
    class MediaControls extends PanelMenu.Button {
        _init() {
            super._init(0.5, "Media Controls Extension");
            this.setSensitive(false);

            this.isFixedPlayer = false;
            this._players = {};

            this.dataDir = GLib.get_user_config_dir();
        }

        connectSignals() {
            this._onMaxWidgetWidthChanged = this._settings.connect("changed::max-widget-width", () => {
                this.maxWidgetWidth = this._settings.get_int("max-widget-width");
                this.player.updateWidgets();
            });

            this._onUpdateDelayChanged = this._settings.connect("changed::update-delay", () => {
                this.updateDelay = this._settings.get_int("update-delay");
            });

            this._onShowTrackNameChanged = this._settings.connect("changed::show-text", () => {
                this.showTrackName = this._settings.get_boolean("show-text");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowPlayerIconChanged = this._settings.connect("changed::show-player-icon", () => {
                this.showPlayerIcon = this._settings.get_boolean("show-player-icon");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowControlsChanged = this._settings.connect("changed::show-control-icons", () => {
                this.showControls = this._settings.get_boolean("show-control-icons");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowSeperatorsChanged = this._settings.connect("changed::show-seperators", () => {
                this.showSeperators = this._settings.get_boolean("show-seperators");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowPlayPauseButtonChanged = this._settings.connect("changed::show-playpause-icon", () => {
                this.showPlayPauseButton = this._settings.get_boolean("show-playpause-icon");
                this.removeWidgets();
                this.addWidgets();
            });
            this._onShowPrevButtonChanged = this._settings.connect("changed::show-prev-icon", () => {
                this.showPrevButton = this._settings.get_boolean("show-prev-icon");
                this.removeWidgets();
                this.addWidgets();
            });
            this._onShowNextButtonChanged = this._settings.connect("changed::show-next-icon", () => {
                this.showNextButton = this._settings.get_boolean("show-next-icon");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onSeekIntervalChanged = this._settings.connect("changed::seek-interval-secs", () => {
                this.seekInterval = this._settings.get_int("seek-interval-secs");
            });

            this._onPreferSeekChanged = this._settings.connect("changed::prefer-using-seek", () => {
                this.preferNativeSeek = this._settings.get_boolean("prefer-using-seek");
            });

            this._onShowSeekBackChanged = this._settings.connect("changed::show-seek-back", () => {
                this.showSeekBack = this._settings.get_boolean("show-seek-back");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowSeekForwardChanged = this._settings.connect("changed::show-seek-forward", () => {
                this.showSeekForward = this._settings.get_boolean("show-seek-forward");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onShowMenuChanged = this._settings.connect("changed::show-sources-menu", () => {
                this.showMenu = this._settings.get_boolean("show-sources-menu");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onExtensionPositionChanged = this._settings.connect("changed::extension-position", () => {
                this.removeWidgets();
                this.extensionPosition = this._settings.get_string("extension-position");
                this.addWidgets();
            });

            this._onExtensionIndexChanged = this._settings.connect("changed::extension-index", () => {
                this.extensionIndex = this._settings.get_int("extension-index");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onColoredPlayerIconChanged = this._settings.connect("changed::colored-player-icon", () => {
                this.coloredPlayerIcon = this._settings.get_boolean("colored-player-icon");
                this.player.updateIconEffects();
            });

            this._onSepCharsChanged = this._settings.connect("changed::seperator-chars", () => {
                this.sepChars = this._settings.get_strv("seperator-chars");
                this.player.labelSeperatorStart.set_text(this.sepChars[0]);
                this.player.labelSeperatorEnd.set_text(this.sepChars[1]);
            });

            this._onMouseActionsChanged = this._settings.connect("changed::mouse-actions", () => {
                this.mouseActions = this._settings.get_strv("mouse-actions");
            });

            this._onElementOrderChanged = this._settings.connect("changed::element-order", () => {
                this.elementOrder = this._settings.get_strv("element-order");
                this.removeWidgets();
                this.addWidgets();
            });

            this._onTrackLabelChanged = this._settings.connect("changed::track-label", () => {
                this.trackLabel = this._settings.get_strv("track-label");
                this.player.updateWidgets();
            });

            this._onCacheImagesChanged = this._settings.connect("changed::cache-images", () => {
                this.cacheImages = this._settings.get_boolean("cache-images");
            });

            this._onBacklistAppsChanged = this._settings.connect("changed::backlist-apps", () => {
                this.blacklistApps = this._settings.get_strv("backlist-apps");
            });

            this._onHideMediaNotificationChanged = this._settings.connect("changed::hide-media-notification", () => {
                this.hideMediaNotification = this._settings.get_boolean("hide-media-notification");

                this.updateMediaNotification();
            });
            this._onClipTextsMenuChanged = this._settings.connect("changed::clip-texts-menu", () => {
                this.cliptextsmenu = this._settings.get_boolean("clip-texts-menu");
                this.player.updateWidgets();
            });
            this._onScrollTrackLabelChanged = this._settings.connect("changed::scroll-track-label", () => {
                this.scrolltracklabel = this._settings.get_boolean("scroll-track-label");
                this.player.updateWidgets();
            });
        }

        disconnectSignals() {
            this._settings.disconnect(this._onMaxWidgetWidthChanged);
            this._settings.disconnect(this._onUpdateDelayChanged);
            this._settings.disconnect(this._onShowControlsChanged);
            this._settings.disconnect(this._onShowPlayerIconChanged);
            this._settings.disconnect(this._onShowTrackNameChanged);
            this._settings.disconnect(this._onShowSeperatorsChanged);
            this._settings.disconnect(this._onExtensionPositionChanged);
            this._settings.disconnect(this._onShowPlayPauseButtonChanged);
            this._settings.disconnect(this._onShowNextButtonChanged);
            this._settings.disconnect(this._onShowPrevButtonChanged);
            this._settings.disconnect(this._onSeekIntervalChanged);
            this._settings.disconnect(this._onPreferSeekChanged);
            this._settings.disconnect(this._onShowSeekBackChanged);
            this._settings.disconnect(this._onShowSeekForwardChanged);
            this._settings.disconnect(this._onExtensionIndexChanged);
            this._settings.disconnect(this._onShowSourcesInInfoMenuChanged);
            this._settings.disconnect(this._onColoredPlayerIconChanged);
            this._settings.disconnect(this._onMouseActionsChanged);
            this._settings.disconnect(this._onSepCharsChanged);
            this._settings.disconnect(this._onElementOrderChanged);
            this._settings.disconnect(this._onTrackLabelChanged);
            this._settings.disconnect(this._onCacheImagesChanged);
            this._settings.disconnect(this._onBacklistAppsChanged);
            this._settings.disconnect(this._onHideMediaNotificationChanged);
            this._settings.disconnect(this._onClipTextsMenuChanged);
            this._settings.disconnect(this._onScrollTrackLabel);
        }

        enable(Me) {
            this._settings = Me.getSettings();
            this.connectSignals();

            this.maxWidgetWidth = this._settings.get_int("max-widget-width");
            this.updateDelay = this._settings.get_int("update-delay");
            this.showTrackName = this._settings.get_boolean("show-text");
            this.showPlayerIcon = this._settings.get_boolean("show-player-icon");
            this.showControls = this._settings.get_boolean("show-control-icons");
            this.showSeperators = this._settings.get_boolean("show-seperators");
            this.showMenu = this._settings.get_boolean("show-sources-menu");
            this.showPlayPauseButton = this._settings.get_boolean("show-playpause-icon");
            this.showPrevButton = this._settings.get_boolean("show-prev-icon");
            this.showNextButton = this._settings.get_boolean("show-next-icon");
            this.seekInterval = this._settings.get_int("seek-interval-secs");
            this.preferNativeSeek = this._settings.get_boolean("prefer-using-seek");
            this.showSeekBack = this._settings.get_boolean("show-seek-back");
            this.showSeekForward = this._settings.get_boolean("show-seek-forward");
            this.extensionPosition = this._settings.get_string("extension-position");
            this.extensionIndex = this._settings.get_int("extension-index");
            this.coloredPlayerIcon = this._settings.get_boolean("colored-player-icon");
            this.mouseActions = this._settings.get_strv("mouse-actions");
            this.sepChars = this._settings.get_strv("seperator-chars");
            this.elementOrder = this._settings.get_strv("element-order");
            this.trackLabel = this._settings.get_strv("track-label");
            this.cacheImages = this._settings.get_boolean("cache-images");
            this.blacklistApps = this._settings.get_strv("backlist-apps");
            this.hideMediaNotification = this._settings.get_boolean("hide-media-notification");
            this.cliptextsmenu = this._settings.get_boolean("clip-texts-menu");
            this.scrolltracklabel = this._settings.get_boolean("scroll-track-label");

            let mouseActions = this.mouseActions;
            let defaultMouseActions = this._settings.get_default_value("mouse-actions").recursiveUnpack();

            defaultMouseActions.forEach((action, index) => {
                if (!mouseActions[index]) {
                    mouseActions[index] = action;
                }
            });

            this._settings.set_strv("mouse-actions", mouseActions);

            this.clutterSettings = Clutter.Settings.get_default();
            this.clutterSettings.double_click_time = 200;

            this._automaticUpdateToggle = new PopupMenu.PopupSwitchMenuItem("Determine player automatically", true);

            this._automaticUpdateToggle.track_hover = false;

            this._automaticUpdateToggle.connect("toggled", (widget, value) => {
                this.isFixedPlayer = !value;
                this.updatePlayer();
            });

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addMenuItem(this._automaticUpdateToggle);

            this.updateMediaNotification();

            (async () => {
                try {
                    this._playersProxy = await createProxy(
                        "org.freedesktop.DBus",
                        "org.freedesktop.DBus",
                        "/org/freedesktop/DBus"
                    );

                    this._playersProxy.ListNamesRemote((names, error) => {
                        if (error) {
                            logError(error);
                        } else {
                            (async () => {
                                try {
                                    for (let name of names[0]) {
                                        if (name.includes("org.mpris.MediaPlayer2")) {
                                            await this._addPlayer(name);
                                        }
                                    }

                                    this.updatePlayer(null);
                                } catch (error) {
                                    logError(error);
                                }
                            })();
                        }
                    });

                    this._playersProxy.connectSignal("NameOwnerChanged", (...[, , [busName, ,]]) => {
                        if (busName?.includes("org.mpris.MediaPlayer2") && !this._players[busName]) {
                            (async () => {
                                await this._addPlayer(busName);
                                this.updatePlayer(null);
                            })();
                        }
                    });
                } catch (error) {
                    logError(error);
                }
            })();
        }

        disable() {
            this.removeWidgets();
            this.disconnectSignals();

            for (let playerObj of Object.values(this._players)) {
                playerObj.destroy();
            }

            this.destroy();
        }

        toggleTrackInfoMenu() {
            this.menu.close(BoxPointer.PopupAnimation.FULL);
            this.player.menu.toggle();
        }

        addWidgets() {
            delete Main.panel.statusArea["media_controls_extension"];
            Main.panel.addToStatusArea("media_controls_extension", this, this.extensionIndex, this.extensionPosition);
            Main.wm.addKeybinding(
                "mediacontrols-toggle-trackinfomenu",
                this._settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this.toggleTrackInfoMenu.bind(this)
            );
            this.add_child(this.player.container);

            this.elementOrder.forEach((element) => {
                if (element === "icon" && this.showPlayerIcon) {
                    this.player.dummyContainer.add_child(this.player.buttonPlayer);
                } else if (element === "title" && this.showTrackName) {
                    this.player.dummyContainer.add_child(this.player.containerButtonLabel);
                    if (this.showSeperators) {
                        this.player.subContainerLabel.add_child(this.player.labelSeperatorStart);
                    }
                    this.player.subContainerLabel.add_child(this.player.labelTitle);
                    if (this.showSeperators) {
                        this.player.subContainerLabel.add_child(this.player.labelSeperatorEnd);
                    }
                } else if (element === "controls" && this.showControls) {
                    this.player.dummyContainer.add_child(this.player.containerControls);
                    if (this.showSeekBack) {
                        this.player.containerControls.add_child(this.player.buttonSeekBack);
                    }
                    if (this.showPrevButton) {
                        this.player.containerControls.add_child(this.player.buttonPrev);
                    }
                    if (this.showPlayPauseButton) {
                        this.player.containerControls.add_child(this.player.buttonPlayPause);
                    }
                    if (this.showNextButton) {
                        this.player.containerControls.add_child(this.player.buttonNext);
                    }
                    if (this.showSeekForward) {
                        this.player.containerControls.add_child(this.player.buttonSeekForward);
                    }
                } else if (element === "menu" && this.showMenu) {
                    this.player.dummyContainer.add_child(this.player.buttonMenu);
                }
            });
        }

        removeWidgets() {
            Main.wm.removeKeybinding("mediacontrols-toggle-trackinfomenu");
            delete Main.panel.statusArea["media_controls_extension"];

            if (this.player) {
                if (this.player.container.get_parent()) {
                    this.remove_child(this.player.container);
                }
                if (this.player.buttonPlayer.get_parent()) {
                    this.player.dummyContainer.remove_child(this.player.buttonPlayer);
                }
                if (this.player.containerButtonLabel.get_parent()) {
                    this.player.dummyContainer.remove_child(this.player.containerButtonLabel);
                }
                if (this.player.labelTitle.get_parent()) {
                    this.player.subContainerLabel.remove_child(this.player.labelTitle);
                }
                if (this.player.labelSeperatorStart.get_parent()) {
                    this.player.subContainerLabel.remove_child(this.player.labelSeperatorStart);
                }
                if (this.player.labelSeperatorEnd.get_parent()) {
                    this.player.subContainerLabel.remove_child(this.player.labelSeperatorEnd);
                }
                if (this.player.containerControls.get_parent()) {
                    this.player.dummyContainer.remove_child(this.player.containerControls);
                }
                if (this.player.buttonSeekBack.get_parent()) {
                    this.player.containerControls.remove_child(this.player.buttonSeekBack);
                }
                if (this.player.buttonPrev.get_parent()) {
                    this.player.containerControls.remove_child(this.player.buttonPrev);
                }
                if (this.player.buttonPlayPause.get_parent()) {
                    this.player.containerControls.remove_child(this.player.buttonPlayPause);
                }
                if (this.player.buttonNext.get_parent()) {
                    this.player.containerControls.remove_child(this.player.buttonNext);
                }
                if (this.player.buttonSeekForward.get_parent()) {
                    this.player.containerControls.remove_child(this.player.buttonSeekForward);
                }
                if (this.player.buttonMenu.get_parent()) {
                    this.player.dummyContainer.remove_child(this.player.buttonMenu);
                }
            } else {
                this.remove_all_children();
            }
        }

        async _addPlayer(busName) {
            try {
                let playerObj = await new Player(busName, this);
                if (this.blacklistApps.every((app) => !playerObj.name.toLowerCase().includes(app.toLowerCase()))) {
                    let menuItem = playerObj.menuItem;

                    menuItem.connect("activate", (menuItem) => {
                        this.toggleActivatePlayer(menuItem.busName);
                    });

                    menuItem.closeButton.connect("button-release-event", (closeButton) => {
                        this.playerVanished(null, closeButton.get_parent().busName);

                        this.menu.close();
                    });

                    this.menu.addMenuItem(menuItem);
                    this._players[busName] = playerObj;

                    if (!playerObj._metadata["title"]) {
                        this.hidePlayer(busName);
                    }
                } else {
                    playerObj.destroy();
                    playerObj = null;
                }
            } catch (error) {
                logError(error);
            }
        }

        _removePlayer(busName) {
            let playerObj = this._players[busName];

            // Remove menu item from the source menu
            this.menu.box.remove_child(playerObj.menuItem);
            // Remove track information menu menu
            Main.panel.menuManager.removeMenu(playerObj.menu);

            playerObj.destroy();

            delete this._players[busName];
        }

        /**
         * Determines the currently selected player
         * @param {null || Player || string} player
         */
        updatePlayer(player = null) {
            if (!this.player && this.isFixedPlayer) {
                this.isFixedPlayer = false;
            }

            if (!player && !this.isFixedPlayer) {
                const validPlayers = [];
                for (let playerName in this._players) {
                    let playerObj = this._players[playerName];
                    if (playerObj._metadata["title"] && !playerObj.hidden) {
                        validPlayers.push(playerObj);
                        if (playerObj.isPlaying) {
                            player = playerObj;
                        }
                    }
                }

                if (!player) {
                    player = validPlayers[0];
                }
            }

            if (player && (player instanceof Player || typeof player === "string")) {
                if (this.player) {
                    this.player.active = false;
                    this.removeWidgets();

                    Gio.bus_unwatch_name(this.playerWatchId);
                    Main.panel.menuManager.removeMenu(this.player.menu);
                }

                this.player = typeof player === "string" ? this._players[player] : player;

                if (!this.player.dummyContainer) {
                    this.player.initWidgets();
                }

                Main.panel.menuManager.addMenu(this.player.menu);

                this.playerWatchId = Gio.bus_watch_name(
                    Gio.BusType.SESSION,
                    this.player.busName,
                    Gio.BusNameWatcherFlags.NONE,
                    null,
                    this.playerVanished.bind(this)
                );

                this.removeWidgets();
                this.addWidgets();

                this.player.active = true;
            } else if (!this.player) {
                this.removeWidgets();
            }
        }

        toggleActivatePlayer(busName) {
            if (this.isFixedPlayer && this.player && busName === this.player.busName) {
                this.fixedPlayer = false;
                this.updatePlayer();
            } else {
                this.fixedPlayer = true;
                this.updatePlayer(busName);
            }
        }

        hidePlayer(busName) {
            const playerObj = this._players[busName];

            if (playerObj) {
                // Remove menu item from the source menu
                this.menu.box.remove_child(playerObj.menuItem);
                // Remove track information menu menu
                Main.panel.menuManager.removeMenu(playerObj.menu);

                playerObj.hidden = true;

                if (this.player && this.player.busName === busName && this.fixedPlayer) {
                    this.fixedPlayer = false;
                    this.updatePlayer();
                } else if (this.player && this.player.busName !== busName && this.fixedPlayer) {
                    this.updatePlayer(this.player);
                } else {
                    this.updatePlayer();
                }
            }
        }

        unhidePlayer(busName) {
            const playerObj = this._players[busName];
            if (playerObj) {
                this.menu.addMenuItem(playerObj.menuItem);
                playerObj.hidden = false;
                if (this.isFixedPlayer) {
                    this.updatePlayer(this.player);
                } else {
                    this.updatePlayer();
                }
            }
        }

        playerVanished(connection, name) {
            if (name === this.player.busName) {
                Gio.bus_unwatch_name(this.playerWatchId);
                this._removePlayer(this.player.busName);

                this.player = null;

                this.updatePlayer();
            } else {
                this._removePlayer(name);
            }
        }

        updateMediaNotification() {
            if (this.hideMediaNotification) {
                this._mediaSectionAdd = Mpris.MediaSection.prototype._addPlayer;
                Mpris.MediaSection.prototype._addPlayer = function () {
                    return;
                };

                Main.panel.statusArea["dateMenu"]._messageList._mediaSection._players.forEach((player) => {
                    player._close();
                });
            } else {
                if (this._mediaSectionAdd) {
                    Mpris.MediaSection.prototype._addPlayer = this._mediaSectionAdd;
                    this._mediaSectionAdd = undefined;

                    Main.panel.statusArea["dateMenu"]._messageList._mediaSection._onProxyReady().catch();
                }
            }
        }

        destroy() {
            super.destroy();
        }

        get fixedPlayer() {
            return this.isFixedPlayer;
        }

        set fixedPlayer(value) {
            this.isFixedPlayer = value;
            this._automaticUpdateToggle.setToggleState(!value);
        }
    }
);

/*

                                    MediaControls(PanelButton)
                                                |
                                               / \
                                              /   \
                                             /     \
                          Player (PanelButton)     Source menu (arrow icon)
                                |
                               / \
                              /   \
                             /     \
                            /       \
                   buttonLabel     containerControls
                       |             seekBwd____|____seekFwd
                      / \                      /|\__________buttonNext
                     /   \       buttonPrev___/  \
                    /     \                       \
            iconPlayer   labelTitle                buttonPlayPause



*/
