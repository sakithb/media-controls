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
                }
            }
        );
    });
};
