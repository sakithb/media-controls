export enum PanelElements {
    ICON = "Player icon",
    LABEL = "Label",
    CONTROLS = "Player controls",
}

export enum LabelTypes {
    ARTIST = "Artist",
    TITLE = "Title",
    ALBUM = "Album",
}

export enum ExtensionPositions {
    LEFT = "Left",
    CENTER = "Center",
    RIGHT = "Right",
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

export enum PlayerbackStatus {
    PLAYING = "Playing",
    PAUSED = "Paused",
    STOPPED = "Stopped",
}

export enum LoopStatus {
    NONE = "None",
    TRACK = "Track",
    PLAYLIST = "Playlist",
}
