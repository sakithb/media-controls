import GLib from "gi://GLib?version=2.0";
import Soup from "gi://Soup?version=3.0";
import Shell from "gi://Shell?version=13";
import Gio from "gi://Gio?version=2.0";
import { errorLog, handleError } from "./common.js";

Gio._promisify(Gio.DBusProxy, "new", "new_finish");
Gio._promisify(Gio.File.prototype, "replace_contents_bytes_async", "replace_contents_finish");
Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");
Gio._promisify(Soup.Session.prototype, "send_and_read_async", "send_and_read_finish");

export const getAppByIdAndEntry = (id: string, entry: string): Shell.App => {
    const appSystem = Shell.AppSystem.get_default();
    const runningApps = appSystem.get_running();

    const idResults = Shell.AppSystem.search(id);
    const entryResults = Shell.AppSystem.search(entry ?? "");

    if (entryResults?.length > 0) {
        const app = runningApps.find((app) => entryResults[0].includes(app.get_id()));
        if (app != null) {
            return app;
        }
    }

    if (idResults?.length > 0) {
        const app = runningApps.find((app) => idResults[0].includes(app.get_id()));

        if (app != null) {
            return app;
        }
    }

    return null;
};

export const getImage = async (url: string): Promise<GLib.Bytes> => {
    if (url == null) {
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
        const result = await file.load_contents_async(null).catch(handleError);

        if (result == null) {
            errorLog(`Failed to load image from cache: ${encodedUrl}`);
            return null;
        }

        const bytes = GLib.Bytes.new(result[0]);
        return bytes;
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

            const result = await file.load_contents_async(null).catch(handleError);

            if (result == null) {
                errorLog(`Failed to load local image: ${encodedUrl}`);
                return null;
            }

            const bytes = GLib.Bytes.new(result[0]);
            return bytes;
        } else if (scheme === "http" || scheme === "https") {
            const session = new Soup.Session();
            const message = new Soup.Message({ method: "GET", uri });

            const bytes = await session.send_and_read_async(message, null, null).catch(handleError);

            if (bytes == null) {
                errorLog(`Failed to load image: ${url}`);
                return null;
            }

            // @ts-expect-error Types are wrong
            const resultPromise = file.replace_contents_bytes_async(
                bytes,
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null,
            ) as Promise<[boolean]>;

            const result = await resultPromise.catch(handleError);

            if (result?.[0] === false) {
                errorLog(`Failed to cache image: ${url}`);
                return null;
            }

            return bytes;
        } else {
            errorLog(`Invalid scheme: ${scheme}`);
            return null;
        }
    }
};

export const createDbusProxy = async <T>(
    ifaceInfo: Gio.DBusInterfaceInfo,
    name: string,
    object: string,
): Promise<T> => {
    // @ts-expect-error Types have not been promisified yet
    const proxy = Gio.DBusProxy.new(
        Gio.DBus.session,
        Gio.DBusProxyFlags.NONE,
        ifaceInfo,
        name,
        object,
        ifaceInfo.name,
        null,
    ) as Promise<T>;

    return proxy;
};
