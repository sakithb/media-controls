import { LoopStatus, PlayerbackStatus } from "./enums.js";

export interface PlayerInfoMetadata {
    "mpris:trackid": string;
    "mpris:length": number;
    "mpris:artUrl": string;
    "xesam:album": string;
    "xesam:albumArtist": string[];
    "xesam:artist": string[];
    "xesam:asText": string;
    "xesam:audioBPM": number;
    "xesam:autoRating": number;
    "xesam:comment": string[];
    "xesam:composer": string[];
    "xesam:contentCreated": string;
    "xesam:discNumber": number;
    "xesam:firstUsed": string;
    "xesam:genre": string[];
    "xesam:lastUsed": string;
    "xesam:lyricist": string[];
    "xesam:title": string;
    "xesam:trackNumber": number;
    "xesam:url": string;
    "xesam:useCount": number;
    "xesam:userRating": number;
}

export interface PlayerInfo {
    playbackStatus: PlayerbackStatus;
    loopStatus: LoopStatus;
    rate: number;
    shuffle: boolean;
    metadata: PlayerInfoMetadata;
    volume: number;
    position: number;
    minimumRate: number;
    maximumRate: number;
    canGoNext: boolean;
    canGoPrevious: boolean;
    canPlay: boolean;
    canPause: boolean;
    canSeek: boolean;
    canControl: boolean;
}

// export interface Player {
//     name: string;

// }
