// Utils only used in the extension. Do not import this file in the preferences window.

import GLib from "gi://GLib";
import Soup from "gi://Soup";
import Shell from "gi://Shell";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import GdkPixbuf from "gi://GdkPixbuf";
import { errorLog } from "./common.js";

// --- PROMISIFY METHODS ---
Gio._promisify(Gio.DBusProxy, "new", "new_finish");
Gio._promisify(Gio.File.prototype, "replace_contents_bytes_async", "replace_contents_finish");
Gio._promisify(Gio.File.prototype, "read_async", "read_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");
Gio._promisify(Soup.Session.prototype, "send_and_read_async", "send_and_read_finish");

/**
 * MANUAL WRAPPER: Loads Pixbuf safely
 */
const loadPixbuf = (stream) => {
    return new Promise((resolve) => {
        try {
            GdkPixbuf.Pixbuf.new_from_stream_async(stream, null, (_, res) => {
                try {
                    resolve(GdkPixbuf.Pixbuf.new_from_stream_finish(res));
                } catch (e) {
                    resolve(null);
                }
            });
        } catch (e) {
            resolve(null);
        }
    });
};

/**
 * Extracts the dominant color (AMBILIGHT LOGIC)
 */
export const getDominantColor = async (stream) => {
    try {
        if (!stream) return null;

        let fullPixbuf = await loadPixbuf(stream);
        if (!fullPixbuf) return null;

        // Scale to 1x1 to get average color
        let scaled = fullPixbuf.scale_simple(1, 1, GdkPixbuf.InterpType.TILES);
        fullPixbuf = null; // Cleanup

        if (!scaled) return null;

        const pixels = scaled.get_pixels();
        if (!pixels || pixels.length < 3) return null;

        const [r, g, b] = pixels;
        return `rgb(${r}, ${g}, ${b})`;

    } catch (e) {
        return null;
    }
};

/**
 * Get App Info (GAppInfo) by identity or desktop entry
 * Used for Blacklist checking
 * @param {string} id
 * @param {string} entry
 * @returns {Gio.AppInfo | null}
 */
export const getAppInfoByIdAndEntry = (id, entry) => {
    const apps = Gio.AppInfo.get_all();
    for (const app of apps) {
        const id_no_ext = app.get_id().replace(".desktop", "");
        if (
            app.get_id() === id ||
            app.get_display_name() === entry ||
            app.get_name() === entry ||
            id_no_ext === id ||
            id_no_ext === entry
        ) {
            return app;
        }
    }
    return null;
};

/**
 * Get Running App (Shell.App) by identity or desktop entry
 * Used for Icon and Name display
 * @param {string} id
 * @param {string} entry
 * @returns {Shell.App | null}
 */
export const getAppByIdAndEntry = (id, entry) => {
    const appSystem = Shell.AppSystem.get_default();
    const runningApps = appSystem.get_running();

    // 1. Try fuzzy match on running apps first
    const idResults = id ? Shell.AppSystem.search(id) : [];
    const entryResults = entry ? Shell.AppSystem.search(entry) : [];

    const findRunning = (results) => {
        if (results?.length > 0) {
            return runningApps.find((app) => results[0].includes(app.get_id()));
        }
        return null;
    };

    let app = findRunning(entryResults) || findRunning(idResults);
    if (app) return app;

    // 2. Try exact lookup
    const lookup = (name) => {
        if (!name) return null;
        return appSystem.lookup_app(`${name}.desktop`) || appSystem.lookup_app(name);
    };

    return lookup(entry) || lookup(id) || null;
};

/**
 * @param {string} url
 * @returns {Promise<Gio.InputStream>}
 */
export const getImage = async (url) => {
    if (!url) return null;

    const encoder = new TextEncoder();
    const encodedUrl = GLib.base64_encode(encoder.encode(url));
    const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);
    const filePath = GLib.build_filenamev([cacheDir, encodedUrl]);
    
    // Ensure dir exists
    if (GLib.mkdir_with_parents(cacheDir, 0o755) === -1) {
        return null;
    }

    const file = Gio.File.new_for_path(filePath);
    
    // 1. Check Cache
    if (file.query_exists(null)) {
        return await file.read_async(null, null).catch(() => null);
    }

    // 2. Handle Schemes
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    if (!uri) return null;
    
    const scheme = uri.get_scheme();

    if (scheme === "file") {
        const localFile = Gio.File.new_for_uri(url);
        if (!localFile.query_exists(null)) return null;
        return await localFile.read_async(null, null).catch(() => null);
    } 
    
    if (scheme === "http" || scheme === "https") {
        const session = new Soup.Session();
        const msg = new Soup.Message({ method: "GET", uri });
        const bytes = await session.send_and_read_async(msg, null, null).catch(() => null);

        if (bytes) {
            file.replace_contents_bytes_async(bytes, null, false, Gio.FileCreateFlags.NONE, null).catch(() => {});
            return Gio.MemoryInputStream.new_from_bytes(bytes);
        }
    }

    return null;
};

/**
 * @template T
 * @param {Gio.DBusInterfaceInfo} ifaceInfo
 * @param {string} name
 * @param {string} object
 * @returns {Promise<T>}
 */
export const createDbusProxy = async (ifaceInfo, name, object) => {
    return await Gio.DBusProxy.new(
        Gio.DBus.session,
        Gio.DBusProxyFlags.NONE,
        ifaceInfo,
        name,
        object,
        ifaceInfo.name,
        null,
    );
};

// --- CONTROL ICONS ---
export const ControlIconOptions = {
    LOOP_NONE: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
                opacity: 160,
            },
        },
    },
    LOOP_TRACK: {
        name: "loop",
        iconName: "media-playlist-repeat-song-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
            },
        },
    },
    LOOP_PLAYLIST: {
        name: "loop",
        iconName: "media-playlist-repeat-symbolic",
        menuProps: {
            index: 0,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.START,
            },
        },
    },
    PREVIOUS: {
        name: "previous",
        iconName: "media-skip-backward-symbolic",
        menuProps: {
            index: 1,
            options: {
                xExpand: true,
                xAlign: Clutter.ActorAlign.END,
            },
        },
        panelProps: { index: 1 },
    },
    PLAY: {
        name: "playpausestop",
        iconName: "media-playback-start-symbolic",
        menuProps: {
            index: 2,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            },
        },
        panelProps: { index: 2 },
    },
    PAUSE: {
        name: "playpausestop",
        iconName: "media-playback-pause-symbolic",
        menuProps: {
            index: 2,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            },
        },
        panelProps: { index: 2 },
    },
    STOP: {
        name: "playpausestop",
        iconName: "media-playback-stop-symbolic",
        menuProps: {
            index: 2,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.CENTER,
            },
        },
        panelProps: { index: 2 },
    },
    NEXT: {
        name: "next",
        iconName: "media-skip-forward-symbolic",
        menuProps: {
            index: 3,
            options: {
                xExpand: true,
                xAlign: Clutter.ActorAlign.START,
            },
        },
        panelProps: { index: 3 },
    },
    SHUFFLE_ON: {
        name: "shuffle",
        iconName: "media-playlist-shuffle-symbolic",
        menuProps: {
            index: 4,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.END,
            },
        },
    },
    SHUFFLE_OFF: {
        name: "shuffle",
        iconName: "media-playlist-consecutive-symbolic",
        menuProps: {
            index: 4,
            options: {
                xExpand: false,
                xAlign: Clutter.ActorAlign.END,
            },
        },
    },
    // Panel Only
    SEEK_BACKWARD: {
        name: "seekbackward",
        iconName: "media-seek-backward-symbolic",
        panelProps: { index: 0 },
    },
    SEEK_FORWARD: {
        name: "seekforward",
        iconName: "media-seek-forward-symbolic",
        panelProps: { index: 4 },
    },
};