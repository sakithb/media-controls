// Types common to the extension and the preferences window

import { Enum } from "../general.js";

export const MPRIS_OBJECT_PATH = "/org/mpris/MediaPlayer2";
export const DBUS_OBJECT_PATH = "/org/freedesktop/DBus";
export const MPRIS_IFACE_NAME = "org.mpris.MediaPlayer2";
export const MPRIS_PLAYER_IFACE_NAME = "org.mpris.MediaPlayer2.Player";
export const DBUS_PROPERTIES_IFACE_NAME = "org.freedesktop.DBus.Properties";
export const DBUS_IFACE_NAME = "org.freedesktop.DBus";

export const PanelElements = {
    ICON: "Player icon",
    LABEL: "Label",
    CONTROLS: "Player controls",
} as const;

export const LabelTypes = {
    ARTIST: "Artist",
    TITLE: "Title",
    ALBUM: "Album",
    DISC_NUMBER: "Disc Number",
    TRACK_NUMBER: "Track Number",
} as const;

export const ExtensionPositions = {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
} as const;

export const MouseActions = {
    NONE: "None",
    PLAY_PAUSE: "Play/Pause",
    PLAY: "Play",
    PAUSE: "Pause",
    NEXT_TRACK: "Next track",
    PREVIOUS_TRACK: "Previous track",
    VOLUME_UP: "Volume up",
    VOLUME_DOWN: "Volume down",
    TOGGLE_LOOP: "Toggle loop",
    TOGGLE_SHUFFLE: "Toggle shuffle",
    SHOW_POPUP_MENU: "Show popup menu",
    RAISE_PLAYER: "Raise player",
    QUIT_PLAYER: "Quit player",
} as const;

export type PanelElements = Enum<typeof PanelElements>;
export type LabelTypes = Enum<typeof LabelTypes>;
export type ExtensionPositions = Enum<typeof ExtensionPositions>;
export type MouseActions = Enum<typeof MouseActions>;
