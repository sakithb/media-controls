/** @import { PlaybackStatus } from '../../types/enums/common1.js' */
/** @import { KeysOf } from '../../types/misc.js' */
/** @import { PlayerProxyProperties } from '../../types/dbus.js' */

import GLib from "gi://GLib";
import { 
    MPRIS_PLAYER_IFACE_NAME, 
    MPRIS_OBJECT_PATH, 
    LoopStatus 
} from "../../types/enums/common.js";
import { errorLog } from "../../utils/common.js";
import { createDbusProxy } from "../../utils/shell_only.js";

export default class PlayerProxy {
    /**
     * @param {string} busName
     */
    constructor(busName) {
        this.busName = busName;
        this.isPinned = false;
        this.isInvalid = true;
        
        // State
        this.mprisProxy = null;
        this.mprisPlayerProxy = null;
        this.propertiesProxy = null;
        
        // Listener System: Map<Property, Map<Id, Callback>>
        this.changeListeners = new Map();
        this._nextListenerId = 0;
        
        this.pollSourceId = null;
    }

    /**
     * @public
     * @returns {Promise<boolean>}
     */
    async initPlayer(mprisIface, mprisPlayerIface, propertiesIface) {
        try {
            const [mpris, player, props] = await Promise.all([
                createDbusProxy(mprisIface, this.busName, MPRIS_OBJECT_PATH),
                createDbusProxy(mprisPlayerIface, this.busName, MPRIS_OBJECT_PATH),
                createDbusProxy(propertiesIface, this.busName, MPRIS_OBJECT_PATH)
            ]);

            this.mprisProxy = mpris;
            this.mprisPlayerProxy = player;
            this.propertiesProxy = props;

            // Signal Handler: Updates cache and notifies listeners
            this.propertiesProxy.connectSignal("PropertiesChanged", (proxy, sender, [, changedProps]) => {
                const changes = changedProps; 
                for (const prop in changes) {
                    const value = changes[prop];
                    this.mprisPlayerProxy.set_cached_property(prop, value);
                    this._notifyListeners(prop, value.recursiveUnpack());
                }
            });

            // Validation listeners
            this.onChanged("Metadata", () => this.validatePlayer());
            this.onChanged("Identity", () => this.validatePlayer());
            this.onChanged("DesktopEntry", () => this.validatePlayer());

            this.validatePlayer();
            this._startInitializationPoller();
            
            return true;
        } catch (e) {
            errorLog(`Failed to init player ${this.busName}`, e);
            return false;
        }
    }

    /**
     * @public
     */
    pinPlayer() {
        this.isPinned = true;
        this._notifyListeners("IsPinned", true);
    }

    /**
     * @public
     */
    unpinPlayer() {
        this.isPinned = false;
        this._notifyListeners("IsPinned", false);
    }

    /**
     * @public
     * @returns {boolean}
     */
    isPlayerPinned() {
        return this.isPinned;
    }

    /**
     * Polls the player until valid metadata/position is available.
     * Some players (like Spotify) are empty immediately after startup.
     * @private
     */
    _startInitializationPoller() {
        const TIMEOUT_MS = 5000;
        const INTERVAL_MS = 250;
        let attemptsLeft = Math.ceil(TIMEOUT_MS / INTERVAL_MS);

        if (this.pollSourceId) {
            GLib.source_remove(this.pollSourceId);
        }

        this.pollSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, INTERVAL_MS, () => {
            attemptsLeft--;

            if (!this.propertiesProxy || attemptsLeft <= 0) {
                this.pollSourceId = null;
                return GLib.SOURCE_REMOVE;
            }

            Promise.all([
                this.propertiesProxy.GetAsync(MPRIS_PLAYER_IFACE_NAME, "Position").catch(() => null),
                this.propertiesProxy.GetAsync(MPRIS_PLAYER_IFACE_NAME, "Metadata").catch(() => null)
            ]).then(([posVar, metaVar]) => {
                if (!posVar || !metaVar) return;

                const pos = posVar[0].recursiveUnpack();
                const meta = metaVar[0].recursiveUnpack();

                // Success condition: We have data
                if (pos > 0 && meta["mpris:length"] > 0) {
                    this.mprisPlayerProxy.set_cached_property("Position", posVar[0]);
                    this.mprisPlayerProxy.set_cached_property("Metadata", metaVar[0]);
                    this._notifyListeners("Metadata", meta);
                    
                    // Stop polling
                    if (this.pollSourceId) {
                        GLib.source_remove(this.pollSourceId);
                        this.pollSourceId = null;
                    }
                }
            });

            return GLib.SOURCE_CONTINUE;
        });
    }

    /**
     * @private
     */
    validatePlayer() {
        const hasName = this.mprisProxy.Identity || this.mprisProxy.DesktopEntry;
        const hasTitle = this.metadata && this.metadata["xesam:title"];
        
        const isInvalid = !hasName || !hasTitle;
        
        if (this.isInvalid !== isInvalid) {
            this.isInvalid = isInvalid;
            this._notifyListeners("IsInvalid", this.isInvalid);
        }
    }

    /**
     * @private
     */
    unpackMetadata(metadata) {
        if (!metadata) return null;
        const unpacked = {};
        for (const [key, val] of Object.entries(metadata)) {
            unpacked[key] = val.recursiveUnpack();
        }
        return unpacked;
    }

    /* --- EVENT SYSTEM --- */

    /**
     * @public
     * @param {string} property
     * @param {Function} callback
     * @returns {number} Listener ID (for removal)
     */
    onChanged(property, callback) {
        if (!this.changeListeners.has(property)) {
            this.changeListeners.set(property, new Map());
        }
        
        const id = this._nextListenerId++;
        this.changeListeners.get(property).set(id, callback);
        return id;
    }

    /**
     * @public
     * @param {string} property
     * @param {number} id
     */
    removeListener(property, id) {
        const listeners = this.changeListeners.get(property);
        if (listeners) {
            listeners.delete(id);
            if (listeners.size === 0) {
                this.changeListeners.delete(property);
            }
        }
    }

    /**
     * @private
     */
    _notifyListeners(property, value) {
        const listeners = this.changeListeners.get(property);
        if (!listeners) return;

        for (const callback of listeners.values()) {
            try {
                callback(value);
            } catch (e) {
                errorLog(`Error in listener for ${property}:`, e);
            }
        }
    }

    /* --- GETTERS / SETTERS --- */

    get playbackStatus() { return this.mprisPlayerProxy.PlaybackStatus; }
    get loopStatus() { return this.mprisPlayerProxy.LoopStatus; }
    get rate() { return this.mprisPlayerProxy.Rate; }
    get shuffle() { return this.mprisPlayerProxy.Shuffle; }
    get volume() { return this.mprisPlayerProxy.Volume; }
    get metadata() { return this.unpackMetadata(this.mprisPlayerProxy.Metadata); }
    
    // Async Getters
    get position() {
        return this.propertiesProxy
            .GetAsync(MPRIS_PLAYER_IFACE_NAME, "Position")
            .then(res => res[0].get_int64())
            .catch(() => null);
    }

    // Caps
    get minimumRate() { return this.mprisPlayerProxy.MinimumRate; }
    get maximumRate() { return this.mprisPlayerProxy.MaximumRate; }
    get canGoNext() { return this.mprisPlayerProxy.CanGoNext; }
    get canGoPrevious() { return this.mprisPlayerProxy.CanGoPrevious; }
    get canPlay() { return this.mprisPlayerProxy.CanPlay; }
    get canPause() { return this.mprisPlayerProxy.CanPause; }
    get canSeek() { return this.mprisPlayerProxy.CanSeek; }
    get canControl() { return this.mprisPlayerProxy.CanControl; }
    
    get canQuit() { return this.mprisProxy.CanQuit; }
    get canRaise() { return this.mprisProxy.CanRaise; }
    get canSetFullscreen() { return this.mprisProxy.CanSetFullscreen; }
    
    get desktopEntry() { return this.mprisProxy.DesktopEntry; }
    get hasTrackList() { return this.mprisProxy.HasTrackList; }
    get identity() { return this.mprisProxy.Identity; }
    get supportedMimeTypes() { return this.mprisProxy.SupportedMimeTypes; }
    get supportedUriSchemes() { return this.mprisProxy.SupportedUriSchemes; }

    // Setters
    set loopStatus(v) { this.mprisPlayerProxy.LoopStatus = v; }
    set rate(v) { this.mprisPlayerProxy.Rate = v; }
    set shuffle(v) { this.mprisPlayerProxy.Shuffle = v; }
    set volume(v) { this.mprisPlayerProxy.Volume = v; }
    set fullscreen(v) { this.mprisProxy.Fullscreen = v; }

    /* --- ACTIONS --- */

    async next() { await this.mprisPlayerProxy.NextAsync().catch(errorLog); }
    async previous() { await this.mprisPlayerProxy.PreviousAsync().catch(errorLog); }
    async pause() { await this.mprisPlayerProxy.PauseAsync().catch(errorLog); }
    async playPause() { await this.mprisPlayerProxy.PlayPauseAsync().catch(errorLog); }
    async stop() { await this.mprisPlayerProxy.StopAsync().catch(errorLog); }
    async play() { await this.mprisPlayerProxy.PlayAsync().catch(errorLog); }
    async seek(offset) { await this.mprisPlayerProxy.SeekAsync(offset).catch(errorLog); }
    async setPosition(trackId, position) { await this.mprisPlayerProxy.SetPositionAsync(trackId, position).catch(errorLog); }
    async openUri(uri) { await this.mprisPlayerProxy.OpenUriAsync(uri).catch(errorLog); }
    
    async raise() { await this.mprisProxy.RaiseAsync().catch(errorLog); }
    async quit() { await this.mprisProxy.QuitAsync().catch(errorLog); }

    toggleLoop() {
        const statuses = Object.values(LoopStatus);
        const currentIdx = statuses.indexOf(this.loopStatus);
        const nextIdx = (currentIdx + 1) % statuses.length;
        this.loopStatus = statuses[nextIdx];
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
    }

    /**
     * Special wrapper for 'Seeked' signal
     */
    onSeeked(callback) {
        const signalId = this.mprisPlayerProxy.connectSignal("Seeked", () => {
            this.position.then(callback);
        });
        return () => this.mprisPlayerProxy.disconnectSignal(signalId);
    }

    onDestroy() {
        if (this.pollSourceId != null) {
            GLib.source_remove(this.pollSourceId);
            this.pollSourceId = null;
        }
        this.changeListeners.clear();
    }
}