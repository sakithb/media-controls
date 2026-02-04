/** @import { StdInterface } from './types/dbus.js' */
/** @import { KeysOf } from './types/misc.js' */

import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Mpris from "resource:///org/gnome/shell/ui/mpris.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import PanelButton from "./helpers/shell/PanelButton.js";
import PlayerProxy from "./helpers/shell/PlayerProxy.js";
import { debugLog, enumValueByIndex, errorLog } from "./utils/common.js";
import { getAppInfoByIdAndEntry, getAppByIdAndEntry, createDbusProxy } from "./utils/shell_only.js";
import {
    PlaybackStatus,
    WidgetFlags,
    MPRIS_PLAYER_IFACE_NAME,
    DBUS_PROPERTIES_IFACE_NAME,
    MPRIS_IFACE_NAME,
    DBUS_OBJECT_PATH,
    DBUS_IFACE_NAME,
    ExtensionPositions,
    PanelElements, 
    LabelTypes
} from "./types/enums/common.js";

Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");

/** @typedef {KeysOf<typeof PanelElements>[]} ElementsOrder */
/** @typedef {(KeysOf<typeof LabelTypes> | (string & NonNullable<unknown>))[]} LabelsOrder */

export default class MediaControls extends Extension {
    /**
     * @public
     */
    enable() {
        debugLog("Enabling extension...");
        
        // 1. Register Resources
        const resourcePath = GLib.build_filenamev([this.path, "org.gnome.shell.extensions.mediacontrols.gresource"]);
        this._resource = Gio.resource_load(resourcePath);
        Gio.resources_register(this._resource);

        // 2. Initialize State
        this.playerProxies = new Map();
        
        // 3. Setup
        this.initSettings();
        this.initProxies().catch(errorLog);
        this.updateMediaNotificationVisiblity();

        // 4. Global Keybinding
        Main.wm.addKeybinding(
            "mediacontrols-show-popup-menu",
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => this.panelBtn?.menu.toggle()
        );
    }

    /**
     * @public
     */
    disable() {
        debugLog("Disabling extension...");

        // 1. Cleanup Keybindings
        Main.wm.removeKeybinding("mediacontrols-show-popup-menu");

        // 2. Cleanup Proxies & Players
        this.playerProxies.forEach(proxy => proxy.onDestroy());
        this.playerProxies.clear();
        this.playerProxies = null;
        
        // 3. Remove UI
        this.removePanelButton();
        this.updateMediaNotificationVisiblity(true); // Restore original behavior

        // 4. Destroy Settings
        this.destroySettings();

        // 5. Cleanup DBus Watchers
        this.watchIfaceInfo = null;
        this.mprisIfaceInfo = null;
        this.mprisPlayerIfaceInfo = null;
        this.propertiesIfaceInfo = null;
        this.watchProxy = null;

        // 6. Unregister Resources
        if (this._resource) {
            Gio.resources_unregister(this._resource);
            this._resource = null;
        }
    }

    /* -------------------------------------------------------------------------
     * INITIALIZATION & SETTINGS
     * ------------------------------------------------------------------------- */

    initSettings() {
        this.settings = this.getSettings();

        // Helper to bind a setting to a class property and optional update callback
        const bind = (prop, key, type, updateFlag = null) => {
            const getter = type === 'bool' ? 'get_boolean' : type === 'uint' ? 'get_uint' : 'get_strv';
            this[prop] = this.settings[getter](key);
            
            this.settings.connect(`changed::${key}`, () => {
                this[prop] = this.settings[getter](key);
                if (updateFlag) {
                    this.panelBtn?.updateWidgets(updateFlag);
                }
            });
        };

        // --- General Settings ---
        bind("labelWidth", "label-width", "uint", WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_LABELS | WidgetFlags.MENU_IMAGE);
        bind("isFixedLabelWidth", "fixed-label-width", "bool", WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_LABELS | WidgetFlags.MENU_IMAGE);
        bind("scrollLabels", "scroll-labels", "bool", WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_LABELS);
        bind("scrollSpeed", "scroll-speed", "uint", WidgetFlags.PANEL_LABEL | WidgetFlags.MENU_LABELS);
        bind("hideMediaNotification", "hide-media-notification", "bool");
        bind("showTrackSlider", "show-track-slider", "bool", WidgetFlags.MENU_SLIDER);
        bind("cacheArt", "cache-art", "bool");

        // --- Panel Visibility ---
        bind("showLabel", "show-label", "bool", WidgetFlags.PANEL_LABEL);
        bind("showPlayerIcon", "show-player-icon", "bool", WidgetFlags.PANEL_ICON);
        bind("showControlIcons", "show-control-icons", "bool", WidgetFlags.PANEL_CONTROLS);
        bind("coloredPlayerIcon", "colored-player-icon", "bool", WidgetFlags.PANEL_ICON);

        // --- Panel Specific Controls ---
        bind("showControlIconsPlay", "show-control-icons-play", "bool", WidgetFlags.PANEL_CONTROLS_PLAYPAUSE);
        bind("showControlIconsNext", "show-control-icons-next", "bool", WidgetFlags.PANEL_CONTROLS_NEXT);
        bind("showControlIconsPrevious", "show-control-icons-previous", "bool", WidgetFlags.PANEL_CONTROLS_PREVIOUS);
        bind("showControlIconsSeekForward", "show-control-icons-seek-forward", "bool", WidgetFlags.PANEL_CONTROLS_SEEK_FORWARD);
        bind("showControlIconsSeekBackward", "show-control-icons-seek-backward", "bool", WidgetFlags.PANEL_CONTROLS_SEEK_BACKWARD);

        // --- Ordering ---
        this.elementsOrder = this.settings.get_strv("elements-order");
        this.settings.connect("changed::elements-order", () => {
            this.elementsOrder = this.settings.get_strv("elements-order");
            this.panelBtn?.updateWidgets(WidgetFlags.PANEL_NO_REPLACE);
        });

        this.labelsOrder = this.settings.get_strv("labels-order");
        this.settings.connect("changed::labels-order", () => {
            this.labelsOrder = this.settings.get_strv("labels-order");
            this.panelBtn?.updateWidgets(WidgetFlags.PANEL_LABEL);
        });

        // --- Enums & Complex Types ---
        const bindEnum = (prop, key) => {
            this[prop] = this.settings.get_enum(key);
            this.settings.connect(`changed::${key}`, () => {
                this[prop] = this.settings.get_enum(key);
            });
        };

        bindEnum("mouseActionLeft", "mouse-action-left");
        bindEnum("mouseActionMiddle", "mouse-action-middle");
        bindEnum("mouseActionRight", "mouse-action-right");
        bindEnum("mouseActionDouble", "mouse-action-double");
        bindEnum("mouseActionScrollUp", "mouse-action-scroll-up");
        bindEnum("mouseActionScrollDown", "mouse-action-scroll-down");

        // --- Positioning ---
        const updatePosition = () => {
            this.extensionIndex = this.settings.get_uint("extension-index");
            this.extensionPosition = enumValueByIndex(ExtensionPositions, this.settings.get_enum("extension-position"));
            this.removePanelButton();
            this.setActivePlayer();
        };

        updatePosition(); // Initial fetch
        this.settings.connect("changed::extension-position", updatePosition);
        this.settings.connect("changed::extension-index", updatePosition);

        // --- Special Handling ---
        this.settings.connect("changed::hide-media-notification", () => {
            this.updateMediaNotificationVisiblity();
        });

        this.blacklistedPlayers = this.settings.get_strv("blacklisted-players");
        this.settings.connect("changed::blacklisted-players", () => {
            this.blacklistedPlayers = this.settings.get_strv("blacklisted-players");
            // Remove newly blacklisted players immediately
            for (const player of this.playerProxies.values()) {
                if (this.isPlayerBlacklisted(player.identity, player.desktopEntry)) {
                    this.removePlayer(player.busName);
                }
            }
            this.addRunningPlayers();
        });
    }

    destroySettings() {
        this.settings = null;
        // Nullify all properties to help GC
        this.labelWidth = null; this.isFixedLabelWidth = null; this.scrollLabels = null;
        this.scrollSpeed = null; this.hideMediaNotification = null; this.showTrackSlider = null;
        this.showLabel = null; this.showPlayerIcon = null; this.showControlIcons = null;
        this.coloredPlayerIcon = null; this.extensionPosition = null; this.extensionIndex = null;
        this.elementsOrder = null; this.labelsOrder = null; this.mouseActionLeft = null;
        this.cacheArt = null; this.blacklistedPlayers = null;
    }

    /* -------------------------------------------------------------------------
     * DBUS & PLAYER PROXIES
     * ------------------------------------------------------------------------- */

    async initProxies() {
        // Load XML interfaces
        const loadXml = async (path) => {
            const file = Gio.File.new_for_uri(`resource:///org/gnome/shell/extensions/mediacontrols/dbus/${path}`);
            const [bytes] = await file.load_contents_async(null);
            return new TextDecoder().decode(bytes);
        };

        const [mprisXml, watchXml] = await Promise.all([
            loadXml("mprisNode.xml"),
            loadXml("watchNode.xml")
        ]).catch(err => {
            errorLog("Failed to load DBus XML", err);
            return [null, null];
        });

        if (!mprisXml || !watchXml) return;

        // Parse Nodes
        const watchInfo = Gio.DBusNodeInfo.new_for_xml(watchXml);
        this.watchIfaceInfo = watchInfo.lookup_interface(DBUS_IFACE_NAME);

        const mprisInfo = Gio.DBusNodeInfo.new_for_xml(mprisXml);
        this.mprisIfaceInfo = mprisInfo.lookup_interface(MPRIS_IFACE_NAME);
        this.mprisPlayerIfaceInfo = mprisInfo.lookup_interface(MPRIS_PLAYER_IFACE_NAME);
        this.propertiesIfaceInfo = mprisInfo.lookup_interface(DBUS_PROPERTIES_IFACE_NAME);

        // Connect Watcher
        this.watchProxy = await createDbusProxy(this.watchIfaceInfo, DBUS_IFACE_NAME, DBUS_OBJECT_PATH);
        if (!this.watchProxy) return;

        this.watchProxy.connectSignal("NameOwnerChanged", (_, __, [busName, oldOwner, newOwner]) => {
            if (!busName.startsWith(MPRIS_IFACE_NAME)) return;
            if (newOwner === "") this.removePlayer(busName);
            else if (oldOwner === "") this.addPlayer(busName);
        });

        await this.addRunningPlayers();
    }

    async addRunningPlayers() {
        const result = await this.watchProxy.ListNamesAsync().catch(errorLog);
        if (!result) return;

        const [names] = result;
        const promises = names
            .filter(name => name.startsWith(MPRIS_IFACE_NAME) && !this.playerProxies.has(name))
            .map(name => this.addPlayer(name));
            
        await Promise.all(promises);
    }

    async addPlayer(busName) {
        if (this.playerProxies.has(busName)) return;

        try {
            const player = new PlayerProxy(busName);
            const success = await player.initPlayer(this.mprisIfaceInfo, this.mprisPlayerIfaceInfo, this.propertiesIfaceInfo);

            if (!success) return;

            if (this.isPlayerBlacklisted(player.identity, player.desktopEntry)) {
                return;
            }

            debugLog(`Adding player: ${busName}`);
            
            // Listeners for UI updates
            player.onChanged("IsPinned", () => this.setActivePlayer());
            player.onChanged("PlaybackStatus", () => this.setActivePlayer());
            player.onChanged("IsInvalid", () => {
                this.setActivePlayer();
                this.panelBtn?.updateWidgets(WidgetFlags.MENU_PLAYERS);
            });

            this.playerProxies.set(busName, player);
            this.panelBtn?.updateWidgets(WidgetFlags.MENU_PLAYERS);
            
            // If we have no active player, this one might become it
            if (!this.panelBtn) this.setActivePlayer();

        } catch (e) {
            errorLog(`Error adding player ${busName}`, e);
        }
    }

    removePlayer(busName) {
        const player = this.playerProxies.get(busName);
        if (player) {
            debugLog(`Removing player: ${busName}`);
            player.onDestroy();
            this.playerProxies.delete(busName);
            this.panelBtn?.updateWidgets(WidgetFlags.MENU_PLAYERS);
            this.setActivePlayer();
        }
    }

    /* -------------------------------------------------------------------------
     * ACTIVE PLAYER LOGIC
     * ------------------------------------------------------------------------- */

    getPlayers() {
        return Array.from(this.playerProxies.values()).filter(p => !p.isInvalid);
    }

    setActivePlayer() {
        if (this.playerProxies.size === 0) {
            this.removePanelButton();
            return;
        }

        const players = this.getPlayers();
        let candidate = null;

        // Priority 1: Pinned Player
        candidate = players.find(p => p.isPlayerPinned());

        // Priority 2: Playing Player
        if (!candidate) {
            const playing = players.filter(p => p.playbackStatus === PlaybackStatus.PLAYING);
            if (playing.length > 0) {
                // If current button player is playing, keep it. Otherwise pick first playing.
                const current = this.panelBtn?.playerProxy;
                if (current && playing.includes(current)) {
                    candidate = current;
                } else {
                    candidate = playing[0];
                }
            }
        }

        // Priority 3: Fallback (First available)
        if (!candidate && players.length > 0) {
            candidate = this.panelBtn?.playerProxy || players[0];
            // Ensure candidate is still valid
            if (!players.includes(candidate)) candidate = players[0];
        }

        if (!candidate) {
            this.removePanelButton();
            return;
        }

        // Apply Candidate
        if (!this.panelBtn) {
            this.addPanelButton(candidate.busName);
        } else {
            this.panelBtn.updateProxy(candidate);
        }
    }

    isPlayerBlacklisted(id, entry) {
        const list = this.blacklistedPlayers;
        if (!list || list.length === 0) return false;

        // 1. Direct ID check
        let app = getAppInfoByIdAndEntry(id, entry) || getAppByIdAndEntry(id, entry);
        if (app && list.includes(app.get_id())) return true;

        // 2. Raw String Check
        const check = (s) => s && (list.includes(s) || list.includes(`${s}.desktop`));
        return check(id) || check(entry);
    }

    /* -------------------------------------------------------------------------
     * UI & PANEL
     * ------------------------------------------------------------------------- */

    addPanelButton(busName) {
        const proxy = this.playerProxies.get(busName);
        if (!proxy) return;

        debugLog(`Creating panel button for ${busName}`);
        this.panelBtn = new PanelButton(proxy, this);
        Main.panel.addToStatusArea("Media Controls", this.panelBtn, this.extensionIndex, this.extensionPosition);
    }

    removePanelButton() {
        if (this.panelBtn) {
            debugLog("Destroying panel button");
            this.panelBtn.destroy();
            this.panelBtn = null;
        }
    }

    /**
     * Monkey-patch the date menu to hide default media controls if requested
     */
    updateMediaNotificationVisiblity(restore = false) {
        const MprisSource = Mpris.MprisSource ?? Mpris.MediaSection;
        const dateMenu = Main.panel.statusArea.dateMenu;
        if (!dateMenu) return; // Safety check

        const mediaSource = dateMenu._messageList?._messageView?._mediaSource ?? 
                          dateMenu._messageList?._mediaSection;
        
        if (!mediaSource) return;

        if (this.mediaSectionAddFunc && (restore || !this.hideMediaNotification)) {
            // Restore Original
            MprisSource.prototype._addPlayer = this.mediaSectionAddFunc;
            this.mediaSectionAddFunc = null;
            mediaSource._onProxyReady();
        } else if (this.hideMediaNotification && !this.mediaSectionAddFunc) {
            // Apply Patch (Hide)
            this.mediaSectionAddFunc = MprisSource.prototype._addPlayer;
            MprisSource.prototype._addPlayer = function () {}; // No-op
            
            // Force refresh to remove existing
            if (mediaSource._players) {
                for (const player of mediaSource._players.values()) {
                    mediaSource._onNameOwnerChanged(null, null, [player._busName, player._busName, ""]);
                }
            }
        }
    }
}