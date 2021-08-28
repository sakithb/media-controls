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
    let schemaDir = Me.dir.get_child("schemas");
    if (schemaDir.query_exists(null))
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir.get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );
    else
        let gschema = Gio.SettingsSchemaSource.get_default();

    let settings = new Gio.Settings({
        settings_schema: gschema.lookup(
            "org.gnome.shell.extensions.mediacontrols",
            true
        ),
    });

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
        label: "Max string length (Each artist and title):",
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
        label: "Refresh rate (seconds):",
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

    return prefsWidget;
}
