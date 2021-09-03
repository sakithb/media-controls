const { Gio } = imports.gi;

let connection = Gio.DBus.session;

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
