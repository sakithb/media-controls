/** @import { PlaybackStatus } from '../../types/enums/common.js' */
/** @import { MprisInterface, MprisPlayerInterface, PropertiesInterface, PlayerProxyProperties, MprisPlayerInterfaceMetadata, MprisPlayerInterfaceMetadataUnpacked } from '../../types/dbus.js' */
/** @import { KeysOf } from '../../types/misc.js' */
import { MPRIS_PLAYER_IFACE_NAME, MPRIS_OBJECT_PATH, LoopStatus } from "../../types/enums/common.js";
import { errorLog, handleError } from "../../utils/common.js";
import { createDbusProxy } from "../../utils/shell_only.js";

import GLib from "gi://GLib";

/** @import Gio from 'gi://Gio' */

/**
 * @typedef {Map<
 *     KeysOf<PlayerProxyProperties>,
 *     ((value: PlayerProxyProperties[KeysOf<PlayerProxyProperties>]) => void)[]
 * >} PlayerProxyChangeListeners
 */

export default class PlayerProxy {
    /**
     * @private
     * @type {boolean}
     */
    isPinned;
    /**
     * @private
     * @type {MprisInterface}
     */
    mprisProxy;
    /**
     * @private
     * @type {MprisPlayerInterface}
     */
    mprisPlayerProxy;
    /**
     * @private
     * @type {PropertiesInterface}
     */
    propertiesProxy;
    /**
     * @private
     * @type {PlayerProxyChangeListeners}
     */
    changeListeners;
    /**
     * @private
     * @type {number}
     */
    pollSourceId;

    /**
     * @public
     * @type {string}
     */
    busName;
    /**
     * @public
     * @type {boolean}
     */
    isInvalid;

    /**
     * @param {string} busName
     */
    constructor(busName) {
        this.busName = busName;
        this.isPinned = false;
        this.isInvalid = true;
        this.changeListeners = new Map();
        this._cachedProperties = new Map();
    }

    /**
     * @private
     * @param {any} val1
     * @param {any} val2
     * @returns {boolean}
     */
    _areValuesEqual(val1, val2) {
        if (val1 === val2) {
            return true;
        }

        if (typeof val1 !== "object" || val1 === null || typeof val2 !== "object" || val2 === null) {
            return false;
        }

        return JSON.stringify(val1) === JSON.stringify(val2);
    }

    /**
     * @public
     * @param {Gio.DBusInterfaceInfo} mprisIface
     * @param {Gio.DBusInterfaceInfo} mprisPlayerIface
     * @param {Gio.DBusInterfaceInfo} propertiesIface
     * @returns {Promise<boolean>}
     */
    async initPlayer(mprisIface, mprisPlayerIface, propertiesIface) {
        const mprisProxy = createDbusProxy(mprisIface, this.busName, MPRIS_OBJECT_PATH).catch(handleError);
        const mprisPlayerProxy = createDbusProxy(mprisPlayerIface, this.busName, MPRIS_OBJECT_PATH).catch(handleError);
        const propertiesProxy = createDbusProxy(propertiesIface, this.busName, MPRIS_OBJECT_PATH).catch(handleError);
        const proxies = await Promise.all([mprisProxy, mprisPlayerProxy, propertiesProxy]).catch(handleError);
        if (proxies == null) {
            errorLog("Failed to create proxies");
            return false;
        }
        this.mprisProxy = proxies[0];
        this.mprisPlayerProxy = proxies[1];
        this.propertiesProxy = proxies[2];

        const allProperties = await this.propertiesProxy.GetAllAsync(MPRIS_PLAYER_IFACE_NAME).catch(handleError);
        if (allProperties != null) {
            for (const [property, value] of Object.entries(allProperties[0])) {
                this._cachedProperties.set(property, value.recursiveUnpack());
            }
        }

        this.propertiesProxy.connectSignal("PropertiesChanged", (proxy, senderName, [, changedProperties]) => {
            for (const [property, value] of Object.entries(changedProperties)) {
                const unpackedValue = value.recursiveUnpack();
                const cachedValue = this._cachedProperties.get(property);

                const hasChanged = !this._areValuesEqual(unpackedValue, cachedValue);

                if (hasChanged) {
                    this._cachedProperties.set(property, unpackedValue);
                    this.callOnChangedListeners(/** @type {KeysOf<PlayerProxyProperties>} */ (property), unpackedValue);
                }
            }
        });
        this.onChanged("Metadata", this.validatePlayer.bind(this));
        this.onChanged("Identity", this.validatePlayer.bind(this));
        this.onChanged("DesktopEntry", this.validatePlayer.bind(this));
        this.validatePlayer();
        this.pollTillInitialized();
        return true;
    }

    /**
     * @public
     * @returns {void}
     */
    pinPlayer() {
        this.isPinned = true;
        this.callOnChangedListeners("IsPinned", this.isPinned);
    }

    /**
     * @public
     * @returns {void}
     */
    unpinPlayer() {
        this.isPinned = false;
        this.callOnChangedListeners("IsPinned", this.isPinned);
    }

    /**
     * @public
     * @returns {boolean}
     */
    isPlayerPinned() {
        return this.isPinned;
    }

    /**
     * Some players don't set the initial position and metadata immediately on startup
     * @private
     * @returns {void}
     */
    pollTillInitialized() {
        const timeout = 5000;
        const interval = 250;
        let count = Math.ceil(timeout / interval);
        this.pollSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            count--;
            const positionPromise = this.propertiesProxy.GetAsync(MPRIS_PLAYER_IFACE_NAME, "Position");
            const metadataPromise = this.propertiesProxy.GetAsync(MPRIS_PLAYER_IFACE_NAME, "Metadata");
            Promise.all([positionPromise, metadataPromise])
                .then(([positionVariant, metadataVariant]) => {
                    const unpackedPosition = positionVariant[0].recursiveUnpack();
                    const unpackedMetadata = metadataVariant[0].recursiveUnpack();
                    if (unpackedPosition > 0 && unpackedMetadata["mpris:length"] > 0) {
                        this.mprisPlayerProxy.set_cached_property("Position", positionVariant[0]);
                        this.mprisPlayerProxy.set_cached_property("Metadata", metadataVariant[0]);
                        this.callOnChangedListeners("Metadata", unpackedMetadata);
                        GLib.source_remove(this.pollSourceId);
                    } else if (count <= 0) {
                        GLib.source_remove(this.pollSourceId);
                    }
                })
                .catch(() => {
                    GLib.source_remove(this.pollSourceId);
                });
            return GLib.SOURCE_CONTINUE;
        });
    }

    /**
     * @private
     * @returns {void}
     */
    validatePlayer() {
        const isValidName = this.mprisProxy.Identity || this.mprisProxy.DesktopEntry;
        const isValidMetadata = this.metadata && this.metadata["xesam:title"];
        this.isInvalid = !isValidName || !isValidMetadata;
        this.callOnChangedListeners("IsInvalid", this.isInvalid);
    }

    /**
     * @private
     * @param {MprisPlayerInterfaceMetadata} metadata
     * @returns {MprisPlayerInterfaceMetadataUnpacked | null}
     */
    unpackMetadata(metadata) {
        if (metadata == null) {
            return null;
        }

        const unpackedMetadata = {};
        for (const [key, value] of Object.entries(metadata)) {
            unpackedMetadata[key] = value.recursiveUnpack();
        }
        return /** @type {MprisPlayerInterfaceMetadataUnpacked} */ (unpackedMetadata);
    }

    /**
     * @private
     * @template {KeysOf<PlayerProxyProperties>} T
     * @param {T} property
     * @param {PlayerProxyProperties[T]} value
     * @returns {void}
     */
    callOnChangedListeners(property, value) {
        const listeners = this.changeListeners.get(property);
        if (listeners == null) {
            return;
        }
        for (const listener of listeners) {
            try {
                listener(value);
            } catch (error) {
                errorLog(`Failed to call listener for property ${property}:`, error);
            }
        }
    }

    /**
     * @returns {PlaybackStatus}
     */
    get playbackStatus() {
        return this.mprisPlayerProxy.PlaybackStatus;
    }

    /**
     * @returns {LoopStatus}
     */
    get loopStatus() {
        return this.mprisPlayerProxy.LoopStatus;
    }

    /**
     * @returns {number}
     */
    get rate() {
        return this.mprisPlayerProxy.Rate;
    }

    /**
     * @returns {boolean}
     */
    get shuffle() {
        return this.mprisPlayerProxy.Shuffle;
    }

    /**
     * @returns {MprisPlayerInterfaceMetadataUnpacked}
     */
    get metadata() {
        return this.unpackMetadata(this.mprisPlayerProxy.Metadata);
    }

    /**
     * @returns {number}
     */
    get volume() {
        return this.mprisPlayerProxy.Volume;
    }

    /**
     * @returns {Promise<number>}
     */
    get position() {
        return this.propertiesProxy
            .GetAsync(MPRIS_PLAYER_IFACE_NAME, "Position")
            .then((result) => {
                return result[0].get_int64();
            })
            .catch(() => {
                return null;
            });
    }

    /**
     * @returns {number}
     */
    get minimumRate() {
        return this.mprisPlayerProxy.MinimumRate;
    }

    /**
     * @returns {number}
     */
    get maximumRate() {
        return this.mprisPlayerProxy.MaximumRate;
    }

    /**
     * @returns {boolean}
     */
    get canGoNext() {
        return this.mprisPlayerProxy.CanGoNext;
    }

    /**
     * @returns {boolean}
     */
    get canGoPrevious() {
        return this.mprisPlayerProxy.CanGoPrevious;
    }

    /**
     * @returns {boolean}
     */
    get canPlay() {
        return this.mprisPlayerProxy.CanPlay;
    }

    /**
     * @returns {boolean}
     */
    get canPause() {
        return this.mprisPlayerProxy.CanPause;
    }

    /**
     * @returns {boolean}
     */
    get canSeek() {
        return this.mprisPlayerProxy.CanSeek;
    }

    /**
     * @returns {boolean}
     */
    get canControl() {
        return this.mprisPlayerProxy.CanControl;
    }

    /**
     * @returns {boolean}
     */
    get canQuit() {
        return this.mprisProxy.CanQuit;
    }

    /**
     * @returns {boolean}
     */
    get canRaise() {
        return this.mprisProxy.CanRaise;
    }

    /**
     * @returns {boolean}
     */
    get canSetFullscreen() {
        return this.mprisProxy.CanSetFullscreen;
    }

    /**
     * @returns {string}
     */
    get desktopEntry() {
        return this.mprisProxy.DesktopEntry;
    }

    /**
     * @returns {boolean}
     */
    get hasTrackList() {
        return this.mprisProxy.HasTrackList;
    }

    /**
     * @returns {string}
     */
    get identity() {
        return this.mprisProxy.Identity;
    }

    /**
     * @returns {string[]}
     */
    get supportedMimeTypes() {
        return this.mprisProxy.SupportedMimeTypes;
    }

    /**
     * @returns {string[]}
     */
    get supportedUriSchemes() {
        return this.mprisProxy.SupportedUriSchemes;
    }

    /**
     * @param {LoopStatus} loopStatus
     */
    set loopStatus(loopStatus) {
        this.mprisPlayerProxy.LoopStatus = loopStatus;
    }

    /**
     * @param {number} rate
     */
    set rate(rate) {
        this.mprisPlayerProxy.Rate = rate;
    }

    /**
     * @param {boolean} shuffle
     */
    set shuffle(shuffle) {
        this.mprisPlayerProxy.Shuffle = shuffle;
    }

    /**
     * @param {number} volume
     */
    set volume(volume) {
        this.mprisPlayerProxy.Volume = volume;
    }

    /**
     * @param {boolean} fullscreen
     */
    set fullscreen(fullscreen) {
        this.mprisProxy.Fullscreen = fullscreen;
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async next() {
        await this.mprisPlayerProxy.NextAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async previous() {
        await this.mprisPlayerProxy.PreviousAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async pause() {
        await this.mprisPlayerProxy.PauseAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async playPause() {
        await this.mprisPlayerProxy.PlayPauseAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async stop() {
        await this.mprisPlayerProxy.StopAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async play() {
        await this.mprisPlayerProxy.PlayAsync().catch(handleError);
    }

    /**
     * @public
     * @param {number} offset
     * @returns {Promise<void>}
     */
    async seek(offset) {
        await this.mprisPlayerProxy.SeekAsync(offset).catch(handleError);
    }

    /**
     * @public
     * @param {string} trackId
     * @param {number} position
     * @returns {Promise<void>}
     */
    async setPosition(trackId, position) {
        await this.mprisPlayerProxy.SetPositionAsync(trackId, position).catch(handleError);
    }

    /**
     * @public
     * @param {string} uri
     * @returns {Promise<void>}
     */
    async openUri(uri) {
        await this.mprisPlayerProxy.OpenUriAsync(uri).catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async raise() {
        await this.mprisProxy.RaiseAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {Promise<void>}
     */
    async quit() {
        await this.mprisProxy.QuitAsync().catch(handleError);
    }

    /**
     * @public
     * @returns {void}
     */
    toggleLoop() {
        const loopStatuses = Object.values(LoopStatus);
        const currentIndex = loopStatuses.findIndex((loop) => loop === this.loopStatus);
        const nextIndex = (currentIndex + 1 + loopStatuses.length) % loopStatuses.length;
        this.loopStatus = loopStatuses[nextIndex];
    }

    /**
     * @public
     * @returns {void}
     */
    toggleShuffle() {
        this.shuffle = !this.shuffle;
    }

    /**
     * @public
     * @param {(position: number) => void} callback
     * @returns {any}
     */
    onSeeked(callback) {
        const signalId = this.mprisPlayerProxy.connectSignal("Seeked", () => {
            this.position.then(callback);
        });
        return this.mprisPlayerProxy.disconnectSignal.bind(this.mprisPlayerProxy, signalId);
    }

    /**
     * @public
     * @template {KeysOf<PlayerProxyProperties>} T
     * @param {T} property
     * @param {(value: PlayerProxyProperties[T]) => void} callback
     * @returns {number}
     */
    onChanged(property, callback) {
        const listeners = this.changeListeners.get(property);
        let id;
        if (listeners == null) {
            id = 0;
            this.changeListeners.set(property, [callback]);
        } else {
            id = listeners.push(callback);
        }
        return id;
    }

    /**
     * @public
     * @template {KeysOf<PlayerProxyProperties>} T
     * @param {T} property
     * @param {number} id
     * @returns {void}
     */
    removeListener(property, id) {
        const listeners = this.changeListeners.get(property);
        if (listeners == null) {
            return;
        }
        listeners.splice(id, 1);
    }

    /**
     * @public
     * @returns {void}
     */
    onDestroy() {
        if (this.pollSourceId != null) {
            GLib.source_remove(this.pollSourceId);
        }
    }
}
