/** @import Gio from 'gi://Gio' */
/** @import GLib from 'gi://GLib' */

/** @import { KeysOf } from './misc.js' */
/** @import { LoopStatus, PlaybackStatus } from './enums/common.js' */

/**
 * @typedef {[T]} MethodResult
 * @template T
 */

/**
 * @typedef {{
 *     'mpris:trackid': string,
 *     'mpris:length': number,
 *     'mpris:artUrl': string,
 *     'xesam:album': string,
 *     'xesam:albumArtist': string[],
 *     'xesam:artist': string[],
 *     'xesam:asText': string,
 *     'xesam:audioBPM': number,
 *     'xesam:autoRating': number,
 *     'xesam:comment': string[],
 *     'xesam:composer': string[],
 *     'xesam:contentCreated': string,
 *     'xesam:discNumber': number,
 *     'xesam:firstUsed': string,
 *     'xesam:genre': string[],
 *     'xesam:lastUsed': string,
 *     'xesam:lyricist': string[],
 *     'xesam:title': string,
 *     'xesam:trackNumber': number,
 *     'xesam:url': string,
 *     'xesam:useCount': number,
 *     'xesam:userRating': number,
 * }} MprisPlayerInterfaceMetadataUnpacked
 */

/**
 * @typedef {{
 *     'mpris:trackid': GLib.Variant,
 *     'mpris:length': GLib.Variant,
 *     'mpris:artUrl': GLib.Variant,
 *     'xesam:album': GLib.Variant,
 *     'xesam:albumArtist': GLib.Variant,
 *     'xesam:artist': GLib.Variant,
 *     'xesam:asText': GLib.Variant,
 *     'xesam:audioBPM': GLib.Variant,
 *     'xesam:autoRating': GLib.Variant,
 *     'xesam:comment': GLib.Variant,
 *     'xesam:composer': GLib.Variant,
 *     'xesam:contentCreated': GLib.Variant,
 *     'xesam:discNumber': GLib.Variant,
 *     'xesam:firstUsed': GLib.Variant,
 *     'xesam:genre': GLib.Variant,
 *     'xesam:lastUsed': GLib.Variant,
 *     'xesam:lyricist': GLib.Variant,
 *     'xesam:title': GLib.Variant,
 *     'xesam:trackNumber': GLib.Variant,
 *     'xesam:url': GLib.Variant,
 *     'xesam:useCount': GLib.Variant,
 *     'xesam:userRating': GLib.Variant,
 * }} MprisPlayerInterfaceMetadata
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
 * @typedef {PlayerProxyDBusProperties & {
 *     IsInvalid: boolean,
 *     IsPinned: boolean,
 * }} PlayerProxyProperties
 */

/**
 * @typedef {Object} PropertiesSignalArgs
 * @property {[
 *     interfaceName: string,
 *     changedProperties: { [k in KeysOf<PlayerProxyDBusProperties>]: GLib.Variant },
 *     invalidatedProperties: string[],
 * ]} PropertiesChanged
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
 * @template T
 * @typedef {Omit<Gio.DBusProxy, "connectSignal"> & {
 *   connectSignal: <K extends keyof T>(
 *     name: K,
 *     callback: (proxy: Gio.DBusProxy, senderName: string, args: T[K]) => void
 *   ) => number;
 * }} BaseInterface
 */

/**
 * @typedef {BaseInterface<PropertiesSignalArgs> & {
 *   GetAsync: (interfaceName: string, propertyName: string) => Promise<MethodResult<GLib.Variant>>,
 *   GetAllAsync: (interfaceName: string) => Promise<MethodResult<GLib.Variant>>,
 *   SetAsync: (interfaceName: string, propertyName: string, value: GLib.Variant) => Promise<void>,
 *   GetSync: (interfaceName: string, propertyName: string) => MethodResult<GLib.Variant>,
 *   GetAllSync: (interfaceName: string) => MethodResult<GLib.Variant>,
 *   SetSync: (interfaceName: string, propertyName: string, value: GLib.Variant) => void,
 *   GetRemote: (
 *     interfaceName: string,
 *     propertyName: string,
 *     callback: (returnValue: MethodResult<GLib.Variant>, errorObj: unknown, fdList: unknown[]) => void,
 *   ) => void,
 *   GetAllRemote: (
 *     interfaceName: string,
 *     callback: (returnValue: MethodResult<GLib.Variant>, errorObj: unknown, fdList: unknown[]) => void,
 *   ) => void,
 *   SetRemote: (
 *     interfaceName: string,
 *     propertyName: string,
 *     value: GLib.Variant,
 *     callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void,
 *   ) => void,
 * }} PropertiesInterface
 */

/**
 * @typedef {BaseInterface<object> & {
 *   CanQuit: boolean,
 *   Fullscreen?: boolean,
 *   CanSetFullscreen?: boolean,
 *   CanRaise: boolean,
 *   HasTrackList: boolean,
 *   Identity: string,
 *   DesktopEntry?: string,
 *   SupportedUriSchemes: string[],
 *   SupportedMimeTypes: string[],
 *   RaiseRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   QuitRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   RaiseAsync: () => Promise<void>,
 *   QuitAsync: () => Promise<void>,
 *   RaiseSync: () => void,
 *   QuitSync: () => void,
 * }} MprisInterface
 */

/**
 * @typedef {BaseInterface<MprisPlayerSignalArgs> & {
 *   PlaybackStatus: PlaybackStatus,
 *   LoopStatus?: LoopStatus,
 *   Rate: number,
 *   Shuffle?: boolean,
 *   Metadata: MprisPlayerInterfaceMetadata,
 *   Volume: number,
 *   Position: number,
 *   MinimumRate: number,
 *   MaximumRate: number,
 *   CanGoNext: boolean,
 *   CanGoPrevious: boolean,
 *   CanPlay: boolean,
 *   CanPause: boolean,
 *   CanSeek: boolean,
 *   CanControl: boolean,
 *   NextRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   PreviousRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   PauseRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   PlayPauseRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   StopRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   PlayRemote: (callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   SeekRemote: (Offset: number, callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   SetPositionRemote: (
 *     TrackId: string,
 *     Position: number,
 *     callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void,
 *   ) => void,
 *   OpenUriRemote: (Uri: string, callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void) => void,
 *   NextAsync: () => Promise<void>,
 *   PreviousAsync: () => Promise<void>,
 *   PauseAsync: () => Promise<void>,
 *   PlayPauseAsync: () => Promise<void>,
 *   StopAsync: () => Promise<void>,
 *   PlayAsync: () => Promise<void>,
 *   SeekAsync: (Offset: number) => Promise<void>,
 *   SetPositionAsync: (TrackId: string, Position: number) => Promise<void>,
 *   OpenUriAsync: (Uri: string) => Promise<void>,
 *   NextSync: () => void,
 *   PreviousSync: () => void,
 *   PauseSync: () => void,
 *   PlayPauseSync: () => void,
 *   StopSync: () => void,
 *   PlaySync: () => void,
 *   SeekSync: (position: number) => void,
 *   SetPositionSync: (trackId: string, position: number) => void,
 *   OpenUriSync: (uri: string) => void,
 * }} MprisPlayerInterface
 */

/**
 * @typedef {BaseInterface<StdPropertiesSignalArgs> & {
 *   ListNamesAsync: () => Promise<MethodResult<string[]>>,
 *   ListNamesSync: () => MethodResult<string[]>,
 *   ListNamesRemote: (
 *     callback: (returnValue: MethodResult<string[]>, errorObj: unknown, fdList: unknown[]) => void,
 *   ) => void,
 * }} StdInterface
 */

export {};
