import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup";
import Pango from "gi://Pango";

const metadataKeys = {
    "xesam:artist": "artist",
    "xesam:title": "title",
    "mpris:artUrl": "image",
    "xesam:url": "url",
    "mpris:trackid": "trackid",
    "mpris:length": "length",
};

export const msToHHMMSS = (ms) => {
    let seconds = Math.floor(ms / 1000000);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds - hours * 3600) / 60);
    seconds = seconds - hours * 3600 - minutes * 60;

    if (hours < 10) {
        hours = "0" + hours;
    }

    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    if (hours === "00") {
        return minutes + ":" + seconds;
    }

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        return "--";
    }

    return hours + ":" + minutes + ":" + seconds;
};

export const parseMetadata = (_metadata) => {
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

export const stripInstanceNumbers = (busName) => {
    return busName.replace(/\.instance\d+$/, "");
};

export const getRequest = (url) => {
    return new Promise((resolve, reject) => {
        let _session = new Soup.Session();
        let _request = Soup.Message.new("GET", url);
        _session.send_and_read_async(_request, GLib.PRIORITY_DEFAULT, null, (_session, result) => {
            if (_request.get_status() === Soup.Status.OK) {
                let bytes = _session.send_and_read_finish(result);
                resolve(bytes);
            } else {
                reject(new Error("Soup request not resolved"));
            }
        });
    });
};

function wrappingText(wrapping, widget) {
    if (wrapping) {
        widget.clutter_text.single_line_mode = false;
        widget.clutter_text.activatable = false;
        widget.clutter_text.line_wrap = true;
        widget.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
    } else {
        widget.clutter_text.single_line_mode = true;
        widget.clutter_text.activatable = false;
        widget.clutter_text.line_wrap = false;
    }
    return true;
}

export { wrappingText };
