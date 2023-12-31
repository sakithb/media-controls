import Clutter from "gi://Clutter?version=13";
import { Enum } from "../common.js";

export const PlaybackStatus = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    STOPPED: "Stopped",
} as const;

export const LoopStatus = {
    NONE: "None",
    TRACK: "Track",
    PLAYLIST: "Playlist",
} as const;

export const ControlIconOptions = {
    LOOP_NONE: {
        name: "loop",
        iconName: "media-playlist-no-repeat-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.START,
        },
        panelProps: {
            index: null,
        },
    },
    LOOP_TRACK: {
        name: "loop",
        iconName: "media-playlist-repeat-song-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.START,
        },
        panelProps: {
            index: null,
        },
    },
    LOOP_PLAYLIST: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.START,
        },
        panelProps: {
            index: null,
        },
    },
    SEEK_BACKWARD: {
        name: "seekbackward",
        iconName: "media-seek-backward-symbolic",
        menuProps: {},
        panelProps: {
            index: 0,
        },
    },
    PREVIOUS: {
        name: "previous",
        iconName: "media-skip-backward-symbolic",
        menuProps: {
            xExpand: true,
            xAlign: Clutter.ActorAlign.END,
            marginRight: 5,
        },
        panelProps: {
            index: 1,
        },
    },
    PLAY: {
        name: "playpause",
        iconName: "media-playback-start-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.CENTER,
        },
        panelProps: {
            index: 2,
        },
    },
    PAUSE: {
        name: "playpause",
        iconName: "media-playback-pause-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.CENTER,
        },
        panelProps: {
            index: 2,
        },
    },
    NEXT: {
        name: "next",
        iconName: "media-skip-forward-symbolic",
        menuProps: {
            xExpand: true,
            xAlign: Clutter.ActorAlign.START,
            marginLeft: 5,
        },
        panelProps: {
            index: 3,
        },
    },
    SEEK_FORWARD: {
        name: "seekforward",
        iconName: "media-seek-forward-symbolic",
        menuProps: {},
        panelProps: {
            index: 4,
        },
    },
    SHUFFLE_ON: {
        name: "shuffle",
        iconName: "media-playlist-shuffle-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.END,
        },
        panelProps: {
            index: null,
        },
    },
    SHUFFLE_OFF: {
        name: "shuffle",
        iconName: "media-playlist-no-shuffle-symbolic",
        menuProps: {
            xExpand: false,
            xAlign: Clutter.ActorAlign.END,
        },
        panelProps: {
            index: null,
        },
    },
} as const;

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
} as const;

export type WidgetFlags = Enum<typeof WidgetFlags>;
export type ControlIconOptions = Enum<typeof ControlIconOptions>;
export type LoopStatus = Enum<typeof LoopStatus>;
export type PlaybackStatus = Enum<typeof PlaybackStatus>;
