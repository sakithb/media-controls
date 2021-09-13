// Based on https://github.com/mheine/gnome-shell-spotify-label/blob/master/prefs.js

"use strict";

const Lang = imports.lang;

const { Gio, Gtk, GObject, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { Utf8ArrayToStr, execCommunicate } = Me.imports.utils;

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split(".");
const shellVersion = Number.parseInt(major);

const positions = ["left", "center", "right"];

const mouseActionNamesMap = {
    none: "None",
    toggle_play: "Toggle Play/Pause",
    play: "Play",
    pause: "Pause",
    next: "Next",
    previous: "Previous",
    toggle_menu: "Open sources menu",
    toggle_info: "Open track information menu",
};
let mouseActionNameIds = Object.keys(mouseActionNamesMap);

<<<<<<< HEAD
let playbackActionNameKeys = Object.keys(playbackActionNames);

const sepChars = [
    "Playing: ...",
=======
const presetSepChars = [
    "|...|",
>>>>>>> e91a2aaefbc557e39484a9c66d9dd03f42fb5822
    "[...]",
    "|...|",
    "<...>",
    "(...)",
    "{...}",
    "/...\",
    "\.../",
    ":...:",
    "-...-",
    "_..._",
    "=...=",
    "~/.../",
    "...",
    " ... ",
];

<<<<<<< HEAD
function init() {}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings();
    let widgetPrefs;
    if (shellVersion < 40) {
        widgetPrefs = new Gtk.Grid({
            margin: 15,
            column_spacing: 8,
            row_spacing: 8,
            visible: true,
            column_homogeneous: true,
        });
    } else {
        widgetPrefs = new Gtk.Grid({
            margin_top: 15,
            margin_bottom: 15,
            margin_start: 15,
            margin_end: 15,
            column_spacing: 8,
            row_spacing: 8,
            visible: true,
            column_homogeneous: true,
        });
    }

    let index = 0;

    // First section - General
    // SECTION START
    let labelGeneral = new Gtk.Label({
        label: "<b>General Prefrences</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    widgetPrefs.attach(labelGeneral, 0, index, 1, 1);

    // Adjust maximum text length
    let labelMaxDisplayLength = new Gtk.Label({
        label: "Maximum text length (0 to disable):",
        halign: Gtk.Align.START,
        visible: true,
    });

    let entryMaxDisplayLength = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 300,
            step_increment: 1,
        }),
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelMaxDisplayLength, 0, index, 1, 1);
    widgetPrefs.attach(entryMaxDisplayLength, 1, index, 1, 1);

    // Adjust update delay
    let labelUpdateDelay = new Gtk.Label({
        label: "Update delay (milliseconds):",
        halign: Gtk.Align.START,
        visible: true,
    });

    let entryUpdateDelay = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 50,
            upper: 10000,
            step_increment: 50,
        }),
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelUpdateDelay, 0, index, 1, 1);
    widgetPrefs.attach(entryUpdateDelay, 1, index, 1, 1);

    // SECTION END
    // Second section - Visibility

    let labelVisibility = new Gtk.Label({
        label: "<b>Visibility</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    index++;
    widgetPrefs.attach(labelVisibility, 0, index, 1, 1);

    // Hide text
    let labelHideText = new Gtk.Label({
        label: "Hide text:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchHideText = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelHideText, 0, index, 1, 1);
    widgetPrefs.attach(switchHideText, 1, index, 1, 1);

    // Hide player icon
    let labelHidePlayerIcon = new Gtk.Label({
        label: "Hide player icon:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchHidePlayerIcon = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelHidePlayerIcon, 0, index, 1, 1);
    widgetPrefs.attach(switchHidePlayerIcon, 1, index, 1, 1);

    /* Hide control icons */
    let labelHideControlIcons = new Gtk.Label({
        label: "Hide controls:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchHideControlIcons = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelHideControlIcons, 0, index, 1, 1);
    widgetPrefs.attach(switchHideControlIcons, 1, index, 1, 1);

    /* Hide seperators */
    let labelHideSeperators = new Gtk.Label({
        label: "Hide Seperators:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchHideSeperators = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelHideSeperators, 0, index, 1, 1);
    widgetPrefs.attach(switchHideSeperators, 1, index, 1, 1);

    /* Colored player icon */
    let labelColoredPlayerIcon = new Gtk.Label({
        label: "Colored player icon:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchColoredPlayerIcon = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelColoredPlayerIcon, 0, index, 1, 1);
    widgetPrefs.attach(switchColoredPlayerIcon, 1, index, 1, 1);

    /* Hide controls */
    let labelShowAllOnHover = new Gtk.Label({
        label: "Show hidden content on hover:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchShowAllOnHover = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelShowAllOnHover, 0, index, 1, 1);
    widgetPrefs.attach(switchShowAllOnHover, 1, index, 1, 1);

    /* Change seperator character */
    let labelSeperatorChar = new Gtk.Label({
        label: "Change seperator characters:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let labelSepCharPresets = new Gtk.Label({
        label: "Presets:",
        halign: Gtk.Align.END,
        visible: true,
    });

    let labelSepCharCustom = new Gtk.Label({
        label: "Custom (Ex - '<...>'):",
        halign: Gtk.Align.END,
        visible: true,
    });

    let comboboxSepCharPresets = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    let entrySepCharCustom = new Gtk.Entry({
        halign: Gtk.Align.END,
        buffer: new Gtk.EntryBuffer(),
        placeholder_text: "Ex - '<...>'",
        max_length: 5,
        visible: true,
    });

    for (let i = 0; i < sepChars.length; i++) {}

    sepChars.forEach((sepChar) => {
        comboboxSepCharPresets.append(sepChar, sepChar);
    });

    comboboxSepCharPresets.set_active(
        sepChars.indexOf(
            settings.get_string("seperator-char-start") +
                "..." +
                settings.get_string("seperator-char-end")
        )
    );

    index++;
    widgetPrefs.attach(labelSeperatorChar, 0, index, 1, 1);
    widgetPrefs.attach(labelSepCharPresets, 1, index, 1, 1);
    index++;
    widgetPrefs.attach(comboboxSepCharPresets, 1, index, 1, 1);
    index++;
    widgetPrefs.attach(labelSepCharCustom, 1, index, 1, 1);
    index++;
    widgetPrefs.attach(entrySepCharCustom, 1, index, 1, 1);

    // SECTION END

    // Section - Position
    // SECTION START
    let labelPosition = new Gtk.Label({
        label: "<b>Position</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    index++;
    widgetPrefs.attach(labelPosition, 0, index, 1, 1);

    /* Adjust extension position */
    let labelExtensionPosition = new Gtk.Label({
        label: "Extension position:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let comboboxExtensionPosition = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    positions.forEach((position) => {
        comboboxExtensionPosition.append(position, position);
    });

    comboboxExtensionPosition.set_active(
        positions.indexOf(settings.get_string("extension-position"))
    );

    index++;
    widgetPrefs.attach(labelExtensionPosition, 0, index, 1, 1);
    widgetPrefs.attach(comboboxExtensionPosition, 1, index, 1, 1);

    /* Asjust extension index */
    let labelExtensionIndex = new Gtk.Label({
        label: "Extension index:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let entryExtensionIndex = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1,
        }),
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelExtensionIndex, 0, index, 1, 1);
    widgetPrefs.attach(entryExtensionIndex, 1, index, 1, 1);
    // SECTION END

    // Third section - Other
    // SECTION START

    let labelOther = new Gtk.Label({
        label: "<b>Other</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    index++;
    widgetPrefs.attach(labelOther, 0, index, 1, 1);

    // Mouse actions
    let labelMouseActions = new Gtk.Label({
        label: "Mouse actions:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let labelMouseActionsLeftClick = new Gtk.Label({
        label: "Left click:",
        halign: Gtk.Align.END,
        visible: true,
    });

    let labelMouseActionsRightClick = new Gtk.Label({
        label: "Right click:",
        halign: Gtk.Align.END,
        visible: true,
    });

    let comboboxMouseActionsLeftClick = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    let comboboxMouseActionsRightClick = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    playbackActionNameKeys.forEach((key) => {
        comboboxMouseActionsLeftClick.append(key, playbackActionNames[key]);
        comboboxMouseActionsRightClick.append(key, playbackActionNames[key]);
    });

    comboboxMouseActionsLeftClick.set_active(
        playbackActionNameKeys.indexOf(
            settings.get_string("mouse-actions-left")
        )
    );

    comboboxMouseActionsRightClick.set_active(
        playbackActionNameKeys.indexOf(
            settings.get_string("mouse-actions-right")
        )
=======
const elements = {
    icon: "Player icon",
    title: "Track title",
    controls: "Control icons",
    menu: "Sources menu",
};
const elementIds = Object.keys(elements);

let settings,
    builder,
    MediaControlsBuilderScope,
    widgetPreset,
    widgetCustom,
    widgetCacheSize,
    widgetElementOrder,
    elementOrderWidgets;

let elementOrder, elementOrderLock;

// Create a builder scope of the version id 40 or greater
if (shellVersion >= 40) {
    MediaControlsBuilderScope = GObject.registerClass(
        { Implements: [Gtk.BuilderScope] },
        class MediaControlsBuilderScope extends GObject.Object {
            vfunc_create_closure(builder, handlerName, flags, connectObject) {
                if (typeof signalHandler[handlerName] !== "undefined") {
                    return signalHandler[handlerName].bind(connectObject || this);
                }
            }
        }
>>>>>>> e91a2aaefbc557e39484a9c66d9dd03f42fb5822
    );
}

const signalHandler = {
    // Disable the opposite inputs from the selected and apply changes
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
    },
    on_seperator_custom_changed: (widget) => {
        if (builder.get_object("custom-radio-btn").get_active()) {
            let customValues = widget.get_text().split("...");
            if (customValues[0] && customValues[1]) {
                settings.set_strv("seperator-chars", [customValues[0], customValues[1]]);
            }
        }
    },

    on_mouse_actions_left_changed: (widget) => {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[0] = mouseActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
    },
    on_mouse_actions_right_changed: (widget) => {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[1] = mouseActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
    },
    on_extension_position_changed: (widget) => {
        settings.set_string("extension-position", positions[widget.get_active()]);
    },

    on_clear_cache_clicked: () => {
        let dir = GLib.get_user_config_dir() + "/media-controls";
        try {
            (async () => {
                await execCommunicate(["rm", "-r", dir]);
                widgetCacheSize.set_text(await getCacheSize());
            })();
        } catch (error) {
            widgetCacheSize.set_text("Failed to clear cache");
        }
    },
};

const bindSettings = () => {
    settings.bind(
        "max-text-width",
        builder.get_object("max-text-width"),
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    // settings.bind("update-delay", builder.get_object("update-delay"), "value", Gio.SettingsBindFlags.DEFAULT);
    settings.bind("show-text", builder.get_object("show-text"), "active", Gio.SettingsBindFlags.DEFAULT);
    settings.bind(
        "show-player-icon",
        builder.get_object("show-player-icon"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "show-control-icons",
        builder.get_object("show-control-icons"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "show-seperators",
        builder.get_object("show-seperators"),
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
        "show-info-on-hover",
        builder.get_object("show-info-on-hover"),
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "extension-index",
        builder.get_object("extension-index"),
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "show-sources-menu",
        builder.get_object("show-sources-menu"),
        "active",
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
        widgetCustom.set_sensitive(false);
    } else {
        builder.get_object("custom-radio-btn").set_active(true);
        widgetCustom.set_text(sepChars);
        widgetPreset.set_active(0);
        widgetPreset.set_sensitive(false);
    }

    // Init extension position combobox
    let widgetExtensionPos = builder.get_object("extension-position");
    positions.forEach((position) => {
        widgetExtensionPos.append(position, position);
    });
    widgetExtensionPos.set_active(positions.indexOf(settings.get_string("extension-position")));

    elementOrder = settings.get_strv("element-order");

    elementIds.forEach((element, index) => {
        let widget = new Gtk.ComboBoxText({
            visible: true,
        });

        elementIds.forEach((_element) => {
            widget.append(_element, elements[_element]);
        });

        widget.set_active(elementIds.indexOf(elementOrder[index]));

        widget.connect("changed", () => {
            if (!elementOrderLock) {
                elementOrderLock = true;
                let newElementOrder = [];
                elementOrder = settings.get_strv("element-order");
                elementOrderWidgets.forEach((_widget, index) => {
                    let val = elementIds[_widget.get_active()];
                    log(`Current value: ${val}`);
                    if (newElementOrder.includes(val)) {
                        log(`   Current: ${newElementOrder} at index ${index}`);
                        let _index = newElementOrder.indexOf(val);
                        log(`   Index of conflicting element ${_index}`);
                        if (elementOrder[_index] === val) {
                            log(
                                `       This is the new one. Overriding old value: '${val}' at index: '${_index}' with '${elementOrder[index]}'`
                            );
                            newElementOrder[_index] = elementOrder[index];
                            log(`       Changed: ${newElementOrder} at index ${index}`);
                            elementOrderWidgets[_index].set_active(elementIds.indexOf(elementOrder[index]));
                        } else {
                            log(
                                `       This is the old one. Overriding current value: ${val} with ${elementOrder[_index]}`
                            );
                            val = elementOrder[_index];
                            _widget.set_active(elementIds.indexOf(val));
                        }
                    }
                    newElementOrder.push(val);
                });
                log(`Finalized ${newElementOrder}`);
                settings.set_strv("element-order", newElementOrder);
                elementOrderLock = false;
            } else {
                log("Ignoring signal");
            }
        });

        widgetElementOrder.attach(widget, 1, index, 1, 1);
        elementOrderWidgets.push(widget);
    });

    // Init mouse action comboboxes
    let widgetMouseActionLeft = builder.get_object("mouse-actions-left");
    let widgetMouseActionRight = builder.get_object("mouse-actions-right");
    mouseActionNameIds.forEach((action) => {
        widgetMouseActionLeft.append(action, mouseActionNamesMap[action]);
        widgetMouseActionRight.append(action, mouseActionNamesMap[action]);
    });
    let mouseActions = settings.get_strv("mouse-actions");
    widgetMouseActionLeft.set_active(mouseActionNameIds.indexOf(mouseActions[0]));
    widgetMouseActionRight.set_active(mouseActionNameIds.indexOf(mouseActions[1]));

    (async () => {
        widgetCacheSize.set_text(await getCacheSize());
    })();
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
    widgetPreset = builder.get_object("sepchars-preset");
    widgetCustom = builder.get_object("sepchars-custom");
    widgetCacheSize = builder.get_object("cache-size");
    widgetElementOrder = builder.get_object("element-order");
    elementOrderWidgets = [];
    initWidgets();
    bindSettings();
    return builder.get_object("main_prefs");
};

const getCacheSize = async () => {
    // Command: du -hs [data_directory]/media-controls | awk '{NF=1}1'
    try {
        let dir = GLib.get_user_config_dir() + "/media-controls";
        const result = await execCommunicate(["/bin/bash", "-c", `du -hs ${dir} | awk '{NF=1}1'`]);
        return result || "0K";
    } catch (error) {
        logError(error);
    }
};
