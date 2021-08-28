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

function init() {}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings();

    let prefsWidget;
    if (shellVersion < 40) {
        prefsWidget = new Gtk.Grid({
            margin: 18,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        });
    } else {
        prefsWidget = new Gtk.Grid({
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        });
    }

    let index = 0;

    let title = new Gtk.Label({
        label: "<b>" + Me.metadata.name + " Extension Preferences</b>",
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true,
    });
    prefsWidget.attach(title, 0, index, 1, 1);

    /* max-string-length */
    let maxDisplayLengthLabel = new Gtk.Label({
        label: "Max display length:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let maxDisplayLengthEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 100,
            step_increment: 1,
        }),
        visible: true,
    });

    index++;
    prefsWidget.attach(maxDisplayLengthLabel, 0, index, 1, 1);
    prefsWidget.attach(maxDisplayLengthEntry, 1, index, 1, 1);

    /* Update delay */
    let updateDelayLabel = new Gtk.Label({
        label: "Update delay (milliseconds):",
        halign: Gtk.Align.START,
        visible: true,
    });

    let updateDelayEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 500,
            upper: 5000,
            step_increment: 500,
        }),
        visible: true,
    });

    index++;
    prefsWidget.attach(updateDelayLabel, 0, index, 1, 1);
    prefsWidget.attach(updateDelayEntry, 1, index, 1, 1);

    /* Hide track name */
    let hideTrackLabel = new Gtk.Label({
        label: "Hide track name:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let hideTrackSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    prefsWidget.attach(hideTrackLabel, 0, index, 1, 1);
    prefsWidget.attach(hideTrackSwitch, 1, index, 1, 1);

    /* Hide player icon */
    let hidePlayerLabel = new Gtk.Label({
        label: "Hide player icon:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let hidePlayerSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    prefsWidget.attach(hidePlayerLabel, 0, index, 1, 1);
    prefsWidget.attach(hidePlayerSwitch, 1, index, 1, 1);

    /* Hide controls */
    let hideControlsLabel = new Gtk.Label({
        label: "Hide controls:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let hideControlsSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true,
    });

    index++;
    prefsWidget.attach(hideControlsLabel, 0, index, 1, 1);
    prefsWidget.attach(hideControlsSwitch, 1, index, 1, 1);

    /* extension-position */
    let extensionPositionLabel = new Gtk.Label({
        label: "Extension position:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let options = ["left", "center", "right"];
    let extensionPositionComboBox = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true,
    });
    for (let i = 0; i < options.length; i++) {
        extensionPositionComboBox.append(options[i], options[i]);
    }
    extensionPositionComboBox.set_active(
        options.indexOf(settings.get_string("extension-position"))
    );

    index++;
    prefsWidget.attach(extensionPositionLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionPositionComboBox, 1, index, 1, 1);

    /* extension-index */
    let extensionIndexLabel = new Gtk.Label({
        label: "Extension index:",
        halign: Gtk.Align.START,
        visible: true,
    });

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1,
        }),
        visible: true,
    });

    index++;
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionIndexEntry, 1, index, 1, 1);

    //settings.bind('command', commandEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    settings.bind(
        "max-display-length",
        maxDisplayLengthEntry,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "update-delay",
        updateDelayEntry,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-track-name",
        hideTrackSwitch,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-player-icon",
        hidePlayerSwitch,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-controls",
        hideControlsSwitch,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    settings.bind(
        "hide-controls",
        hideControlsSwitch,
        "active",
        Gio.SettingsBindFlags.DEFAULT
    );
    extensionPositionComboBox.connect("changed", (widget) => {
        settings.set_string("extension-position", options[widget.get_active()]);
    });
    settings.bind(
        "extension-index",
        extensionIndexEntry,
        "value",
        Gio.SettingsBindFlags.DEFAULT
    );

    return prefsWidget;
}
