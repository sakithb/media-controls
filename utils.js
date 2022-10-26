const { GLib, Gio, Soup } = imports.gi;

const metadataKeys = {
    "xesam:artist": "artist",
    "xesam:artist": "artist",
    "xesam:title": "title",
    "mpris:artUrl": "image",
    "xesam:url": "url",
    "mpris:trackid": "trackid",
    "mpris:length": "length"
};

var parseMetadata = (_metadata) => {
    if (!_metadata) {
        return _metadata;
    }

    let metadata = {};
    for (let key in metadataKeys) {
        let val = _metadata[key];
        metadata[metadataKeys[key]] = val instanceof GLib.Variant ? val.recursiveUnpack() : val;
    }

    let title = metadata.title || metadata.url || metadata.id;

    if (title && title === metadata.url) {
        let urlParts = metadata.url.split("/");
        if (urlParts[0] === "file:") {
            title = urlParts[urlParts.length - 1];
        }
    } else if (title && title === metadata.id) {
        if (title.includes("/org/mpris/MediaPlayer2/Track/")) {
            title = title.replace("/org/mpris/MediaPlayer2/Track/", "Track ");
        } else if (title === "/org/mpris/MediaPlayer2/TrackList/NoTrack") {
            title = "No track";
        }
    }

    let image = metadata.image;

    if (image) {
        image = image.replace("https://open.spotify.com/image/", "https://i.scdn.co/image/");
    }

    metadata.title = title;
    metadata.image = image;

    return metadata;
};

var stripInstanceNumbers = (busName) => {
    return busName.replace(/\.instance\d+$/, "");
};

var getRequest = (url) => {
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

/**
 * Executes a shell command asynchronously
 * @param {Array<string>} argv  array of arguments
 * @param {string?} input input to be given to the shell command
 * @param {boolean?} cancellable whether the operation is cancellable
 * @returns
 */
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
