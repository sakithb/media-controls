// Based on https://github.com/mheine/gnome-shell-spotify-label/blob/master/prefs.js

"use strict";

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split(".");
const shellVersion = Number.parseInt(major);

const positions = ["left", "center", "right"];
const mouseActions = ["none", "toggle_play", "play", "pause", "next", "prev"];

function init() {}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings();

    let widgetPrefs;
    if (shellVersion < 40) {
        widgetPrefs = new Gtk.Grid({
            margin: 15,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        });
    } else {
        widgetPrefs = new Gtk.Grid({
            margin_top: 15,
            margin_bottom: 15,
            margin_start: 15,
            margin_end: 15,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        });
    }

    let index = 0;

    // First section - General
    // SECTION START
    let labelGeneral = new Gtk.Label({
        label: "<b>General</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    widgetPrefs.attach(labelGeneral, 0, index, 1, 1);

    // Adjust maximum text length
    let labelMaxDisplayLength = new Gtk.Label({
        label: "Maximum text length:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let entryMaxDisplayLength = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
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
            lower: 500,
            upper: 5000,
            step_increment: 500,
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
    let labelAnimateText = new Gtk.Label({
        label: "Animate text:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let switchAnimateText = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    widgetPrefs.attach(labelAnimateText, 0, index, 1, 1);
    widgetPrefs.attach(switchAnimateText, 1, index, 1, 1);

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

    for (let i = 0; i < positions.length; i++) {
        comboboxExtensionPosition.append(positions[i], positions[i]);
    }

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
        margin_end: 130,
    });

    let labelMouseActionsRightClick = new Gtk.Label({
        label: "Right click:",
        halign: Gtk.Align.END,
        visible: true,
        margin_end: 130,
    });

    let comboboxMouseActionsLeftClick = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    let comboboxMouseActionsRightClick = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });

    for (let i = 0; i < mouseActions.length; i++) {
        comboboxMouseActionsLeftClick.append(mouseActions[i], mouseActions[i]);
        comboboxMouseActionsRightClick.append(mouseActions[i], mouseActions[i]);
    }

    comboboxMouseActionsLeftClick.set_active(
        mouseActions.indexOf(settings.get_string("mouse-actions-left"))
    );

    comboboxMouseActionsRightClick.set_active(
        mouseActions.indexOf(settings.get_string("mouse-actions-right"))
    );

    index++;
    widgetPrefs.attach(labelMouseActions, 0, index, 1, 1);
    widgetPrefs.attach(labelMouseActionsLeftClick, 1, index, 1, 1);
    widgetPrefs.attach(comboboxMouseActionsLeftClick, 1, index, 1, 1);
    index++;
    widgetPrefs.attach(labelMouseActionsRightClick, 1, index, 1, 1);
    widgetPrefs.attach(comboboxMouseActionsRightClick, 1, index, 1, 1);

    // SECTION END

    //settings.bind('command', commandEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    settings.bind(
        "max-text-length",
        entryMaxDisplayLength,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "update-delay",
        entryUpdateDelay,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-text",
        switchHideText,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-player-icon",
        switchHidePlayerIcon,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-control-icons",
        switchHideControlIcons,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "colored-player-icon",
        switchColoredPlayerIcon,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "animate-text",
        switchAnimateText,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    comboboxExtensionPosition.connect("changed", (widget) => {
        settings.set_string(
            "extension-position",
            positions[widget.get_active()]
        );
    });
    settings.bind(
        "extension-index",
        entryExtensionIndex,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );

    comboboxMouseActionsLeftClick.connect("changed", (widget) => {
        settings.set_string(
            "mouse-actions-left",
            mouseActions[widget.get_active()]
        );
    });

    comboboxMouseActionsRightClick.connect("changed", (widget) => {
        settings.set_string(
            "mouse-actions-right",
            mouseActions[widget.get_active()]
        );
    });
    return widgetPrefs;
}
