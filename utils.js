try {
    var { GLib, Gio, St } = imports.gi;
    var PopupMenu = imports.ui.popupMenu;
} catch (error) {
    log("[Media-Controls] GLib, Gio, PopupMenu or St doesn't exist");
}

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Soup = imports.gi.Soup;

const { dbusMethod } = Me.imports.dbus;

const dataDir = GLib.get_user_config_dir();

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
        case "toggle_play":
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
        if (image) {
            image = image.replace("https://open.spotify.com/image/", "https://i.scdn.co/image/");
        }
        let url = metadata[0]["xesam:url"];
        return {
            id,
            title,
            artist,
            image,
            url,
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
                if (!image) {
                    image = "audio-x-generic-symbolic";
                }
                let title =
                    getDisplayLabel(metadata) + (metadata["artist"] ? " - " + metadata["artist"] : "");
                if (title.length > 60) {
                    title = title.substr(0, 57) + "...";
                }
                let icon = getIcon(metadata["id"]);
                if (!icon) {
                    icon = Gio.icon_new_for_string(image);
                    iconStr = icon.to_string();
                    if (iconStr !== "audio-x-generic-symbolic") {
                        saveIcon(metadata["id"], iconStr);
                    }
                }
                let item = new PopupMenu.PopupImageMenuItem(title, icon);
                item.player = player;
                item.connect("activate", (widget) => {
                    callback(widget.player);
                });
                sourceMenu.menu.addMenuItem(item);
            }
        }
    } else {
        sourceMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem("No players found", { reactive: false }));
    }
};

var isValidPlayer = (id, title) => {
    if (title || (id && id !== "/org/mpris/MediaPlayer2/TrackList/NoTrack")) {
        return true;
    }
    return false;
};

var isEqual = (object, _object) => {
    let keys = Object.keys(object);
    let _keys = Object.keys(_object);

    if (keys.length !== _keys.length) {
        return false;
    }

    for (let key of keys) {
        let val = object[key];
        let _val = _object[key];

        let areObjects = _isObject(val) && _isObject(_val);

        if ((areObjects && !isEqual(val, _val)) || (!areObjects && val !== _val)) {
            return false;
        }
    }

    return true;
};

const _isObject = (object) => {
    return object != null && typeof object === "object";
};

var getDisplayLabel = ({ id, title, url }) => {
    let label = title || url || id;
    if (label === url) {
        let urlParts = url.split("/");
        if (urlParts[0] === "file:") {
            label = urlParts[urlParts.length - 1];
        }
    }
    return label;
};

var getIcon = (id) => {
    try {
        let destination = GLib.build_filenamev([dataDir, "media-controls", "cache", GLib.base64_encode(id)]);
        let cacheFile = Gio.File.new_for_path(destination);
        let [success, contents] = cacheFile.load_contents(null);
        if (success) {
            return Gio.BytesIcon.new(contents);
        } else {
            return null;
        }
    } catch (error) {
        logError(error);
        return null;
    }
};

var saveIcon = async (id, url) => {
    try {
        let regexp = new RegExp(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/
        );

        if (regexp.test(url)) {
            let destination = GLib.build_filenamev([
                dataDir,
                "media-controls",
                "cache",
                GLib.base64_encode(id),
            ]);
            let cacheFile = Gio.File.new_for_path(destination);
            if (!cacheFile.query_exists(null)) {
                let remoteIcon = await _getRequest(url);
                if (GLib.mkdir_with_parents(cacheFile.get_parent().get_path(), 0744) === 0) {
                    let [success, tag] = cacheFile.replace_contents(
                        remoteIcon,
                        null,
                        false,
                        Gio.FileCreateFlags.REPLACE_DESTINATION,
                        null
                    );

                    if (!success) {
                        logError("Failed to save icon.");
                    }
                } else {
                    logError("Failed to save icon.");
                }
            }
        }
    } catch (error) {
        logError(error);
    }
};

var Utf8ArrayToStr = (array) => {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f));
                break;
            case 14:
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(
                    ((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0)
                );
                break;
        }
    }

    return out;
};

const _getRequest = (url) => {
    return new Promise((resolve, reject) => {
        let _session = new Soup.SessionAsync();
        let request = Soup.Message.new("GET", url);
        _session.queue_message(request, (session, message) => {
            if (message.status_code === 200) {
                let buffer = message.response_body.flatten();
                let bytes = buffer.get_data();
                resolve(bytes);
            } else {
                reject();
            }
        });
    });
};

var execCommunicate = async (argv, input = null, cancellable = null) => {
    let cancelId = 0;
    let flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

    if (input !== null) flags |= Gio.SubprocessFlags.STDIN_PIPE;

    let proc = new Gio.Subprocess({
        argv: argv,
        flags: flags,
    });
    proc.init(cancellable);

    if (cancellable instanceof Gio.Cancellable) {
        cancelId = cancellable.connect(() => proc.force_exit());
    }

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(input, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                let status = proc.get_exit_status();

                if (status !== 0) {
                    throw new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: stderr ? stderr.trim() : GLib.strerror(status),
                    });
                }

                resolve(stdout.trim());
            } catch (e) {
                reject(e);
            } finally {
                if (cancelId > 0) {
                    cancellable.disconnect(cancelId);
                }
            }
        });
    });
};
