/** @import { Enum } from '../misc.js' */

/* -----------------------------------------------------------------------------
 * DBUS CONSTANTS
 * ----------------------------------------------------------------------------- */

export const DBUS_IFACE_NAME            = "org.freedesktop.DBus";
export const DBUS_OBJECT_PATH           = "/org/freedesktop/DBus";
export const DBUS_PROPERTIES_IFACE_NAME = "org.freedesktop.DBus.Properties";

export const MPRIS_OBJECT_PATH          = "/org/mpris/MediaPlayer2";
export const MPRIS_IFACE_NAME           = "org.mpris.MediaPlayer2";
export const MPRIS_PLAYER_IFACE_NAME    = "org.mpris.MediaPlayer2.Player";

/* -----------------------------------------------------------------------------
 * ENUMS
 * ----------------------------------------------------------------------------- */

/** @typedef {Enum<typeof PanelElements>} PanelElements */
export const PanelElements = Object.freeze({
    ICON:     0,
    LABEL:    1,
    CONTROLS: 2,
});

/** @typedef {Enum<typeof LabelTypes>} LabelTypes */
export const LabelTypes = Object.freeze({
    ARTIST:       "Artist",
    TITLE:        "Title",
    ALBUM:        "Album",
    DISC_NUMBER:  "Disc Number",
    TRACK_NUMBER: "Track Number",
});

/** @typedef {Enum<typeof ExtensionPositions>} ExtensionPositions */
export const ExtensionPositions = Object.freeze({
    LEFT:   "left",
    CENTER: "center",
    RIGHT:  "right",
});

/** @typedef {Enum<typeof MouseActions>} MouseActions */
export const MouseActions = Object.freeze({
    NONE:             0,
    PLAY_PAUSE:       1,
    PLAY:             2,
    PAUSE:            3,
    NEXT_TRACK:       4,
    PREVIOUS_TRACK:   5,
    VOLUME_UP:        6,
    VOLUME_DOWN:      7,
    TOGGLE_LOOP:      8,
    TOGGLE_SHUFFLE:   9,
    SHOW_POPUP_MENU:  10,
    RAISE_PLAYER:     11,
    QUIT_PLAYER:      12,
    OPEN_PREFERENCES: 13,
});

/** @typedef {Enum<typeof PlaybackStatus>} PlaybackStatus */
export const PlaybackStatus = Object.freeze({
    PLAYING: "Playing",
    PAUSED:  "Paused",
    STOPPED: "Stopped",
});

/** @typedef {Enum<typeof LoopStatus>} LoopStatus */
export const LoopStatus = Object.freeze({
    NONE:     "None",
    TRACK:    "Track",
    PLAYLIST: "Playlist",
});

/* -----------------------------------------------------------------------------
 * WIDGET FLAGS (Bitmasks)
 * ----------------------------------------------------------------------------- */

/** @typedef {Enum<typeof WidgetFlags>} WidgetFlags */
export const WidgetFlags = {
    // Panel Components
    PANEL_ICON:                   1 << 0,
    PANEL_LABEL:                  1 << 1,
    PANEL_CONTROLS_SEEK_BACKWARD: 1 << 2,
    PANEL_CONTROLS_PREVIOUS:      1 << 3,
    PANEL_CONTROLS_PLAYPAUSE:     1 << 4,
    PANEL_CONTROLS_NEXT:          1 << 5,
    PANEL_CONTROLS_SEEK_FORWARD:  1 << 6,
    
    // Panel Groups
    PANEL_CONTROLS: (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
    PANEL:          (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5) | (1 << 6),
    
    // Update Flags
    PANEL_NO_REPLACE: 1 << 7,

    // Menu Components
    MENU_PLAYERS:            1 << 8,
    MENU_IMAGE:              1 << 9,
    MENU_LABELS:             1 << 10,
    MENU_SLIDER:             1 << 11,
    MENU_CONTROLS_LOOP:      1 << 12,
    MENU_CONTROLS_PREV:      1 << 13,
    MENU_CONTROLS_PLAYPAUSE: 1 << 14,
    MENU_CONTROLS_NEXT:      1 << 15,
    MENU_CONTROLS_SHUFFLE:   1 << 16,
    
    // Menu Groups
    MENU_CONTROLS: (1 << 12) | (1 << 13) | (1 << 14) | (1 << 15) | (1 << 16),
    MENU:          (1 << 8) | (1 << 9) | (1 << 10) | (1 << 11) | (1 << 12) | (1 << 13) | (1 << 14) | (1 << 15) | (1 << 16),
    
    // All
    ALL: ~(-1 << 17),
};
// Note: WidgetFlags is not frozen because bitmask operations might conceptually expand, 
// though freezing it is also safe if no dynamic flags are added.
Object.freeze(WidgetFlags);