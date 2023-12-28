export enum PanelElements {
    ICON = "Player icon",
    LABEL = "Label",
    CONTROLS = "Player controls",
}

export enum LabelTypes {
    ARTIST = "Artist",
    TITLE = "Title",
    ALBUM = "Album",
    DISC_NUMBER = "Disc Number",
    TRACK_NUMBER = "Track Number",
}

export enum ExtensionPositions {
    LEFT = "left",
    CENTER = "center",
    RIGHT = "right",
}

export enum MouseActions {
    NONE = "None",
    PLAY_PAUSE = "Play/Pause",
    PLAY = "Play",
    PAUSE = "Pause",
    NEXT_TRACK = "Next track",
    PREVIOUS_TRACK = "Previous track",
    VOLUME_UP = "Volume up",
    VOLUME_DOWN = "Volume down",
    TOGGLE_LOOP = "Toggle loop",
    TOGGLE_SHUFFLE = "Toggle shuffle",
    SHOW_POPUP_MENU = "Show popup menu",
    RAISE_PLAYER = "Raise player",
    QUIT_PLAYER = "Quit player",
}

export enum PlaybackStatus {
    PLAYING = "Playing",
    PAUSED = "Paused",
    STOPPED = "Stopped",
}

export enum LoopStatus {
    NONE = "None",
    TRACK = "Track",
    PLAYLIST = "Playlist",
}
