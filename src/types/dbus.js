/** @import { KeysOf } from './misc.js' */
/** @import { LoopStatus, PlaybackStatus } from './enums/common.js' */
export {};
/**
 * @typedef {[T]} MethodResult
 * @template T
 */
/**
 * @typedef {Object} MprisPlayerInterfaceMetadataUnpacked
 * @property {string} "mpris:trackid"
 * @property {number} "mpris:length"
 * @property {string} "mpris:artUrl"
 * @property {string} "xesam:album"
 * @property {string[]} "xesam:albumArtist"
 * @property {string[]} "xesam:artist"
 * @property {string} "xesam:asText"
 * @property {number} "xesam:audioBPM"
 * @property {number} "xesam:autoRating"
 * @property {string[]} "xesam:comment"
 * @property {string[]} "xesam:composer"
 * @property {string} "xesam:contentCreated"
 * @property {number} "xesam:discNumber"
 * @property {string} "xesam:firstUsed"
 * @property {string[]} "xesam:genre"
 * @property {string} "xesam:lastUsed"
 * @property {string[]} "xesam:lyricist"
 * @property {string} "xesam:title"
 * @property {number} "xesam:trackNumber"
 * @property {string} "xesam:url"
 * @property {number} "xesam:useCount"
 * @property {number} "xesam:userRating"
 */
/**
 * @typedef {Object} MprisPlayerInterfaceMetadata
 * @property {GLib.Variant} "mpris:trackid"
 * @property {GLib.Variant} "mpris:length"
 * @property {GLib.Variant} "mpris:artUrl"
 * @property {GLib.Variant} "xesam:album"
 * @property {GLib.Variant} "xesam:albumArtist"
 * @property {GLib.Variant} "xesam:artist"
 * @property {GLib.Variant} "xesam:asText"
 * @property {GLib.Variant} "xesam:audioBPM"
 * @property {GLib.Variant} "xesam:autoRating"
 * @property {GLib.Variant} "xesam:comment"
 * @property {GLib.Variant} "xesam:composer"
 * @property {GLib.Variant} "xesam:contentCreated"
 * @property {GLib.Variant} "xesam:discNumber"
 * @property {GLib.Variant} "xesam:firstUsed"
 * @property {GLib.Variant} "xesam:genre"
 * @property {GLib.Variant} "xesam:lastUsed"
 * @property {GLib.Variant} "xesam:lyricist"
 * @property {GLib.Variant} "xesam:title"
 * @property {GLib.Variant} "xesam:trackNumber"
 * @property {GLib.Variant} "xesam:url"
 * @property {GLib.Variant} "xesam:useCount"
 * @property {GLib.Variant} "xesam:userRating"
 */
/**
 * @typedef {Object} PlayerProxyDBusProperties
 * @property {PlaybackStatus} PlaybackStatus
 * @property {LoopStatus} LoopStatus
 * @property {number} Rate
 * @property {boolean} Shuffle
 * @property {MprisPlayerInterfaceMetadata | MprisPlayerInterfaceMetadataUnpacked} Metadata
 * @property {number} Volume
 * @property {number} Position
 * @property {number} MinimumRate
 * @property {number} MaximumRate
 * @property {boolean} CanGoNext
 * @property {boolean} CanGoPrevious
 * @property {boolean} CanPlay
 * @property {boolean} CanPause
 * @property {boolean} CanSeek
 * @property {boolean} CanControl
 * @property {boolean} CanQuit
 * @property {boolean} Fullscreen
 * @property {boolean} CanSetFullscreen
 * @property {boolean} CanRaise
 * @property {boolean} HasTrackList
 * @property {string} Identity
 * @property {string} DesktopEntry
 * @property {string[]} SupportedUriSchemes
 * @property {string[]} SupportedMimeTypes
 */
/**
 * @typedef {Object} PlayerProxyProperties
 * @property {boolean} IsInvalid
 * @property {boolean} IsPinned
 */
/**
 * @typedef {Object} PropertiesSignalArgs
 * @property {[        interfaceName: string,        changedProperties: { [k in KeysOf<PlayerProxyDBusProperties>]: GLib.Variant },        invalidatedProperties: string[],    ]} PropertiesChanged
 */
/**
 * @typedef {Object} MprisPlayerSignalArgs
 * @property {number} Seeked
 */
/**
 * @typedef {Object} StdPropertiesSignalArgs
 * @property {[busName: string, oldOwner: string, newOwner: string]} NameOwnerChanged
 * @property {string} NameLost
 * @property {string} NameAcquired
 */
/**
 * @typedef {Object} BaseInterface
 */
/**
 * @typedef {Object} PropertiesInterface
 */
/**
 * @typedef {Object} MprisInterface
 * @property {boolean} CanQuit
 * @property {boolean} [Fullscreen]
 * @property {boolean} [CanSetFullscreen]
 * @property {boolean} CanRaise
 * @property {boolean} HasTrackList
 * @property {string} Identity
 * @property {string} [DesktopEntry]
 * @property {string[]} SupportedUriSchemes
 * @property {string[]} SupportedMimeTypes
 */
/**
 * @typedef {Object} MprisPlayerInterface
 * @property {PlaybackStatus} PlaybackStatus
 * @property {LoopStatus} [LoopStatus]
 * @property {number} Rate
 * @property {boolean} [Shuffle]
 * @property {MprisPlayerInterfaceMetadata} Metadata
 * @property {number} Volume
 * @property {number} Position
 * @property {number} MinimumRate
 * @property {number} MaximumRate
 * @property {boolean} CanGoNext
 * @property {boolean} CanGoPrevious
 * @property {boolean} CanPlay
 * @property {boolean} CanPause
 * @property {boolean} CanSeek
 * @property {boolean} CanControl
 */
/**
 * @typedef {Object} StdInterface
 */
