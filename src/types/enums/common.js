/** @import { Enum } from '../misc.js' */
export const DBUS_IFACE_NAME = "org.freedesktop.DBus";
export const MPRIS_OBJECT_PATH = "/org/mpris/MediaPlayer2";
export const DBUS_OBJECT_PATH = "/org/freedesktop/DBus";
export const MPRIS_IFACE_NAME = "org.mpris.MediaPlayer2";
export const DBUS_PROPERTIES_IFACE_NAME = "org.freedesktop.DBus.Properties";
export const MPRIS_PLAYER_IFACE_NAME = "org.mpris.MediaPlayer2.Player";
export const PlaybackStatus = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
};
export const LoopStatus = {
    NONE: "None",
    TRACK: "Track",
    PLAYLIST: "Playlist",
};
export const ExtensionPositions = {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
};
export const LabelTypes = {
    ARTIST: "Artist",
    TITLE: "Title",
    ALBUM: "Album",
    DISC_NUMBER: "Disc Number",
    TRACK_NUMBER: "Track Number",
};
export const PanelElements = {
    ICON: 0,
    LABEL: 1,
    CONTROLS: 2,
};
export const MouseActions = {
    NONE: 0,
    PLAY_PAUSE: 1,
    PLAY: 2,
    PAUSE: 3,
    NEXT_TRACK: 4,
    PREVIOUS_TRACK: 5,
    VOLUME_UP: 6,
    VOLUME_DOWN: 7,
    TOGGLE_LOOP: 8,
    TOGGLE_SHUFFLE: 9,
    SHOW_POPUP_MENU: 10,
    RAISE_PLAYER: 11,
    QUIT_PLAYER: 12,
    OPEN_PREFERENCES: 13,
};
export const WidgetFlags = {
    PANEL_ICON: 1 << 0,
    PANEL_LABEL: 1 << 1,
    PANEL_CONTROLS_SEEK_BACKWARD: 1 << 2,
    PANEL_CONTROLS_PREVIOUS: 1 << 3,
    PANEL_CONTROLS_PLAYPAUSE: 1 << 4,
    PANEL_CONTROLS_NEXT: 1 << 5,
    PANEL_CONTROLS_SEEK_FORWARD: 1 << 6,
    PANEL_CONTROLS: (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
    PANEL: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
    PANEL_NO_REPLACE: 1 << 7,
    MENU_PLAYERS: 1 << 8,
    MENU_IMAGE: 1 << 9,
    MENU_LABELS: 1 << 10,
    MENU_SLIDER: 1 << 11,
    MENU_CONTROLS_LOOP: 1 << 12,
    MENU_CONTROLS_PREV: 1 << 13,
    MENU_CONTROLS_PLAYPAUSE: 1 << 14,
    MENU_CONTROLS_NEXT: 1 << 15,
    MENU_CONTROLS_SHUFFLE: 1 << 16,
    MENU_CONTROLS: (1 << 12) | (1 << 13) | (1 << 14) | (1 << 15) | (1 << 16),
    MENU: (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12) | (1 << 13) | (1 << 14) | (1 << 15) | (1 << 16),
    ALL: ~(-1 << 17),
};
/** @typedef {Enum<typeof PanelElements>} PanelElements */
/** @typedef {Enum<typeof LabelTypes>} LabelTypes */
/** @typedef {Enum<typeof ExtensionPositions>} ExtensionPositions */
/** @typedef {Enum<typeof MouseActions>} MouseActions */
/** @typedef {Enum<typeof LoopStatus>} LoopStatus */
/** @typedef {Enum<typeof PlaybackStatus>} PlaybackStatus */
/** @typedef {Enum<typeof WidgetFlags>} WidgetFlags */
