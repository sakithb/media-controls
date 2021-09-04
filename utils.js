const { GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { dbusMethod } = Me.imports.dbus;

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
        return {
            id,
            title,
            artist,
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

var isValidPlayer = ({ id, title }) => {
    if (title || (id && id !== "/org/mpris/MediaPlayer2/TrackList/NoTrack")) {
        return true;
    }
    return false;
};

var hasMetadataChanged = (metadata, _metadata) => {
    if (Object.keys(metadata).every((key) => metadata[key] !== _metadata[key])) {
        return true;
    }
    return false;
};
