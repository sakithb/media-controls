import Gio from "gi://Gio?version=2.0";
import { LoopStatus, PlaybackStatus } from "./enums.js";
import GLib from "gi://GLib?version=2.0";

/*
<node>
  <interface name="org.freedesktop.DBus.Properties">
    <method name="Get">
      <arg type="s" name="interface_name" direction="in"/>
      <arg type="s" name="property_name" direction="in"/>
      <arg type="v" name="value" direction="out"/>
    </method>
    <method name="GetAll">
      <arg type="s" name="interface_name" direction="in"/>
      <arg type="a{sv}" name="properties" direction="out"/>
    </method>
    <method name="Set">
      <arg type="s" name="interface_name" direction="in"/>
      <arg type="s" name="property_name" direction="in"/>
      <arg type="v" name="value" direction="in"/>
    </method>
    <signal name="PropertiesChanged">
      <arg type="s" name="interface_name"/>
      <arg type="a{sv}" name="changed_properties"/>
      <arg type="as" name="invalidated_properties"/>
    </signal>
  </interface>
  <interface name="org.mpris.MediaPlayer2">
    <method name="Raise"/>
    <method name="Quit"/>
    <property type="b" name="CanQuit" access="read"/>
    <property type="b" name="CanSetFullscreen" access="read"/>
    <property type="b" name="CanRaise" access="read"/>
    <property type="b" name="HasTrackList" access="read"/>
    <property type="s" name="Identity" access="read"/>
    <property type="s" name="DesktopEntry" access="read"/>
    <property type="as" name="SupportedUriSchemes" access="read"/>
    <property type="as" name="SupportedMimeTypes" access="read"/>
  </interface>
  <interface name="org.mpris.MediaPlayer2.Player">
    <method name="Next"/>
    <method name="Previous"/>
    <method name="Pause"/>
    <method name="PlayPause"/>
    <method name="Stop"/>
    <method name="Play"/>
    <method name="Seek">
      <arg type="x" name="Offset" direction="in"/>
    </method>
    <method name="SetPosition">
      <arg type="o" name="TrackId" direction="in"/>
      <arg type="x" name="Position" direction="in"/>
    </method>
    <method name="OpenUri">
      <arg type="s" name="Uri" direction="in"/>
    </method>
    <signal name="Seeked">
      <arg type="x" name="Position"/>
    </signal>
    <property type="s" name="PlaybackStatus" access="read"/>
    <property type="s" name="LoopStatus" access="readwrite"/>
    <property type="d" name="Rate" access="readwrite"/>
    <property type="b" name="Shuffle" access="readwrite"/>
    <property type="a{sv}" name="Metadata" access="read"/>
    <property type="d" name="Volume" access="readwrite"/>
    <property type="x" name="Position" access="read"/>
    <property type="d" name="MinimumRate" access="read"/>
    <property type="d" name="MaximumRate" access="read"/>
    <property type="b" name="CanGoNext" access="read"/>
    <property type="b" name="CanGoPrevious" access="read"/>
    <property type="b" name="CanPlay" access="read"/>
    <property type="b" name="CanPause" access="read"/>
    <property type="b" name="CanSeek" access="read"/>
    <property type="b" name="CanControl" access="read"/>
  </interface>
</node>
*/

interface DBusSignalArgs {
    PropertiesChanged: [interfaceName: string, changedProperties: GLib.Variant, invalidatedProperties: string[]];
}

interface MprisPlayerSignalArgs extends DBusSignalArgs {
    Seeked: number;
}

interface StdPropertiesSignalArgs extends DBusSignalArgs {
    NameOwnerChanged: [busName: string, oldOwner: string, newOwner: string];
    NameLost: string;
    NameAcquired: string;
}

type MethodResult<T> = [T];

export interface MprisPlayerInterfaceMetadata {
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

export interface PlayerProxyProperties {
    PlaybackStatus: PlaybackStatus;
    LoopStatus: LoopStatus;
    Rate: number;
    Shuffle: boolean;
    Metadata: MprisPlayerInterfaceMetadata;
    Volume: number;
    Position: number;
    MinimumRate: number;
    MaximumRate: number;
    CanGoNext: boolean;
    CanGoPrevious: boolean;
    CanPlay: boolean;
    CanPause: boolean;
    CanSeek: boolean;
    CanControl: boolean;
    CanQuit: boolean;
    Fullscreen: boolean;
    CanSetFullscreen: boolean;
    CanRaise: boolean;
    HasTrackList: boolean;
    Identity: string;
    DesktopEntry: string;
    SupportedUriSchemes: string[];
    SupportedMimeTypes: string[];
}

export interface DBusInterface<T extends DBusSignalArgs> extends Omit<Gio.DBusProxy, "connectSignal"> {
    GetAsync(interfaceName: string, propertyName: string): Promise<MethodResult<GLib.Variant>>;
    GetAllAsync(interfaceName: string): Promise<MethodResult<GLib.Variant>>;
    SetAsync(interfaceName: string, propertyName: string, value: GLib.Variant): Promise<void>;
    GetSync(interfaceName: string, propertyName: string): MethodResult<GLib.Variant>;
    GetAllSync(interfaceName: string): MethodResult<GLib.Variant>;
    SetSync(interfaceName: string, propertyName: string, value: GLib.Variant): void;
    GetRemote(
        interfaceName: string,
        propertyName: string,
        callback: (returnValue: MethodResult<GLib.Variant>, errorObj: unknown, fdList: unknown[]) => void,
    ): void;
    GetAllRemote(
        interfaceName: string,
        callback: (returnValue: MethodResult<GLib.Variant>, errorObj: unknown, fdList: unknown[]) => void,
    ): void;
    SetRemote(
        interfaceName: string,
        propertyName: string,
        value: GLib.Variant,
        callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void,
    ): void;
    connectSignal<N extends keyof T>(
        name: N,
        callback: (proxy: Gio.DBusProxy, senderName: string, args: T[N]) => void,
    ): void;
}

export interface MprisInterface extends DBusInterface<DBusSignalArgs> {
    CanQuit: boolean;
    Fullscreen: boolean;
    CanSetFullscreen: boolean;
    CanRaise: boolean;
    HasTrackList: boolean;
    Identity: string;
    DesktopEntry: string;
    SupportedUriSchemes: string[];
    SupportedMimeTypes: string[];
    RaiseRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    QuitRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    RaiseAsync(): Promise<void>;
    QuitAsync(): Promise<void>;
    RaiseSync(): void;
    QuitSync(): void;
}

export interface MprisPlayerInterface extends DBusInterface<MprisPlayerSignalArgs> {
    PlaybackStatus: PlaybackStatus;
    LoopStatus: LoopStatus;
    Rate: number;
    Shuffle: boolean;
    Metadata: MprisPlayerInterfaceMetadata;
    Volume: number;
    Position: number;
    MinimumRate: number;
    MaximumRate: number;
    CanGoNext: boolean;
    CanGoPrevious: boolean;
    CanPlay: boolean;
    CanPause: boolean;
    CanSeek: boolean;
    CanControl: boolean;
    NextRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    PreviousRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    PauseRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    PlayPauseRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    StopRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    PlayRemote(callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    SeekRemote(Offset: number, callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    SetPositionRemote(
        TrackId: string,
        Position: number,
        callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void,
    ): void;
    OpenUriRemote(Uri: string, callback: (returnValue: void, errorObj: unknown, fdList: unknown[]) => void): void;
    NextAsync(): Promise<void>;
    PreviousAsync(): Promise<void>;
    PauseAsync(): Promise<void>;
    PlayPauseAsync(): Promise<void>;
    StopAsync(): Promise<void>;
    PlayAsync(): Promise<void>;
    SeekAsync(Offset: number): Promise<void>;
    SetPositionAsync(TrackId: string, Position: number): Promise<void>;
    OpenUriAsync(Uri: string): Promise<void>;
    NextSync(): void;
    PreviousSync(): void;
    PauseSync(): void;
    PlayPauseSync(): void;
    StopSync(): void;
    PlaySync(): void;
    SeekSync(position: number): void;
    SetPositionSync(trackId: string, position: number): void;
    OpenUriSync(uri: string): void;
}

export interface StdPropertiesInterface extends DBusInterface<StdPropertiesSignalArgs> {
    ListNamesAsync(): Promise<MethodResult<string[]>>;
    ListNamesSync(): MethodResult<string[]>;
    ListNamesRemote(
        callback: (returnValue: MethodResult<string[]>, errorObj: unknown, fdList: unknown[]) => void,
    ): void;
}
