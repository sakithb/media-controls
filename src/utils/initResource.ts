import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

const uri = GLib.Uri.parse(import.meta.url, GLib.UriFlags.NONE).parse_relative(
    "../org.gnome.shell.extensions.mediacontrols.gresource",
    GLib.UriFlags.NONE,
);

Gio.resources_register(Gio.resource_load(uri.get_path()));
