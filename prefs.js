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
const playbackActionNamesMap = {
    none: "None",
    toggle_play: "Toggle play/pause",
    play: "Play",
    pause: "Pause",
    next: "Next",
    prev: "Previous",
};
let playbackActionNameIds = Object.keys(playbackActionNamesMap);

const presetSepChars = [
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

const elements = {
    icon: "Player icon",
    title: "Track title",
    controls: "Control icons",
};
const elementIds = Object.keys(elements);

let settings,
    builder,
    MediaControlsBuilderScope,
    widgetElementOrderFirst,
    widgetElementOrderSecond,
    widgetElementOrderThird,
    widgetPreset,
    widgetCustom;

if (shellVersion >= 40) {
    MediaControlsBuilderScope = GObject.registerClass(
        { Implements: [Gtk.BuilderScope] },
        class MediaControlsBuilderScope extends GObject.Object {
            vfunc_create_closure(builder, handlerName, flags, connectObject) {
                if (typeof signalHandler[handlerName] !== "undefined") {
                    return signalHandler[handlerName].bind(
                        connectObject || this
                    );
                }
            }
        }
    );
}

const signalHandler = {
    on_seperator_character_group_changed: (widget) => {
        let label = widget.get_label();
        let active = widget.get_active();
        if (label === "Preset" && active) {
            widgetCustom.set_sensitive(false);
            widgetPreset.set_sensitive(true);
            signalHandler.on_seperator_preset_changed(widgetPreset);
        } else if (label === "Custom" && active) {
            widgetPreset.set_sensitive(false);
            widgetCustom.set_sensitive(true);
            signalHandler.on_seperator_custom_changed(widgetCustom);
        }
    },
    on_seperator_preset_changed: (widget) => {
        if (builder.get_object("preset-radio-btn").get_active()) {
            let presetValue = presetSepChars[widget.get_active()];
            settings.set_strv("seperator-chars", [
                presetValue.charAt(0),
                presetValue.charAt(presetValue.length - 1),
            ]);
        }
        return "done";
    },
    on_seperator_custom_changed: (widget) => {
        if (builder.get_object("custom-radio-btn").get_active()) {
            let customValues = widget.get_text().split("...");
            if (customValues[0] && customValues[1]) {
                settings.set_strv("seperator-chars", [
                    customValues[0],
                    customValues[1],
                ]);
            }
        }
    },
    on_element_order_first_changed: (widget) => {
        let secondValue = elementIds[widgetElementOrderSecond.get_active()];
        let thirdValue = elementIds[widgetElementOrderThird.get_active()];
        let thisValue = elementIds[widget.get_active()];
        if (thisValue === secondValue) {
            elementIds.forEach((element, index) => {
                if (!(element === thirdValue || element === thisValue)) {
                    widgetElementOrderSecond.set_active(index);
                }
            });
        } else if (thisValue === thirdValue) {
            elementIds.forEach((element, index) => {
                if (!(element === secondValue || element === thisValue)) {
                    widgetElementOrderThird.set_active(index);
                }
            });
        }
        settings.set_strv("element-order", [
            thisValue,
            elementIds[widgetElementOrderSecond.get_active()],
            elementIds[widgetElementOrderThird.get_active()],
        ]);
    },
    on_element_order_second_changed: (widget) => {
        let firstValue = elementIds[widgetElementOrderFirst.get_active()];
        let thirdValue = elementIds[widgetElementOrderThird.get_active()];
        let thisValue = elementIds[widget.get_active()];
        if (thisValue === firstValue) {
            elementIds.forEach((element, index) => {
                if (!(element === thirdValue || element === thisValue)) {
                    widgetElementOrderFirst.set_active(index);
                }
            });
        } else if (thisValue === thirdValue) {
            elementIds.forEach((element, index) => {
                if (!(element === firstValue || element === thisValue)) {
                    widgetElementOrderThird.set_active(index);
                }
            });
        }
        settings.set_strv("element-order", [
            elementIds[widgetElementOrderFirst.get_active()],
            thisValue,
            elementIds[widgetElementOrderThird.get_active()],
        ]);
    },
    on_element_order_third_changed: (widget) => {
        let secondValue = elementIds[widgetElementOrderSecond.get_active()];
        let firstValue = elementIds[widgetElementOrderFirst.get_active()];
        let thisValue = elementIds[widget.get_active()];
        if (thisValue === secondValue) {
            elementIds.forEach((element, index) => {
                if (!(element === firstValue || element === thisValue)) {
                    widgetElementOrderSecond.set_active(index);
                }
            });
        } else if (thisValue === firstValue) {
            elementIds.forEach((element, index) => {
                if (!(element === secondValue || element === thisValue)) {
                    widgetElementOrderFirst.set_active(index);
                }
            });
        }
        settings.set_strv("element-order", [
            elementIds[widgetElementOrderFirst.get_active()],
            elementIds[widgetElementOrderSecond.get_active()],
            thisValue,
        ]);
    },
    on_mouse_actions_left_changed: (widget) => {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[0] = playbackActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
    },
    on_mouse_actions_right_changed: (widget) => {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[1] = playbackActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
    },
    on_extension_position_changed: (widget) => {
        settings.set_string(
            "extension-position",
            positions[widget.get_active()]
        );
    },
};

const bindSettings = () => {
    settings.bind(
        "max-text-length",
        builder.get_object("max-text-length"),
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "update-delay",
        builder.get_object("update-delay"),
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-text",
        builder.get_object("hide-text"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-player-icon",
        builder.get_object("hide-player-icon"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-control-icons",
        builder.get_object("hide-control-icons"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-seperators",
        builder.get_object("hide-seperators"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "colored-player-icon",
        builder.get_object("colored-player-icon"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "show-all-on-hover",
        builder.get_object("show-all-on-hover"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "extension-index",
        builder.get_object("extension-index"),
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
};

const initWidgets = () => {
    // Init presets combobox
    presetSepChars.forEach((preset) => {
        widgetPreset.append(preset, preset);
    });
    let savedSepChars = settings.get_strv("seperator-chars");
    let sepChars = `${savedSepChars[0]}...${savedSepChars[1]}`;
    if (presetSepChars.includes(sepChars)) {
        builder.get_object("preset-radio-btn").set_active(true);
        widgetPreset.set_active(presetSepChars.indexOf(sepChars));
    } else {
        builder.get_object("custom-radio-btn").set_active(true);
        widgetCustom.set_text(sepChars);
        widgetPreset.set_active(0);
    }

    // Init extension position combobox
    let widgetExtensionPos = builder.get_object("extension-position");
    positions.forEach((position) => {
        widgetExtensionPos.append(position, position);
    });
    widgetExtensionPos.set_active(
        positions.indexOf(settings.get_string("extension-position"))
    );

    // Init element order comboboxes
    elementIds.forEach((element) => {
        widgetElementOrderFirst.append(element, elements[element]);
        widgetElementOrderSecond.append(element, elements[element]);
        widgetElementOrderThird.append(element, elements[element]);
    });
    let elementOrder = settings.get_strv("element-order");
    widgetElementOrderFirst.set_active(elementIds.indexOf(elementOrder[0]));
    widgetElementOrderSecond.set_active(elementIds.indexOf(elementOrder[1]));
    widgetElementOrderThird.set_active(elementIds.indexOf(elementOrder[2]));

    // Init mouse action comboboxes
    let widgetMouseActionLeft = builder.get_object("mouse-actions-left");
    let widgetMouseActionRight = builder.get_object("mouse-actions-right");
    playbackActionNameIds.forEach((action) => {
        widgetMouseActionLeft.append(action, playbackActionNamesMap[action]);
        widgetMouseActionRight.append(action, playbackActionNamesMap[action]);
    });
    let mouseActions = settings.get_strv("mouse-actions");
    widgetMouseActionLeft.set_active(
        playbackActionNameIds.indexOf(mouseActions[0])
    );
    widgetMouseActionRight.set_active(
        playbackActionNameIds.indexOf(mouseActions[1])
    );
};

const init = () => {
    settings = ExtensionUtils.getSettings();
};

const buildPrefsWidget = () => {
    builder = new Gtk.Builder();
    if (shellVersion < 40) {
        builder.add_from_file(Me.dir.get_path() + "/prefs3.ui");
        builder.connect_signals_full((builder, object, signal, handler) => {
            object.connect(signal, signalHandler[handler].bind(this));
        });
    } else {
        builder.set_scope(new MediaControlsBuilderScope());
        builder.add_from_file(Me.dir.get_path() + "/prefs4.ui");
    }
    widgetElementOrderFirst = builder.get_object("element-order-first");
    widgetElementOrderSecond = builder.get_object("element-order-second");
    widgetElementOrderThird = builder.get_object("element-order-third");
    widgetPreset = builder.get_object("sepchars-preset");
    widgetCustom = builder.get_object("sepchars-custom");
    initWidgets();
    bindSettings();
    return builder.get_object("main_prefs");
};
