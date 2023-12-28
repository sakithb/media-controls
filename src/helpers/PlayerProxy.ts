import Gio from "gi://Gio?version=2.0";
import {
    MprisInterface,
    MprisPlayerInterface,
    MprisPlayerInterfaceMetadata,
    PlayerProxyProperties,
} from "../types/dbus.js";
import { LoopStatus, PlaybackStatus } from "../types/enums.js";
import { createDbusProxy, errorLog, handleError } from "../utils/common.js";

export default class PlayerProxy {
    private mprisProxy: MprisInterface;
    private mprisPlayerProxy: MprisPlayerInterface;
    private changeListeners: Map<string, (value: unknown) => void> = new Map();

    public busName: string;
    public isPinned = false;
    public isBlacklisted = false;
    public isInvalid = false;

    constructor(busName: string) {
        this.busName = busName;
    }

    public async initProxies(mprisIface: Gio.DBusInterfaceInfo, mprisPlayerIface: Gio.DBusInterfaceInfo) {
        const mprisProxy = createDbusProxy<MprisInterface>(mprisIface, this.busName, "/org/mpris/MediaPlayer2").catch(
            handleError,
        );
        const mprisPlayerProxy = createDbusProxy<MprisPlayerInterface>(
            mprisPlayerIface,
            this.busName,
            "/org/mpris/MediaPlayer2",
        ).catch(handleError);

        const proxies = await Promise.all([mprisProxy, mprisPlayerProxy]).catch(handleError);

        if (proxies == null) {
            errorLog("Failed to create proxies");
            return false;
        }

        this.mprisProxy = proxies[0];
        this.mprisPlayerProxy = proxies[1];

        this.mprisPlayerProxy.connectSignal("PropertiesChanged", (proxy, sender, [, changedProperties]) => {
            changedProperties = changedProperties.recursiveUnpack();
            for (const [key, value] of Object.entries(changedProperties)) {
                const listener = this.changeListeners.get(key);
                if (listener != null) {
                    listener(value);
                }
            }
        });

        this.mprisProxy.connectSignal("PropertiesChanged", (proxy, sender, [, changedProperties]) => {
            changedProperties = changedProperties.recursiveUnpack();
            for (const [key, value] of Object.entries(changedProperties)) {
                const listener = this.changeListeners.get(key);
                if (listener != null) {
                    listener(value);
                }
            }
        });

        return true;
    }

    get playbackStatus(): PlaybackStatus {
        return this.mprisPlayerProxy.PlaybackStatus;
    }

    get loopStatus(): LoopStatus {
        return this.mprisPlayerProxy.LoopStatus;
    }

    get rate(): number {
        return this.mprisPlayerProxy.Rate;
    }

    get shuffle(): boolean {
        return this.mprisPlayerProxy.Shuffle;
    }

    get metadata(): MprisPlayerInterfaceMetadata {
        return this.mprisPlayerProxy.Metadata;
    }

    get volume(): number {
        return this.mprisPlayerProxy.Volume;
    }

    get position(): number {
        return this.mprisPlayerProxy.Position;
    }

    get minimumRate(): number {
        return this.mprisPlayerProxy.MinimumRate;
    }

    get maximumRate(): number {
        return this.mprisPlayerProxy.MaximumRate;
    }

    get canGoNext(): boolean {
        return this.mprisPlayerProxy.CanGoNext;
    }

    get canGoPrevious(): boolean {
        return this.mprisPlayerProxy.CanGoPrevious;
    }

    get canPlay(): boolean {
        return this.mprisPlayerProxy.CanPlay;
    }

    get canPause(): boolean {
        return this.mprisPlayerProxy.CanPause;
    }

    get canSeek(): boolean {
        return this.mprisPlayerProxy.CanSeek;
    }

    get canControl(): boolean {
        return this.mprisPlayerProxy.CanControl;
    }

    get canQuit(): boolean {
        return this.mprisProxy.CanQuit;
    }

    get canRaise(): boolean {
        return this.mprisProxy.CanRaise;
    }

    get canSetFullscreen(): boolean {
        return this.mprisProxy.CanSetFullscreen;
    }

    get desktopEntry(): string {
        return this.mprisProxy.DesktopEntry;
    }

    get hasTrackList(): boolean {
        return this.mprisProxy.HasTrackList;
    }

    get identity(): string {
        return this.mprisProxy.Identity;
    }

    get supportedMimeTypes(): string[] {
        return this.mprisProxy.SupportedMimeTypes;
    }

    get supportedUriSchemes(): string[] {
        return this.mprisProxy.SupportedUriSchemes;
    }

    set loopStatus(loopStatus: LoopStatus) {
        this.mprisPlayerProxy.LoopStatus = loopStatus;
    }

    set rate(rate: number) {
        this.mprisPlayerProxy.Rate = rate;
    }

    set shuffle(shuffle: boolean) {
        this.mprisPlayerProxy.Shuffle = shuffle;
    }

    set volume(volume: number) {
        this.mprisPlayerProxy.Volume = volume;
    }

    set fullscreen(fullscreen: boolean) {
        this.mprisProxy.Fullscreen = fullscreen;
    }

    public async next() {
        await this.mprisPlayerProxy.NextAsync().catch(handleError);
    }

    public async previous() {
        await this.mprisPlayerProxy.PreviousAsync().catch(handleError);
    }

    public async pause() {
        await this.mprisPlayerProxy.PauseAsync().catch(handleError);
    }

    public async playPause() {
        await this.mprisPlayerProxy.PlayPauseAsync().catch(handleError);
    }

    public async stop() {
        await this.mprisPlayerProxy.StopAsync().catch(handleError);
    }

    public async play() {
        await this.mprisPlayerProxy.PlayAsync().catch(handleError);
    }

    public async seek(offset: number) {
        await this.mprisPlayerProxy.SeekAsync(offset).catch(handleError);
    }

    public async setPosition(trackId: string, position: number) {
        await this.mprisPlayerProxy.SetPositionAsync(trackId, position).catch(handleError);
    }

    public async openUri(uri: string) {
        await this.mprisPlayerProxy.OpenUriAsync(uri).catch(handleError);
    }

    public async raise() {
        await this.mprisProxy.RaiseAsync().catch(handleError);
    }

    public async quit() {
        await this.mprisProxy.QuitAsync().catch(handleError);
    }

    public onSeeked(callback: (position: number) => void) {
        this.mprisPlayerProxy.connectSignal("Seeked", (proxy, sender, position) => {
            callback(position);
        });
    }

    public onChanged<T extends keyof PlayerProxyProperties>(
        property: T,
        callback: (value: PlayerProxyProperties[T]) => void,
    ) {
        const listener = this.changeListeners.get(property);

        if (listener == null) {
            this.changeListeners.set(property, callback);
        }
    }
}
