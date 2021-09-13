<<<<<<< HEAD
const { Gio, GLib } = imports.gi;

let connection = Gio.DBus.session;

const playbackAction = (action, player) => {
    return new Promise((resolve, reject) => {
        connection.call(
            player,
            "/org/mpris/MediaPlayer2",
            "org.mpris.MediaPlayer2.Player",
            action,
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (connection, res) => {
                try {
                    connection.call_finish(res);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

const getPlayers = () => {
    return new Promise((resolve, reject) => {
        connection.call(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus",
            "ListNames",
            null,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (connection, res) => {
                try {
                    let rawReply = connection
                        .call_finish(res)
                        .get_child_value(0);
                    let services = rawReply.deepUnpack();
                    players = services.filter((service) => {
                        if (service.includes("org.mpris.MediaPlayer2")) {
                            return true;
                        }
                    });
                    resolve(players);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

const getMetadata = (player) => {
    return new Promise((resolve, reject) => {
        connection.call(
            player,
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", [
                "org.mpris.MediaPlayer2.Player",
                "Metadata",
            ]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (connection, res) => {
                try {
                    let metaData = connection
                        .call_finish(res)
                        .recursiveUnpack()[0];
                    let title = metaData["xesam:title"];
                    let artist = metaData["xesam:artist"];
                    let id = metaData["mpris:trackid"];
                    resolve([title, artist, id]);
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};

const getPlaybackStatus = (player) => {
    return new Promise((resolve, reject) => {
        connection.call(
            player,
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", [
                "org.mpris.MediaPlayer2.Player",
                "PlaybackStatus",
            ]),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (connection, res) => {
                try {
                    let playbackStatus = connection
                        .call_finish(res)
                        .recursiveUnpack()[0];
                    resolve(playbackStatus);
                } catch (e) {
                    reject(e);
=======
"use strict";

const { Gio, GLib } = imports.gi;

const ifacesXml = `
    <node>
        <interface name="org.mpris.MediaPlayer2.Player">
            <method name="Next" />
            <method name="Previous" />
            <method name="PlayPause" />
            <method name="Play" />
            <method name="Pause" />
            <property name="PlaybackStatus" type="s" access="read" />
            <property name="Metadata" type="a{sv}" access="read" />
            <property name="LoopStatus" type="s" access="readwrite" />
        </interface>
        <interface name="org.mpris.MediaPlayer2">
            <property name="Identity" type="s" access="read" />
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

const createProxy = (ifaceName, busName, objectPath, flags = Gio.DBusProxyFlags.NONE) => {
    return new Promise((resolve, reject) => {
        let ifaceInfo = nodeInfo.interfaces.find((iface) => iface.name == ifaceName);
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
>>>>>>> e91a2aaefbc557e39484a9c66d9dd03f42fb5822
                }
            );
        } else {
            reject(new Error("Interface not found"));
        }
    });
};
