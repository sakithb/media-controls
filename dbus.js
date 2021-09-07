/**
 * @overview Contains functions needed to make dbus calls.
 */

const { Gio } = imports.gi;

let connection = Gio.DBus.session;

/**
 *
 * @param {string} destination A bus name or null
 * @param {string} object Path of the remote object
 * @param {string} interface Interface to invoke method on
 * @param {string} method The name of the method to invoke
 * @param {(GLib.Variant)} parameters a GLib.Variant tuple with parameters for the method or null if not passing parameters
 * @returns An unpacked GLib.Variant, possibly an array with the return values
 */
var dbusMethod = (destination, object, interface, method, parameters = null) => {
    return new Promise((resolve, reject) => {
        connection.call(
            destination,
            object,
            interface,
            method,
            parameters,
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            (con, res) => {
                try {
                    let val = con.call_finish(res).recursiveUnpack();
                    resolve(val);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};
