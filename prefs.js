// Based on https://github.com/mheine/gnome-shell-spotify-label/blob/master/prefs.js

"use strict";

const Lang = imports.lang;

const { Gio, Gtk, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split(".");
const shellVersion = Number.parseInt(major);

const positions = ["left", "center", "right"];
const playbackActionNames = {
    none: "None",
    toggle_play: "Toggle play/pause",
    play: "Play",
    pause: "Pause",
    next: "Next",
    prev: "Previous",
};

let playbackActionNameKeys = Object.keys(playbackActionNames);

const sepChars = [
    "|...|",
    "[...]",
    "(...)",
    "{...}",
    "/...\\",
    "\\.../",
    ":...:",
    "-...-",
    "_..._",
    "=...=",
    "•...•",
    "█...█",
];

const init = () => {};

if (shellVersion >= 40) {
    var MediaControlsBuilderScope = GObject.registerClass(
        { Implements: [Gtk.BuilderScope] },
        class MediaControlsBuilderScope extends GObject.Object {
            vfunc_create_closure(builder, handlerName, flags, connectObject) {
                if (flags & Gtk.BuilderClosureFlags.SWAPPED)
                    throw new Error(
                        'Unsupported template signal flag "swapped"'
                    );

                if (typeof signalHandler[handlerName] === "undefined")
                    throw new Error(`${handlerName} is undefined`);

                return signalHandler[handlerName].bind(connectObject || this);
            }
        }
    );
}

const buildPrefsWidget = () => {
    const settings = ExtensionUtils.getSettings();
    const prefsWidget = new Gtk.ScrolledWindow();
    const builder = new Gtk.Builder();
    if (shellVersion < 40) {
        builder.add_from_file(Me.dir.get_path() + "/prefs3.ui");
        builder.connect_signals_full((builder, object, signal, handler) => {
            object.connect(signal, signalHandler[handler].bind(this));
        });
        prefsWidget.add(builder.get_object("main_prefs"));
    } else {
        builder.set_scope(new MediaControlsBuilderScope());
        builder.add_from_file(Me.dir.get_path() + "/prefs4.ui");
        return builder.get_object("main_prefs");
    }
    return prefsWidget;
};

const on_max_text_length_changed = (widget) => {
    log(widget);
};
const on_update_delay_changed = (widget) => {
    log(widget);
};
const on_hide_text_changed = () => {
    log(widget);
};
const on_hide_player_icon_changed = (widget) => {
    log(widget);
};
const on_hide_controls_changed = (widget) => {
    log(widget);
};
const on_hide_seperators_changed = (widget) => {
    log(widget);
};
const on_colored_player_icon_changed = (widget) => {
    log(widget);
};
const on_show_hidden_content_changed = (widget) => {
    log(widget);
};
const on_seperator_character_group_changed = (widget) => {
    log(widget);
};
const on_seperator_preset_changed = (widget) => {
    log(widget);
};
const on_seperator_custom_changed = (widget) => {
    log(widget);
};
const on_extension_position_changed = (widget) => {
    log(widget);
};
const on_extension_index_changed = (widget) => {
    log(widget);
};
const on_element_order_first_changed = (widget) => {
    log(widget);
};
const on_element_order_second_changed = (widget) => {
    log(widget);
};
const on_element_order_third_changed = (widget) => {
    log(widget);
};
const on_mouse_actions_left_changed = (widget) => {
    log(widget);
};
const on_mouse_actions_right_changed = (widget) => {
    log(widget);
};

const signalHandler = {
    on_max_text_length_changed,
    on_update_delay_changed,
    on_hide_text_changed,
    on_hide_player_icon_changed,
    on_hide_controls_changed,
    on_hide_seperators_changed,
    on_colored_player_icon_changed,
    on_show_hidden_content_changed,
    on_seperator_character_group_changed,
    on_seperator_preset_changed,
    on_seperator_custom_changed,
    on_extension_position_changed,
    on_extension_index_changed,
    on_element_order_first_changed,
    on_element_order_second_changed,
    on_element_order_third_changed,
    on_mouse_actions_left_changed,
    on_mouse_actions_right_changed,
};
