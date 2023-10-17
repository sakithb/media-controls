"use strict";

const { Gio, GLib } = imports.gi;

var ifacesXml = `
    <node>
        <interface name="org.mpris.MediaPlayer2.Player">
            <method name="Next" />
            <method name="Previous" />
            <method name="PlayPause" />
            <method name="Play" />
            <method name="Pause" />
            <method name="Seek">
                <arg type="x" />
            </method>
            <property name="Position" type="x" access="read" />
            <property name="PlaybackStatus" type="s" access="read" />
            <property name="Metadata" type="a{sv}" access="read" />
            <property name="LoopStatus" type="s" access="readwrite" />
            <property name="Shuffle" type="b" access="readwrite" />
            <property name="CanControl" type="b" access="read" />
            <property name="Volume" type="d" access="readwrite" />
            <method name="SetPosition">
                <arg type="o" />
                <arg type="x" />
            </method>
        </interface>
        <interface name="org.mpris.MediaPlayer2">
            <method name="Raise" />
            <method name="Quit" />
            <property name="Identity" type="s" access="read" />
            <property name="DesktopEntry" type="s" access="read" />
        </interface>
        <interface name="org.freedesktop.DBus">
            <method name='ListNames'>
                <arg type='as' direction='out' />
            </method>
            <signal name='NameOwnerChanged'>
                <arg type='s'/>
                <arg type='s'/>
                <arg type='s'/>
            </signal>
        </interface>
    </node>
`;

const nodeInfo = Gio.DBusNodeInfo.new_for_xml(ifacesXml);

var createProxy = (
    ifaceName,
    busName,
    objectPath,
    flags = Gio.DBusProxyFlags.NONE
) => {
    return new Promise((resolve, reject) => {
        let ifaceInfo = nodeInfo.interfaces.find(
            (iface) => iface.name == ifaceName
        );
        if (ifaceInfo) {
            Gio.DBusProxy.new(
                Gio.DBus.session,
                flags,
                ifaceInfo,
                busName,
                objectPath,
                ifaceName,
                null,
                (source, result) => {
                    try {
                        let proxy = Gio.DBusProxy.new_finish(result);
                        resolve(proxy);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        } else {
            reject(new Error("Interface not found"));
        }
    });
};
