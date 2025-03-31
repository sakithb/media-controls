/** @import { Enum } from '../misc.js' */
import Clutter from "gi://Clutter";
export const ControlIconOptions = {
    LOOP_NONE: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
                opacity: 160,
            },
        },
    },
    LOOP_TRACK: {
        name: "loop",
        iconName: "media-playlist-repeat-song-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
            },
        },
    },
    LOOP_PLAYLIST: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
            },
        },
    },
    SEEK_BACKWARD: {
        name: "seekbackward",
        iconName: "media-seek-backward-symbolic",
        panelProps: {
            index: 0,
        },
    },
    PREVIOUS: {
        name: "previous",
        iconName: "media-skip-backward-symbolic",
        menuProps: {
            index: 1,
            options: {
                xExpand: true,
                xAlign: Clutter.ActorAlign.END,
                marginRight: 5,
            },
        },
        panelProps: {
            index: 1,
        },
    },
    PLAY: {
        name: "playpause",
        iconName: "media-playback-start-symbolic",
        menuProps: {
            index: 2,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            },
        },
        panelProps: {
            index: 2,
        },
    },
    PAUSE: {
        name: "playpause",
        iconName: "media-playback-pause-symbolic",
        menuProps: {
            index: 2,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            },
        },
        panelProps: {
            index: 2,
        },
    },
    NEXT: {
        name: "next",
        iconName: "media-skip-forward-symbolic",
        menuProps: {
            index: 3,
            options: {
                xExpand: true,
                xAlign: Clutter.ActorAlign.START,
                marginLeft: 5,
            },
        },
        panelProps: {
            index: 3,
        },
    },
    SEEK_FORWARD: {
        name: "seekforward",
        iconName: "media-seek-forward-symbolic",
        panelProps: {
            index: 4,
        },
    },
    SHUFFLE_ON: {
        name: "shuffle",
        iconName: "media-playlist-shuffle-symbolic",
        menuProps: {
            index: 4,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.END,
            },
        },
    },
    SHUFFLE_OFF: {
        name: "shuffle",
        iconName: "media-playlist-consecutive-symbolic",
        menuProps: {
            index: 4,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.END,
            },
        },
    },
};
/** @typedef {Enum<typeof ControlIconOptions>} ControlIconOptions */
/**
 * @typedef {(typeof ControlIconOptions)[
 *     | "LOOP_NONE"
 *     | "LOOP_TRACK"
 *     | "LOOP_PLAYLIST"
 *     | "PREVIOUS"
 *     | "PLAY"
 *     | "PAUSE"
 *     | "NEXT"
 *     | "SHUFFLE_ON"
 *     | "SHUFFLE_OFF"]} MenuControlIconOptions
 */
/**
 * @typedef {(typeof ControlIconOptions)[
 *     | "SEEK_BACKWARD"
 *     | "PREVIOUS"
 *     | "PLAY"
 *     | "PAUSE"
 *     | "NEXT"
 *     | "SEEK_FORWARD"]} PanelControlIconOptions
 */
