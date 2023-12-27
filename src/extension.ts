import Gio from "gi://Gio?version=2.0";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import { ExtensionPositions, MouseActions } from "./types/enums.js";
import { debugLog, enumValueByIndex } from "./utils/common.js";

Gio._promisify(Gio.DBusProxy, "new_for_bus", "new_for_bus_finish");

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

    public async enable() {
        this.initSettings();

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
        this.destroySettings();

        debugLog("Disabled");
    }
}
