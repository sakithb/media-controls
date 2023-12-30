import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import Shell from "gi://Shell?version=13";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Mpris from "resource:///org/gnome/shell/ui/mpris.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import PanelButton from "./helpers/PanelButton.js";
import PlayerProxy from "./helpers/PlayerProxy.js";
import { ExtensionPositions, LabelTypes, MouseActions, PanelElements, PlaybackStatus } from "./types/enums.js";
import { createDbusProxy, debugLog, enumValueByIndex, errorLog, handleError } from "./utils/common.js";
import { StdInterface } from "./types/dbus.js";
import { KeysOf } from "./types/common.js";

Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");

type ElementsOrder = KeysOf<typeof PanelElements>[];
type LabelsOrder = (KeysOf<typeof LabelTypes> | (string & NonNullable<unknown>))[];

const MPRIS_IFACE_NAME = "org.mpris.MediaPlayer2";
const MPRIS_PLAYER_IFACE_NAME = "org.mpris.MediaPlayer2.Player";
const DBUS_PROPERTIES_IFACE_NAME = "org.freedesktop.DBus.Properties";
const DBUS_IFACE_NAME = "org.freedesktop.DBus";
const DBUS_OBJECT_PATH = "/org/freedesktop/DBus";

export default class MediaControls extends Extension {
    public labelWidth: number;
    public fixedLabelWidth: boolean;
    public scrollLabels: boolean;
    public hideMediaNotification: boolean;
    public showLabel: boolean;
    public showPlayerIcon: boolean;
    public showControlIcons: boolean;
    public showControlIconsPlay: boolean;
    public showControlIconsNext: boolean;
    public showControlIconsPrevious: boolean;
    public showControlIconsSeekForward: boolean;
    public showControlIconsSeekBackward: boolean;
    public coloredPlayerIcon: boolean;
    public extensionPosition: ExtensionPositions;
    public extensionIndex: number;
    public elementsOrder: ElementsOrder;
    public labelsOrder: LabelsOrder;
    public shortcutShowMenu: string;
    public mouseActionLeft: MouseActions;
    public mouseActionMiddle: MouseActions;
    public mouseActionRight: MouseActions;
    public mouseActionDouble: MouseActions;
    public mouseActionScrollUp: MouseActions;
    public mouseActionScrollDown: MouseActions;
    public cacheArt: boolean;
    public blacklistedPlayers: string[];

    private settings: Gio.Settings;
    private panelBtn: InstanceType<typeof PanelButton>;

    private watchProxy: StdInterface;
    private playerProxies: Map<string, PlayerProxy>;

    private watchIfaceInfo: Gio.DBusInterfaceInfo;
    private mprisIfaceInfo: Gio.DBusInterfaceInfo;
    private mprisPlayerIfaceInfo: Gio.DBusInterfaceInfo;
    private propertiesIfaceInfo: Gio.DBusInterfaceInfo;

    private mediaSectionAddFunc: (busName: string) => void;

    public enable() {
        this.playerProxies = new Map();

        this.initSettings();
        this.initProxies().catch(handleError);
        this.updateMediaNotificationVisiblity();

        debugLog("Enabled");
    }

    private initSettings() {
        this.settings = this.getSettings();

        this.labelWidth = this.settings.get_uint("label-width");
        this.fixedLabelWidth = this.settings.get_boolean("fixed-label-width");
        this.scrollLabels = this.settings.get_boolean("scroll-labels");
        this.hideMediaNotification = this.settings.get_boolean("hide-media-notification");
        this.showLabel = this.settings.get_boolean("show-label");
        this.showPlayerIcon = this.settings.get_boolean("show-player-icon");
        this.showControlIcons = this.settings.get_boolean("show-control-icons");
        this.showControlIconsPlay = this.settings.get_boolean("show-control-icons-play");
        this.showControlIconsNext = this.settings.get_boolean("show-control-icons-next");
        this.showControlIconsPrevious = this.settings.get_boolean("show-control-icons-previous");
        this.showControlIconsSeekForward = this.settings.get_boolean("show-control-icons-seek-forward");
        this.showControlIconsSeekBackward = this.settings.get_boolean("show-control-icons-seek-backward");
        this.coloredPlayerIcon = this.settings.get_boolean("colored-player-icon");
        this.extensionPosition = enumValueByIndex(ExtensionPositions, this.settings.get_enum("extension-position"));
        this.extensionIndex = this.settings.get_uint("extension-index");
        this.elementsOrder = this.settings.get_strv("elements-order") as ElementsOrder;
        this.labelsOrder = this.settings.get_strv("labels-order") as LabelsOrder;
        this.shortcutShowMenu = this.settings.get_string("shortcut-show-menu");
        this.mouseActionLeft = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-left"));
        this.mouseActionMiddle = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-middle"));
        this.mouseActionRight = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-right"));
        this.mouseActionDouble = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-double"));
        this.mouseActionScrollUp = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-scroll-up"));
        this.mouseActionScrollDown = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-scroll-down"));
        this.cacheArt = this.settings.get_boolean("cache-art");
        this.blacklistedPlayers = this.settings.get_strv("blacklisted-players");

        this.settings.connect("changed::label-width", () => {
            this.labelWidth = this.settings.get_uint("label-width");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::fixed-label-width", () => {
            this.fixedLabelWidth = this.settings.get_boolean("fixed-label-width");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::scroll-labels", () => {
            this.scrollLabels = this.settings.get_boolean("scroll-labels");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::hide-media-notification", () => {
            this.hideMediaNotification = this.settings.get_boolean("hide-media-notification");
            this.updateMediaNotificationVisiblity();
        });

        this.settings.connect("changed::show-label", () => {
            this.showLabel = this.settings.get_boolean("show-label");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-player-icon", () => {
            this.showPlayerIcon = this.settings.get_boolean("show-player-icon");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons", () => {
            this.showControlIcons = this.settings.get_boolean("show-control-icons");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons-play", () => {
            this.showControlIconsPlay = this.settings.get_boolean("show-control-icons-play");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons-next", () => {
            this.showControlIconsNext = this.settings.get_boolean("show-control-icons-next");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons-previous", () => {
            this.showControlIconsPrevious = this.settings.get_boolean("show-control-icons-previous");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons-seek-forward", () => {
            this.showControlIconsSeekForward = this.settings.get_boolean("show-control-icons-seek-forward");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::show-control-icons-seek-backward", () => {
            this.showControlIconsSeekBackward = this.settings.get_boolean("show-control-icons-seek-backward");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::colored-player-icon", () => {
            this.coloredPlayerIcon = this.settings.get_boolean("colored-player-icon");
            this.panelBtn?.drawWidgets();
        });

        this.settings.connect("changed::extension-position", () => {
            const enumIndex = this.settings.get_enum("extension-position");
            this.extensionPosition = enumValueByIndex(ExtensionPositions, enumIndex);
            this.removePanelButton();
            this.setActivePlayer();
        });

        this.settings.connect("changed::extension-index", () => {
            this.extensionIndex = this.settings.get_uint("extension-index");
            this.removePanelButton();
            this.setActivePlayer();
        });

        this.settings.connect("changed::elements-order", () => {
            this.elementsOrder = this.settings.get_strv("elements-order") as ElementsOrder;
            this.panelBtn?.drawWidgets(true);
        });

        this.settings.connect("changed::labels-order", () => {
            this.labelsOrder = this.settings.get_strv("labels-order") as LabelsOrder;
            this.panelBtn?.drawWidgets(true);
        });

        this.settings.connect("changed::shortcut-show-menu", () => {
            this.shortcutShowMenu = this.settings.get_string("shortcut-show-menu");
        });

        this.settings.connect("changed::mouse-action-left", () => {
            const enumIndex = this.settings.get_enum("mouse-action-left");
            this.mouseActionLeft = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::mouse-action-middle", () => {
            const enumIndex = this.settings.get_enum("mouse-action-middle");
            this.mouseActionMiddle = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::mouse-action-right", () => {
            const enumIndex = this.settings.get_enum("mouse-action-right");
            this.mouseActionRight = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::mouse-action-double", () => {
            const enumIndex = this.settings.get_enum("mouse-action-double");
            this.mouseActionDouble = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::mouse-action-scroll-up", () => {
            const enumIndex = this.settings.get_enum("mouse-action-scroll-up");
            this.mouseActionScrollUp = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::mouse-action-scroll-down", () => {
            const enumIndex = this.settings.get_enum("mouse-action-scroll-down");
            this.mouseActionScrollDown = enumValueByIndex(MouseActions, enumIndex);
        });

        this.settings.connect("changed::cache-art", () => {
            this.cacheArt = this.settings.get_boolean("cache-art");
        });

        this.settings.connect("changed::blacklisted-players", () => {
            this.blacklistedPlayers = this.settings.get_strv("blacklisted-players");

            for (const playerProxy of this.playerProxies.values()) {
                if (this.isPlayerBlacklisted(playerProxy.identity)) {
                    this.removePlayer(playerProxy.busName);
                }
            }

            this.addRunningPlayers();
        });
    }

    private async initProxies() {
        const mprisXmlFile = Gio.File.new_for_path(`${this.path}/dbus/mprisNode.xml`);
        const watchXmlFile = Gio.File.new_for_path(`${this.path}/dbus/watchNode.xml`);

        const mprisResult = mprisXmlFile.load_contents_async(null);
        const watchResult = watchXmlFile.load_contents_async(null);

        const readResults = await Promise.all([mprisResult, watchResult]).catch(handleError);

        if (readResults == null) {
            errorLog("Failed to read xml files");
            return;
        }

        const mprisBytes = readResults[0];
        const watchBytes = readResults[1];

        const textDecoder = new TextDecoder();

        const watchNodeXml = textDecoder.decode(watchBytes[0]);
        const mprisNodeXml = textDecoder.decode(mprisBytes[0]);

        const watchNodeInfo = Gio.DBusNodeInfo.new_for_xml(watchNodeXml);
        const watchInterface = watchNodeInfo.interfaces.find((iface) => iface.name === DBUS_IFACE_NAME);

        this.watchIfaceInfo = watchInterface;

        const mprisNodeInfo = Gio.DBusNodeInfo.new_for_xml(mprisNodeXml);
        const mprisInterface = mprisNodeInfo.interfaces.find((iface) => iface.name === MPRIS_IFACE_NAME);
        const mprisPlayerInterface = mprisNodeInfo.interfaces.find((iface) => iface.name === MPRIS_PLAYER_IFACE_NAME);
        const propertiesInterface = mprisNodeInfo.interfaces.find((iface) => iface.name === DBUS_PROPERTIES_IFACE_NAME);

        const mprisInterfaceString = new GLib.String("");
        mprisInterface.generate_xml(4, mprisInterfaceString);

        const mprisPlayerInterfaceString = new GLib.String("");
        mprisPlayerInterface.generate_xml(4, mprisPlayerInterfaceString);

        const propertiesInterfaceString = new GLib.String("");
        propertiesInterface.generate_xml(4, propertiesInterfaceString);

        this.mprisIfaceInfo = mprisInterface;
        this.mprisPlayerIfaceInfo = mprisPlayerInterface;
        this.propertiesIfaceInfo = propertiesInterface;

        const initWatchSuccess = await this.initWatchProxy().catch(handleError);

        if (initWatchSuccess === false) {
            errorLog("Failed to init watch proxy");
            return;
        }

        await this.addRunningPlayers();
    }

    private async initWatchProxy() {
        this.watchProxy = await createDbusProxy<StdInterface>(
            this.watchIfaceInfo,
            DBUS_IFACE_NAME,
            DBUS_OBJECT_PATH,
        ).catch(handleError);

        if (this.watchProxy == null) {
            return false;
        }

        this.watchProxy.connectSignal("NameOwnerChanged", (proxy, senderName, [busName, oldOwner, newOwner]) => {
            if (busName.startsWith(MPRIS_IFACE_NAME) === false) {
                return;
            }

            if (newOwner === "") {
                this.removePlayer(busName);
            } else if (oldOwner === "") {
                this.addPlayer(busName);
            }
        });

        return true;
    }

    private async addRunningPlayers() {
        const namesResult = await this.watchProxy.ListNamesAsync().catch(handleError);

        if (namesResult == null) {
            errorLog("Failed to get bus names");
            return;
        }

        const busNames = namesResult[0];
        const promises = [];

        for (const busName of busNames) {
            if (busName.startsWith(MPRIS_IFACE_NAME) === false) continue;
            if (this.playerProxies.has(busName)) continue;

            promises.push(this.addPlayer(busName));
        }

        await Promise.all(promises).catch(handleError);
    }

    private async addPlayer(busName: string) {
        debugLog("Adding player:", busName);
        const playerProxy = new PlayerProxy(busName);
        const initSuccess = await playerProxy
            .initPlayer(this.mprisIfaceInfo, this.mprisPlayerIfaceInfo, this.propertiesIfaceInfo)
            .catch(handleError);

        if (initSuccess === false) {
            return;
        }

        const isPlayerBlacklisted = this.isPlayerBlacklisted(playerProxy.identity);

        if (isPlayerBlacklisted) {
            debugLog("Player is blacklisted:", busName);
            return;
        }

        playerProxy.onChanged("IsInvalid", this.setActivePlayer.bind(this));
        playerProxy.onChanged("IsPinned", this.setActivePlayer.bind(this));
        playerProxy.onChanged("PlaybackStatus", this.setActivePlayer.bind(this));

        this.playerProxies.set(busName, playerProxy);
        this.setActivePlayer();
    }

    private removePlayer(busName: string) {
        debugLog("Removing player:", busName);
        this.playerProxies.delete(busName);
        this.setActivePlayer();
    }

    private setActivePlayer() {
        if (this.playerProxies.size === 0) {
            if (this.panelBtn != null) {
                this.removePanelButton();
            }

            return;
        }

        let chosenPlayer: PlayerProxy = null;

        for (const [, playerProxy] of this.playerProxies) {
            if (playerProxy.isInvalid) {
                continue;
            }

            if (playerProxy.isPlayerPinned()) {
                chosenPlayer = playerProxy;
                break;
            }

            if (chosenPlayer == null) {
                chosenPlayer = playerProxy;
                continue;
            }

            if (playerProxy.playbackStatus === PlaybackStatus.PLAYING) {
                chosenPlayer = playerProxy;
                continue;
            }
        }

        debugLog("Chosen player:", chosenPlayer?.busName);

        if (chosenPlayer == null) {
            if (this.panelBtn) {
                this.removePanelButton();
            }
        } else {
            if (this.panelBtn == null) {
                this.addPanelButton(chosenPlayer.busName);
            } else {
                this.panelBtn.updateProxy(chosenPlayer);
            }
        }
    }

    private isPlayerBlacklisted(identity: string) {
        const appSystem = Shell.AppSystem.get_default();
        const runningApps = appSystem.get_running();
        const app = runningApps.find((app) => app.get_name() === identity);

        if (app == null) {
            const searchResults = Shell.AppSystem.search(identity)[0];

            if (searchResults.length === 0) {
                return true;
            }

            const appId = searchResults[0];
            return this.blacklistedPlayers.includes(appId);
        } else {
            return this.blacklistedPlayers.includes(app.get_id());
        }
    }

    private updateMediaNotificationVisiblity(shouldReset = false) {
        debugLog("Updating media notification");
        if (this.mediaSectionAddFunc && (shouldReset || this.hideMediaNotification === false)) {
            debugLog("Showing/resetting media notification");
            Mpris.MediaSection.prototype._addPlayer = this.mediaSectionAddFunc;
            this.mediaSectionAddFunc = null;

            Main.panel.statusArea.dateMenu._messageList._mediaSection._onProxyReady();
        } else {
            debugLog("Hiding media notification");
            this.mediaSectionAddFunc = Mpris.MediaSection.prototype._addPlayer;
            Mpris.MediaSection.prototype._addPlayer = function () {};

            if (Main.panel.statusArea.dateMenu._messageList._mediaSection._players != null) {
                for (const player of Main.panel.statusArea.dateMenu._messageList._mediaSection._players.values()) {
                    player._close();
                }
            }
        }
    }

    private addPanelButton(busName: string) {
        const playerProxy = this.playerProxies.get(busName);

        if (playerProxy == null) {
            return;
        }

        this.panelBtn = new PanelButton(playerProxy, this);
        Main.panel.addToStatusArea("Media Controls", this.panelBtn, this.extensionIndex, this.extensionPosition);
    }

    private removePanelButton() {
        this.panelBtn?.destroy();
        this.panelBtn = null;
    }

    private destroySettings() {
        this.settings = null;

        this.labelWidth = null;
        this.hideMediaNotification = null;
        this.scrollLabels = null;
        this.showLabel = null;
        this.showPlayerIcon = null;
        this.showControlIcons = null;
        this.showControlIconsPlay = null;
        this.showControlIconsNext = null;
        this.showControlIconsPrevious = null;
        this.showControlIconsSeekForward = null;
        this.showControlIconsSeekBackward = null;
        this.coloredPlayerIcon = null;
        this.extensionPosition = null;
        this.extensionIndex = null;
        this.elementsOrder = null;
        this.labelsOrder = null;
        this.shortcutShowMenu = null;
        this.mouseActionLeft = null;
        this.mouseActionMiddle = null;
        this.mouseActionRight = null;
        this.mouseActionDouble = null;
        this.mouseActionScrollUp = null;
        this.mouseActionScrollDown = null;
        this.cacheArt = null;
        this.blacklistedPlayers = null;
    }

    public disable() {
        this.watchProxy = null;
        this.watchIfaceInfo = null;
        this.mprisIfaceInfo = null;
        this.mprisPlayerIfaceInfo = null;
        this.propertiesIfaceInfo = null;
        this.playerProxies = null;

        this.removePanelButton();
        this.updateMediaNotificationVisiblity(true);
        this.destroySettings();

        debugLog("Disabled");
    }
}
