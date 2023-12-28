import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { ExtensionPositions, MouseActions, PlaybackStatus } from "./types/enums.js";
import { createDbusProxy, debugLog, enumValueByIndex, errorLog, handleError } from "./utils/common.js";
import { StdPropertiesInterface } from "./types/dbus.js";
import PanelButton from "./helpers/PanelButton.js";
import PlayerProxy from "./helpers/PlayerProxy.js";

Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");

// TODO: extract PlayerProxy to seperate file
export default class MediaControls extends Extension {
    public width: number;
    public hideMediaNotification: boolean;
    public scrollLabels: boolean;
    public showLabel: boolean;
    public showPlayerIcon: boolean;
    public showControlIcons: boolean;
    public showControlIconsPlay: boolean;
    public showControlIconsNext: boolean;
    public showControlIconsPrevious: boolean;
    public showControlIconsSeekForward: boolean;
    public showControlIconsSeekBackward: boolean;
    public coloredPlayIcon: boolean;
    public extensionPosition: ExtensionPositions;
    public extensionIndex: number;
    public elementsOrder: string[];
    public labelsOrder: string[];
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

    private watchProxy: StdPropertiesInterface;
    private playerProxies: Map<string, PlayerProxy>;

    private watchIfaceInfo: Gio.DBusInterfaceInfo;
    private mprisIfaceInfo: Gio.DBusInterfaceInfo;
    private mprisPlayerIfaceInfo: Gio.DBusInterfaceInfo;

    public enable() {
        this.playerProxies = new Map();

        this.initSettings();
        this.initProxies().catch(handleError);

        debugLog("Enabled");
    }

    private initSettings() {
        this.settings = this.getSettings();

        this.width = this.settings.get_uint("width");
        this.hideMediaNotification = this.settings.get_boolean("hide-media-notification");
        this.scrollLabels = this.settings.get_boolean("scroll-labels");
        this.showLabel = this.settings.get_boolean("show-label");
        this.showPlayerIcon = this.settings.get_boolean("show-player-icon");
        this.showControlIcons = this.settings.get_boolean("show-control-icons");
        this.showControlIconsPlay = this.settings.get_boolean("show-control-icons-play");
        this.showControlIconsNext = this.settings.get_boolean("show-control-icons-next");
        this.showControlIconsPrevious = this.settings.get_boolean("show-control-icons-previous");
        this.showControlIconsSeekForward = this.settings.get_boolean("show-control-icons-seek-forward");
        this.showControlIconsSeekBackward = this.settings.get_boolean("show-control-icons-seek-backward");
        this.coloredPlayIcon = this.settings.get_boolean("colored-play-icon");
        this.extensionPosition = enumValueByIndex(ExtensionPositions, this.settings.get_enum("extension-position"));
        this.extensionIndex = this.settings.get_uint("extension-index");
        this.elementsOrder = this.settings.get_strv("elements-order");
        this.labelsOrder = this.settings.get_strv("labels-order");
        this.shortcutShowMenu = this.settings.get_string("shortcut-show-menu");
        this.mouseActionLeft = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-left"));
        this.mouseActionMiddle = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-middle"));
        this.mouseActionRight = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-right"));
        this.mouseActionDouble = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-double"));
        this.mouseActionScrollUp = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-scroll-up"));
        this.mouseActionScrollDown = enumValueByIndex(MouseActions, this.settings.get_enum("mouse-action-scroll-down"));
        this.cacheArt = this.settings.get_boolean("cache-art");
        this.blacklistedPlayers = this.settings.get_strv("blacklisted-players");

        this.settings.connect("changed::width", () => {
            this.width = this.settings.get_uint("width");
        });

        this.settings.connect("changed::hide-media-notification", () => {
            this.hideMediaNotification = this.settings.get_boolean("hide-media-notification");
        });

        this.settings.connect("changed::scroll-labels", () => {
            this.scrollLabels = this.settings.get_boolean("scroll-labels");
        });

        this.settings.connect("changed::show-label", () => {
            this.showLabel = this.settings.get_boolean("show-label");
        });

        this.settings.connect("changed::show-player-icon", () => {
            this.showPlayerIcon = this.settings.get_boolean("show-player-icon");
        });

        this.settings.connect("changed::show-control-icons", () => {
            this.showControlIcons = this.settings.get_boolean("show-control-icons");
        });

        this.settings.connect("changed::show-control-icons-play", () => {
            this.showControlIconsPlay = this.settings.get_boolean("show-control-icons-play");
        });

        this.settings.connect("changed::show-control-icons-next", () => {
            this.showControlIconsNext = this.settings.get_boolean("show-control-icons-next");
        });

        this.settings.connect("changed::show-control-icons-previous", () => {
            this.showControlIconsPrevious = this.settings.get_boolean("show-control-icons-previous");
        });

        this.settings.connect("changed::show-control-icons-seek-forward", () => {
            this.showControlIconsSeekForward = this.settings.get_boolean("show-control-icons-seek-forward");
        });

        this.settings.connect("changed::show-control-icons-seek-backward", () => {
            this.showControlIconsSeekBackward = this.settings.get_boolean("show-control-icons-seek-backward");
        });

        this.settings.connect("changed::colored-play-icon", () => {
            this.coloredPlayIcon = this.settings.get_boolean("colored-play-icon");
        });

        this.settings.connect("changed::extension-position", () => {
            const enumIndex = this.settings.get_enum("extension-position");
            this.extensionPosition = enumValueByIndex(ExtensionPositions, enumIndex);
        });

        this.settings.connect("changed::extension-index", () => {
            this.extensionIndex = this.settings.get_uint("extension-index");
        });

        this.settings.connect("changed::elements-order", () => {
            this.elementsOrder = this.settings.get_strv("elements-order");
        });

        this.settings.connect("changed::labels-order", () => {
            this.labelsOrder = this.settings.get_strv("labels-order");
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
        const watchInterface = watchNodeInfo.interfaces.find((iface) => iface.name === "org.freedesktop.DBus");

        this.watchIfaceInfo = watchInterface;

        const mprisNodeInfo = Gio.DBusNodeInfo.new_for_xml(mprisNodeXml);
        const mprisInterface = mprisNodeInfo.interfaces.find((iface) => iface.name === "org.mpris.MediaPlayer2");
        const mprisPlayerInterface = mprisNodeInfo.interfaces.find(
            (iface) => iface.name === "org.mpris.MediaPlayer2.Player",
        );

        const mprisInterfaceString = new GLib.String("");
        mprisInterface.generate_xml(4, mprisInterfaceString);

        const mprisPlayerInterfaceString = new GLib.String("");
        mprisPlayerInterface.generate_xml(4, mprisPlayerInterfaceString);

        this.mprisIfaceInfo = mprisInterface;
        this.mprisPlayerIfaceInfo = mprisPlayerInterface;

        const initWatchSuccess = await this.initWatchProxy().catch(handleError);

        if (initWatchSuccess === false) {
            errorLog("Failed to init watch proxy");
            return;
        }

        const namesResult = await this.watchProxy.ListNamesAsync().catch(handleError);

        if (namesResult == null) {
            errorLog("Failed to get bus names");
            return;
        }

        const busNames = namesResult[0];

        for (const busName of busNames) {
            if (busName.startsWith("org.mpris.MediaPlayer2") === false) {
                continue;
            }

            await this.addPlayer(busName);
        }
    }

    private async initWatchProxy() {
        this.watchProxy = await createDbusProxy<StdPropertiesInterface>(
            this.watchIfaceInfo,
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
        ).catch(handleError);

        if (this.watchProxy == null) {
            return false;
        }

        this.watchProxy.connectSignal("NameOwnerChanged", (proxy, senderName, [busName, oldOwner, newOwner]) => {
            if (busName.startsWith("org.mpris.MediaPlayer2") === false) {
                return;
            }

            debugLog(`NameOwnerChanged: ${busName} ${oldOwner} ${newOwner}`);

            if (newOwner === "") {
                debugLog(`Removing player ${busName}`);
                this.removePlayer(busName);
            } else if (oldOwner === "") {
                debugLog(`Adding player ${busName}`);
                this.addPlayer(busName);
            }
        });

        return true;
    }

    private async addPlayer(busName: string) {
        try {
            const playerProxy = new PlayerProxy(busName);
            const initSuccess = await playerProxy
                .initProxies(this.mprisIfaceInfo, this.mprisPlayerIfaceInfo)
                .catch(handleError);

            if (initSuccess === false) {
                return;
            }

            this.playerProxies.set(busName, playerProxy);
            this.setActivePlayer();
        } catch (e) {
            errorLog(e);
        }
    }

    private removePlayer(busName: string) {
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
            if (playerProxy.isBlacklisted) {
                continue;
            }

            if (playerProxy.isInvalid) {
                continue;
            }

            if (playerProxy.isPinned) {
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

    private addPanelButton(busName: string) {
        const playerProxy = this.playerProxies.get(busName);

        if (playerProxy == null) {
            return;
        }

        this.panelBtn = new PanelButton(playerProxy, this);
        Main.panel.addToStatusArea("Media Controls", this.panelBtn, this.extensionIndex, this.extensionPosition);
    }

    private removePanelButton() {
        this.panelBtn.destroy();
        this.panelBtn = null;
    }

    private destroySettings() {
        this.settings = null;

        this.width = null;
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
        this.coloredPlayIcon = null;
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
        this.playerProxies = null;
        this.watchProxy = null;
        this.watchIfaceInfo = null;
        this.mprisIfaceInfo = null;
        this.mprisPlayerIfaceInfo = null;

        this.destroySettings();

        debugLog("Disabled");
    }
}
