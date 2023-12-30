import { Enum } from "./common.js";

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

export const ControlIcons = {
    SEEK_BACKWARD: "media-skip-backward-symbolic",
    PREVIOUS_TRACK: "media-skip-backward-symbolic",
    PLAY: "media-playback-start-symbolic",
    PAUSE: "media-playback-start-symbolic",
    NEXT_TRACK: "media-skip-forward-symbolic",
    SEEK_FORWARD: "media-skip-forward-symbolic",
};

export type PanelElements = Enum<typeof PanelElements>;
export type LabelTypes = Enum<typeof LabelTypes>;
export type ExtensionPositions = Enum<typeof ExtensionPositions>;
export type MouseActions = Enum<typeof MouseActions>;
export type PlaybackStatus = Enum<typeof PlaybackStatus>;
export type LoopStatus = Enum<typeof LoopStatus>;
