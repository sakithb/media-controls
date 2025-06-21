// Utils only used in the extension. Do not import this file in the preferences window because Shell is not available there.

import GLib from "gi://GLib";
import Soup from "gi://Soup";
import Gio from "gi://Gio";

import { errorLog, handleError } from "./common.js";

Gio._promisify(Gio.DBusProxy, "new", "new_finish");
Gio._promisify(Gio.File.prototype, "replace_contents_bytes_async", "replace_contents_finish");
Gio._promisify(Gio.File.prototype, "read_async", "read_finish");
Gio._promisify(Soup.Session.prototype, "send_and_read_async", "send_and_read_finish");

/**
 * @param {string} id
 * @param {string} entry
 * @returns {Gio.AppInfo | null}
 */
export const getAppByIdAndEntry = (id, entry) => {
    const apps = Gio.AppInfo.get_all();
    for (const app of apps) {
        if (
            app.get_display_name() === entry ||
            app.get_id() === id ||
            app.get_name() === entry ||
            app.get_name() === id
        ) {
            return app;
        }
    }

    return null;
};

/**
 * @param {string} url
 * @returns {Promise<Gio.InputStream>}
 */
export const getImage = async (url) => {
    if (url == null || url == "") {
        return null;
    }
    const encoder = new TextEncoder();
    const urlBytes = encoder.encode(url);
    const encodedUrl = GLib.base64_encode(urlBytes);
    const path = GLib.build_filenamev([GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com", encodedUrl]);
    const exitCode = GLib.mkdir_with_parents(GLib.path_get_dirname(path), 493);
    if (exitCode === -1) {
        errorLog(`Failed to create cache directory: ${path}`);
        return null;
    }
    const file = Gio.File.new_for_path(path);
    if (file.query_exists(null)) {
        const stream = await file.read_async(null, null).catch(handleError);
        if (stream == null) {
            errorLog(`Failed to load image from cache: ${encodedUrl}`);
            return null;
        }
        return stream;
    } else {
        const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
        if (uri == null) {
            return null;
        }
        const scheme = uri.get_scheme();
        if (scheme === "file") {
            const file = Gio.File.new_for_uri(uri.to_string());
            if (file.query_exists(null) === false) {
                return null;
            }
            const stream = await file.read_async(null, null).catch(handleError);
            if (stream == null) {
                errorLog(`Failed to load local image: ${encodedUrl}`);
                return null;
            }
            return stream;
        } else if (scheme === "http" || scheme === "https") {
            const session = new Soup.Session();
            const message = new Soup.Message({ method: "GET", uri });
            const bytes = await session.send_and_read_async(message, null, null).catch(handleError);
            if (bytes == null) {
                errorLog(`Failed to load image: ${url}`);
                return null;
            }
            /** @type {Promise<[boolean] | null>} */
            const resultPromise = /** @type {any} */ (
                file.replace_contents_bytes_async(bytes, null, false, Gio.FileCreateFlags.NONE, null)
            );
            const result = await resultPromise.catch(handleError);
            if (result?.[0] === false) {
                errorLog(`Failed to cache image: ${url}`);
                return null;
            }
            const stream = await file.read_async(null, null).catch(handleError);
            if (stream == null) {
                errorLog(`Failed to load cached image: ${url}`);
                return null;
            }
            return stream;
        } else {
            errorLog(`Invalid scheme: ${scheme}`);
            return null;
        }
    }
};

/**
 * @template T
 * @param {Gio.DBusInterfaceInfo} ifaceInfo
 * @param {string} name
 * @param {string} object
 * @returns {Promise<T>}
 */
export const createDbusProxy = async (ifaceInfo, name, object) => {
    /** @type {Promise<T>} */
    const proxy = /** @type {any} */ (
        Gio.DBusProxy.new(Gio.DBus.session, Gio.DBusProxyFlags.NONE, ifaceInfo, name, object, ifaceInfo.name, null)
    );
    return proxy;
};
