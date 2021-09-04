const { GLib, Gio, St } = imports.gi;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { dbusMethod } = Me.imports.dbus;

let players;

var playerAction = async (player, action) => {
    switch (action) {
        case "play":
            await dbusMethod(player, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", "Play");
            break;
        case "pause":
            await dbusMethod(player, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", "Pause");
            break;
        case "next":
            await dbusMethod(player, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", "Next");
            break;
        case "previous":
            await dbusMethod(player, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", "Previous");
            break;
        case "toggle":
            await dbusMethod(player, "/org/mpris/MediaPlayer2", "org.mpris.MediaPlayer2.Player", "PlayPause");
            break;
        default:
            break;
    }
};

var getPlayers = async () => {
    try {
        let services = await dbusMethod(
            "org.freedesktop.DBus",
            "/org/freedesktop/DBus",
            "org.freedesktop.DBus",
            "ListNames"
        );
        let players = services[0].filter((service) => {
            if (service.includes("org.mpris.MediaPlayer2")) {
                return true;
            }
            return false;
        });
        return players;
    } catch (error) {
        logError(error);
    }
};

var getMetadata = async (player) => {
    try {
        let metadata = await dbusMethod(
            player,
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", ["org.mpris.MediaPlayer2.Player", "Metadata"])
        );
        let id = metadata[0]["mpris:trackid"];
        let title = metadata[0]["xesam:title"];
        let artist = metadata[0]["xesam:artist"];
        let image = metadata[0]["mpris:artUrl"];
        return {
            id,
            title,
            artist,
            image,
        };
    } catch (error) {
        logError(error);
    }
};

var getStatus = async (player) => {
    try {
        let status = await dbusMethod(
            player,
            "/org/mpris/MediaPlayer2",
            "org.freedesktop.DBus.Properties",
            "Get",
            new GLib.Variant("(ss)", ["org.mpris.MediaPlayer2.Player", "PlaybackStatus"])
        );
        return status[0];
    } catch (error) {
        logError(error);
    }
};

const updatePlayers = async (sourceMenu, callback) => {
    sourceMenu.menu.removeAll();
    players = await getPlayers();
    if (players.length > 0) {
        for (player of players) {
            let metadata = await getMetadata(player);
            if (isValidPlayer(metadata)) {
                let image = metadata["image"];
                if (image) {
                    image = image.replace("https://open.spotify.com/image/", "https://i.scdn.co/image/");
                } else {
                    image = "audio-x-generic-symbolic";
                }
                let title =
                    (metadata["title"] || metadata["id"]) +
                    (metadata["artist"] ? " - " + metadata["artist"] : "");
                let icon = Gio.icon_new_for_string(image);
                let item = new PopupMenu.PopupImageMenuItem(title, icon);
                let playerIndex = players.indexOf(player);
                item.connect("activate", () => {
                    callback(players[playerIndex]);
                });
                sourceMenu.menu.addMenuItem(item);
            }
        }
    } else {
        sourceMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem("No players found", { reactive: false }));
    }
};

var isValidPlayer = ({ id, title }) => {
    if (title || (id && id !== "/org/mpris/MediaPlayer2/TrackList/NoTrack")) {
        return true;
    }
    return false;
};

var hasMetadataChanged = (metadata, _metadata) => {
    if (metadata && _metadata && Object.keys(metadata).every((key) => metadata[key] !== _metadata[key])) {
        return true;
    }
    return false;
};
