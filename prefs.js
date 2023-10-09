"use strict";

const { Gio, Gtk, GObject, GLib, Adw } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain("mediacontrols");
const _ = Gettext.gettext;

const { Utf8ArrayToStr, execCommunicate } = Me.imports.utils;

function init() {
    ExtensionUtils.initTranslations("mediacontrols");
}

function fillPreferencesWindow(window) {
    let adwprefs = new AdwPrefs(
        window,
        "org.gnome.shell.extensions.mediacontrols"
    );

    return adwprefs;
}

class AdwPrefs {
    constructor(window, schema) {
        window.set_default_size(675, 750);
        window._settings = ExtensionUtils.getSettings(schema);

        const page1 = Adw.PreferencesPage.new();
        this._fillpage1(page1, window._settings);
        const page2 = Adw.PreferencesPage.new();
        this._fillpage2(page2, window._settings);
        const page3 = Adw.PreferencesPage.new();
        this._fillpage3(page3, window._settings);
        const page4 = Adw.PreferencesPage.new();
        this._fillpage4(page4, window._settings);
        const page5 = Adw.PreferencesPage.new();
        this._fillpage5(page5, window._settings);
        window.add(page1);
        window.add(page2);
        window.add(page3);
        window.add(page4);
        window.add(page5);
    }

    _ontracklabelchanged(
        settings,
        trackLabelOptKeys,
        trackLabelSep,
        trackLabelStart,
        trackLabelEnd
    ) {
        let currentTrackLabel = settings.get_strv("track-label");
        let trackLabelSepText = trackLabelSep.get_text();
        let trackLabelArray = [
            trackLabelOptKeys[trackLabelStart.get_active()] ||
                currentTrackLabel[0],
            trackLabelSepText !== null || trackLabelSepText !== undefined
                ? trackLabelSepText
                : currentTrackLabel[1],
            trackLabelOptKeys[trackLabelEnd.get_active()] ||
                currentTrackLabel[2],
        ];
        settings.set_strv("track-label", trackLabelArray);
    }

    _initTrackLabelWidgets(
        settings,
        trackLabelStart,
        trackLabelSep,
        trackLabelEnd
    ) {
        const trackLabelOpts = {
            track: _("Track"),
            artist: _("Artist"),
            url: _("URL"),
            name: _("Player name"),
            status: _("Playback status"),
            file: _("Filename"),
            none: _("None"),
        };
        const trackLabelOptKeys = Object.keys(trackLabelOpts);
        trackLabelOptKeys.forEach((opt) => {
            trackLabelStart.append(opt, _(trackLabelOpts[opt]));
            trackLabelEnd.append(opt, _(trackLabelOpts[opt]));
        });

        let tracklabelSetting = settings.get_strv("track-label");

        trackLabelSep.set_text(tracklabelSetting[1]);
        trackLabelStart.set_active(
            trackLabelOptKeys.indexOf(tracklabelSetting[0])
        );
        trackLabelEnd.set_active(
            trackLabelOptKeys.indexOf(tracklabelSetting[2])
        );

        trackLabelSep.connect(
            "changed",
            this._ontracklabelchanged.bind(
                this,
                settings,
                trackLabelOptKeys,
                trackLabelSep,
                trackLabelStart,
                trackLabelEnd
            )
        );
        trackLabelStart.connect(
            "changed",
            this._ontracklabelchanged.bind(
                this,
                settings,
                trackLabelOptKeys,
                trackLabelSep,
                trackLabelStart,
                trackLabelEnd
            )
        );
        trackLabelEnd.connect(
            "changed",
            this._ontracklabelchanged.bind(
                this,
                settings,
                trackLabelOptKeys,
                trackLabelSep,
                trackLabelStart,
                trackLabelEnd
            )
        );
    }

    _initSeperatorwidgets(settings, widgetPreset, widgetCustom) {
        // Init presets combobox
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
            _("Custom"),
        ];
        presetSepChars.forEach((preset) => {
            widgetPreset.append(preset, preset);
        });
        let savedSepChars = settings.get_strv("seperator-chars");
        let sepChars = `${savedSepChars[0]}...${savedSepChars[1]}`;
        if (presetSepChars.includes(sepChars)) {
            widgetPreset.set_active(presetSepChars.indexOf(sepChars));
        } else {
            widgetCustom.set_text(sepChars);
            widgetPreset.set_active(presetSepChars.length - 1);
        }
        widgetPreset.connect(
            "changed",
            this._onseperatorpresetchanged.bind(this, widgetPreset)
        );
        widgetCustom.connect(
            "changed",
            this._onseperatorcustomchanged.bind(
                this,
                widgetCustom,
                widgetPreset
            )
        );
    }

    _onextensionpositionchanged(settings, widget, positions) {
        settings.set_string(
            "extension-position",
            positions[widget.get_active()]
        );
    }

    _initExtensionPos(settings, widgetExtensionPos) {
        // Init extension position combobox
        const positionsOpts = {
            left: _("left"),
            center: _("center"),
            right: _("right"),
        };
        const positionsOptsKeys = Object.keys(positionsOpts);
        positionsOptsKeys.forEach((position) => {
            widgetExtensionPos.append(position, _(positionsOpts[position]));
        });
        widgetExtensionPos.set_active(
            positionsOptsKeys.indexOf(settings.get_string("extension-position"))
        );
        widgetExtensionPos.connect(
            "changed",
            this._onextensionpositionchanged.bind(
                this,
                settings,
                widgetExtensionPos,
                positionsOptsKeys
            )
        );
    }

    _onElementOrderChanged(settings, index, elementOrderWidgets, elementIds) {
        let newElementOrder = [];
        let elementOrder = settings.get_strv("element-order");
        elementOrderWidgets.forEach((_widget, index) => {
            let val = elementIds[_widget.get_active()];

            if (newElementOrder.includes(val)) {
                let _index = newElementOrder.indexOf(val);
                if (elementOrder[_index] === val) {
                    newElementOrder[_index] = elementOrder[index];
                    elementOrderWidgets[_index].set_active(
                        elementIds.indexOf(elementOrder[index])
                    );
                } else {
                    val = elementOrder[_index];
                    _widget.set_active(elementIds.indexOf(val));
                }
            }
            newElementOrder.push(val);
        });
        settings.set_strv("element-order", newElementOrder);
    }

    _initElementOrder(settings, group, elementOrderWidgets) {
        let adwrow;
        let elementOrder = settings.get_strv("element-order");
        const elements = {
            icon: _("Player icon"),
            title: _("Track title"),
            controls: _("Control icons"),
            menu: _("Sources menu"),
        };
        const elementIds = Object.keys(elements);
        elementIds.forEach((element, index) => {
            adwrow = new Adw.ActionRow({ title: _("Element") + " " + index });
            group.add(adwrow);
            let widget = new Gtk.ComboBoxText({
                valign: Gtk.Align.CENTER,
                visible: true,
                can_focus: false,
            });
            adwrow.add_suffix(widget);
            adwrow.activatable_widget = widget;
            elementIds.forEach((_element) => {
                widget.append(_element, _(elements[_element]));
            });

            widget.set_active(elementIds.indexOf(elementOrder[index]));

            widget.connect(
                "changed",
                this._onElementOrderChanged.bind(
                    this,
                    settings,
                    index,
                    elementOrderWidgets,
                    elementIds
                )
            );
            elementOrderWidgets.push(widget);
        });
    }

    _onMouseActionChanged(settings, index, widget, mouseActionNameIds) {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[widget.index] =
            mouseActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
    }

    _initMouseActions(settings, group) {
        let mouseActions = settings.get_strv("mouse-actions");
        const mouseActionLabels = [
            _("Left click"),
            _("Right click"),
            _("Middle click"),
            _("Left double click"),
            _("Right double click"),
            _("Scroll up"),
            _("Scroll down"),
            _("Hover"),
        ];
        mouseActionLabels.forEach((label, index) => {
            let adwrow = new Adw.ActionRow({
                title: label,
            });
            if (label === _("Hover")) {
                adwrow.set_subtitle(_("unstable"));
            }
            let widgetCombobox = new Gtk.ComboBoxText({
                visible: true,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                can_focus: false,
            });
            adwrow.add_suffix(widgetCombobox);
            adwrow.activatable_widget = widgetCombobox;
            group.add(adwrow);
            const mouseActionNamesMap = {
                none: _("None"),
                toggle_play: _("Toggle play/pause"),
                play: _("Play"),
                pause: _("Pause"),
                next: _("Next"),
                previous: _("Previous"),
                toggle_loop: _("Cycle loop options"),
                toggle_shuffle: _("Toggle shuffle"),
                toggle_menu: _("Toggle sources menu"),
                toggle_info: _("Toggle track information menu"),
                raise: _("Raise player"),
                quit: _("Quit player"),
            };
            let mouseActionNameIds = Object.keys(mouseActionNamesMap);
            mouseActionNameIds.forEach((action) => {
                widgetCombobox.append(action, _(mouseActionNamesMap[action]));
            });

            widgetCombobox.set_active(
                mouseActionNameIds.indexOf(mouseActions[index])
            );
            widgetCombobox.index = index;
            widgetCombobox.connect(
                "changed",
                this._onMouseActionChanged.bind(
                    this,
                    settings,
                    index,
                    widgetCombobox,
                    mouseActionNameIds
                )
            );
        });
    }

    _onblacklistdelete(settings, group, adwrow, widget) {
        let currentBlacklistApps = settings.get_strv("backlist-apps");
        currentBlacklistApps.splice(
            currentBlacklistApps.indexOf(widget.app),
            1
        );
        settings.set_strv("backlist-apps", currentBlacklistApps);
        group.remove(adwrow);
    }

    _onblacklistaddrow(settings, app, group) {
        const adwrow = new Adw.ActionRow({
            title: app,
        });
        group.add(adwrow);

        let deleteButton = Gtk.Button.new_from_icon_name(
            "edit-delete-symbolic",
            Gtk.IconSize.BUTTON || Gtk.IconSize.NORMAL
        );
        deleteButton.set_valign(Gtk.Align.CENTER);
        adwrow.add_suffix(deleteButton);
        adwrow.activatable_widget = deleteButton;
        deleteButton.visible = true;
        deleteButton.app = app;

        deleteButton.connect(
            "clicked",
            this._onblacklistdelete.bind(
                this,
                settings,
                group,
                adwrow,
                deleteButton
            )
        );
    }

    _onblacklistentryadd(settings, group, entry) {
        if (entry.get_text() == "") {
            log("_onblacklistentryadd: player cannot be empty");
            return false;
        }
        let currentBlacklistApps = settings.get_strv("backlist-apps");
        currentBlacklistApps.push(entry.get_text());
        this._onblacklistaddrow(settings, entry.get_text(), group);
        settings.set_strv("backlist-apps", currentBlacklistApps);
        entry.set_text("");
    }

    _initblacklistapps(settings, group) {
        let currentBlacklistApps = settings.get_strv("backlist-apps");

        currentBlacklistApps.forEach((app) => {
            this._onblacklistaddrow(settings, app, group);
        });
    }

    async _initCacheSize(widgetCacheSize) {
        widgetCacheSize.set_text(await this._getCacheSize());
    }

    _createGtkSwitch(settings, strSetting) {
        const gtkswitch = new Gtk.Switch({
            active: settings.get_boolean(strSetting),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            strSetting,
            gtkswitch,
            "active",
            Gio.SettingsBindFlags.DEFAULT
        );
        return gtkswitch;
    }

    _fillpage1(page1, settings) {
        let adwrow;
        page1.set_title(_("General"));
        page1.set_name("mediacontrols_page1");
        page1.set_icon_name("preferences-system-symbolic");

        // group1
        const group1 = Adw.PreferencesGroup.new();
        group1.set_title(_("Settings"));
        group1.set_name("mediacontrols_settings");
        page1.add(group1);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Max widget width"),
            subtitle: _("0 to disable"),
        });
        const maxwidgetwidth = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
        maxwidgetwidth.set_sensitive(true);
        maxwidgetwidth.set_range(0, 500);
        maxwidgetwidth.set_value(200);
        maxwidgetwidth.set_increments(1, 10);
        settings.bind(
            "max-widget-width",
            maxwidgetwidth,
            "value",
            Gio.SettingsBindFlags.DEFAULT
        );
        adwrow.add_suffix(maxwidgetwidth);
        adwrow.activatable_widget = maxwidgetwidth;
        group1.add(adwrow);
        //row2
        adwrow = new Adw.ActionRow({
            title: _("Seek time (seconds)"),
        });
        const seekintervalsecs = new Gtk.SpinButton({
            valign: Gtk.Align.CENTER,
        });
        seekintervalsecs.set_sensitive(true);
        seekintervalsecs.set_range(5, 30);
        seekintervalsecs.set_value(5);
        seekintervalsecs.set_increments(1, 1);
        settings.bind(
            "seek-interval-secs",
            seekintervalsecs,
            "value",
            Gio.SettingsBindFlags.DEFAULT
        );
        adwrow.add_suffix(seekintervalsecs);
        adwrow.activatable_widget = seekintervalsecs;
        group1.add(adwrow);
        //row3
        adwrow = new Adw.ActionRow({
            title: _("Use native seek"),
            subtitle: _("Some players do not support seek."),
        });
        const preferusingseek = new Gtk.Switch({
            active: settings.get_boolean("prefer-using-seek"),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            "prefer-using-seek",
            preferusingseek,
            "active",
            Gio.SettingsBindFlags.DEFAULT
        );
        adwrow.add_suffix(preferusingseek);
        adwrow.activatable_widget = preferusingseek;
        group1.add(adwrow);
        //row4
        adwrow = new Adw.ActionRow({
            title: _("Hide the default media notification"),
        });
        const hidemedianotification = new Gtk.Switch({
            active: settings.get_boolean("hide-media-notification"),
            valign: Gtk.Align.CENTER,
        });
        settings.bind(
            "hide-media-notification",
            hidemedianotification,
            "active",
            Gio.SettingsBindFlags.DEFAULT
        );
        adwrow.add_suffix(hidemedianotification);
        adwrow.activatable_widget = hidemedianotification;
        group1.add(adwrow);
        // group2
        const group2 = Adw.PreferencesGroup.new();
        group2.set_title(_("Track label"));
        group2.set_name("mediacontrols_tracklabel");
        page1.add(group2);
        //row1
        adwrow = new Adw.ActionRow({});
        const trackLabelStart = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        adwrow.add_suffix(trackLabelStart);
        adwrow.activatable_widget = trackLabelStart;
        const trackLabelSep = new Gtk.Entry({ valign: Gtk.Align.CENTER });
        adwrow.add_suffix(trackLabelSep);
        adwrow.activatable_widget = trackLabelSep;
        const trackLabelEnd = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        adwrow.add_suffix(trackLabelEnd);
        adwrow.activatable_widget = trackLabelEnd;
        group2.add(adwrow);
        this._initTrackLabelWidgets(
            settings,
            trackLabelStart,
            trackLabelSep,
            trackLabelEnd
        );
        // group3
        const group3 = Adw.PreferencesGroup.new();
        group3.set_title(_("Github"));
        group3.set_name("mediacontrols_github");
        page1.add(group3);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Release Notes"),
            subtitle: _("Click to open"),
        });
        const relnotes = new Gtk.LinkButton({ valign: Gtk.Align.CENTER });
        relnotes.set_uri(
            "https://github.com/cliffniff/media-controls/releases/latest"
        );
        adwrow.add_suffix(relnotes);
        adwrow.activatable_widget = relnotes;
        group3.add(adwrow);
        adwrow = new Adw.ActionRow({
            title: _("Report a issue"),
            subtitle: _("Click to open"),
        });
        const repissue = new Gtk.LinkButton({ valign: Gtk.Align.CENTER });
        repissue.set_uri("https://github.com/cliffniff/media-controls/issues");
        adwrow.add_suffix(repissue);
        adwrow.activatable_widget = repissue;
        group3.add(adwrow);
        adwrow = new Adw.ActionRow({
            title: _("Extension home page"),
            subtitle: _("Click to open"),
        });
        const exthomepage = new Gtk.LinkButton({ valign: Gtk.Align.CENTER });
        exthomepage.set_uri(
            "https://github.com/cliffniff/media-controls/blob/main/README.md"
        );
        adwrow.add_suffix(exthomepage);
        adwrow.activatable_widget = exthomepage;
        group3.add(adwrow);
    }

    _fillpage2(page2, settings) {
        let adwrow;
        page2.set_title(_("Visibility"));
        page2.set_name("mediacontrols_page2");
        page2.set_icon_name("video-display-symbolic");
        // group1
        const group1 = Adw.PreferencesGroup.new();
        group1.set_title(_("show/hide elements"));
        group1.set_name("mediacontrols_showhide");
        page2.add(group1);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Title/Track name"),
        });
        const showtext = this._createGtkSwitch(settings, "show-text");
        adwrow.add_suffix(showtext);
        adwrow.activatable_widget = showtext;
        group1.add(adwrow);
        //row2
        adwrow = new Adw.ActionRow({
            subtitle: _("Separators"),
        });
        const showseperators = this._createGtkSwitch(
            settings,
            "show-seperators"
        );
        adwrow.add_suffix(showseperators);
        adwrow.activatable_widget = showseperators;
        group1.add(adwrow);
        //row3
        adwrow = new Adw.ActionRow({
            title: _("Player controls"),
        });
        const showcontrolicons = this._createGtkSwitch(
            settings,
            "show-control-icons"
        );
        adwrow.add_suffix(showcontrolicons);
        adwrow.activatable_widget = showcontrolicons;
        group1.add(adwrow);
        //row4
        adwrow = new Adw.ActionRow({
            subtitle: _("Play/pause button"),
        });
        const showplaypauseicon = this._createGtkSwitch(
            settings,
            "show-playpause-icon"
        );
        adwrow.add_suffix(showplaypauseicon);
        adwrow.activatable_widget = showplaypauseicon;
        group1.add(adwrow);
        //row5
        adwrow = new Adw.ActionRow({
            subtitle: _("Previous track button"),
        });
        const showprevicon = this._createGtkSwitch(settings, "show-prev-icon");
        adwrow.add_suffix(showprevicon);
        adwrow.activatable_widget = showprevicon;
        group1.add(adwrow);
        //row6
        adwrow = new Adw.ActionRow({
            subtitle: _("Next track button"),
        });
        const shownexticon = this._createGtkSwitch(settings, "show-next-icon");
        adwrow.add_suffix(shownexticon);
        adwrow.activatable_widget = shownexticon;
        group1.add(adwrow);
        //row7
        adwrow = new Adw.ActionRow({
            subtitle: _("Seek back button"),
        });
        const showseekback = this._createGtkSwitch(settings, "show-seek-back");
        adwrow.add_suffix(showseekback);
        adwrow.activatable_widget = showseekback;
        group1.add(adwrow);
        //row8
        adwrow = new Adw.ActionRow({
            subtitle: _("Seek forward button"),
        });
        const showseekforward = this._createGtkSwitch(
            settings,
            "show-seek-forward"
        );
        adwrow.add_suffix(showseekforward);
        adwrow.activatable_widget = showseekforward;
        group1.add(adwrow);
        //row9
        adwrow = new Adw.ActionRow({
            title: _("Player icon"),
        });
        const showplayericon = this._createGtkSwitch(
            settings,
            "show-player-icon"
        );
        adwrow.add_suffix(showplayericon);
        adwrow.activatable_widget = showplayericon;
        group1.add(adwrow);
        //row10
        adwrow = new Adw.ActionRow({
            title: _("Sources menu"),
        });
        const showsourcesmenu = this._createGtkSwitch(
            settings,
            "show-sources-menu"
        );
        adwrow.add_suffix(showsourcesmenu);
        adwrow.activatable_widget = showsourcesmenu;
        group1.add(adwrow);
        // group2
        const group2 = Adw.PreferencesGroup.new();
        group2.set_title(_("Colors"));
        group2.set_name("mediacontrols_color");
        page2.add(group2);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Colored player icon"),
        });
        const coloredplayericon = this._createGtkSwitch(
            settings,
            "colored-player-icon"
        );
        adwrow.add_suffix(coloredplayericon);
        adwrow.activatable_widget = coloredplayericon;
        group2.add(adwrow);
        // group3
        const group3 = Adw.PreferencesGroup.new();
        group3.set_title(_("Separator characters"));
        group3.set_name("mediacontrols_seperator");
        page2.add(group3);
        //row1
        adwrow = new Adw.ActionRow({ title: _("Preset") });
        const widgetPreset = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        adwrow.add_suffix(widgetPreset);
        adwrow.activatable_widget = widgetPreset;
        group3.add(adwrow);
        adwrow = new Adw.ActionRow({
            title: _("Custom"),
            subtitle: _("To use it choose 'Custom' under 'Preset' selection"),
        });
        const widgetCustom = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
        });
        widgetCustom.set_text("<...>");
        adwrow.add_suffix(widgetCustom);
        adwrow.activatable_widget = widgetCustom;
        group3.add(adwrow);
        this._initSeperatorwidgets(settings, widgetPreset, widgetCustom);
    }

    _fillpage3(page3, settings) {
        let adwrow;
        page3.set_title(_("Appearance"));
        page3.set_name("mediacontrols_page3");
        page3.set_icon_name("video-single-display-symbolic");
        // group1
        const group1 = Adw.PreferencesGroup.new();
        group1.set_title(_("Position"));
        group1.set_name("mediacontrols_position");
        page3.add(group1);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Extension position"),
        });
        const widgetExtensionPos = new Gtk.ComboBoxText({
            valign: Gtk.Align.CENTER,
        });
        this._initExtensionPos(settings, widgetExtensionPos);
        adwrow.add_suffix(widgetExtensionPos);
        adwrow.activatable_widget = widgetExtensionPos;
        group1.add(adwrow);
        //row2
        adwrow = new Adw.ActionRow({
            title: _("Extension index"),
        });
        const extensionindex = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
        extensionindex.set_sensitive(true);
        extensionindex.set_range(0, 100);
        extensionindex.set_value(0);
        extensionindex.set_increments(1, 10);
        settings.bind(
            "extension-index",
            extensionindex,
            "value",
            Gio.SettingsBindFlags.DEFAULT
        );
        adwrow.add_suffix(extensionindex);
        adwrow.activatable_widget = extensionindex;
        group1.add(adwrow);
        const group2 = Adw.PreferencesGroup.new();
        group2.set_title(_("Element order"));
        group2.set_name("mediacontrols_elementorder");
        page3.add(group2);
        let elementOrderWidgets = [];
        this._initElementOrder(settings, group2, elementOrderWidgets);
    }

    _fillpage4(page4, settings) {
        page4.set_title(_("Appliance"));
        page4.set_name("mediacontrols_page4");
        page4.set_icon_name("input-mouse-symbolic");
        // group1
        const group1 = Adw.PreferencesGroup.new();
        group1.set_title(_("Mouse actions"));
        group1.set_name("mediacontrols_mouseactions");
        page4.add(group1);
        this._initMouseActions(settings, group1);
    }

    _fillpage5(page5, settings) {
        let adwrow;
        page5.set_title(_("Other"));
        page5.set_name("mediacontrols_page5");
        page5.set_icon_name("preferences-other-symbolic");
        // group1
        const group1 = Adw.PreferencesGroup.new();
        group1.set_title(_("Cache"));
        group1.set_name("mediacontrols_cache");
        page5.add(group1);
        //row1
        adwrow = new Adw.ActionRow({
            title: _("Cache images"),
        });
        const cacheimages = this._createGtkSwitch(settings, "cache-images");
        adwrow.add_suffix(cacheimages);
        adwrow.activatable_widget = cacheimages;
        group1.add(adwrow);
        //row2
        adwrow = new Adw.ActionRow({
            title: _(
                "Media Controls caches album art so they don't need to be redownloaded every time. You can clear your cache here."
            ),
        });
        group1.add(adwrow);
        adwrow = new Adw.ActionRow();
        const widgetCacheSize = new Gtk.Label({
            label: "0 MB",
            valign: Gtk.Align.CENTER,
        });
        this._initCacheSize(widgetCacheSize);
        const clearcachespinner = new Gtk.Spinner({
            valign: Gtk.Align.CENTER,
        });
        const deletecachebutton = new Gtk.Button({
            label: _("Clear cache"),
            valign: Gtk.Align.CENTER,
        });
        adwrow.activatable_widget = deletecachebutton;
        deletecachebutton.connect(
            "clicked",
            this._onclearcacheclicked.bind(
                this,
                widgetCacheSize,
                clearcachespinner
            )
        );
        adwrow.add_suffix(deletecachebutton);
        adwrow.add_suffix(clearcachespinner);
        adwrow.add_suffix(widgetCacheSize);
        group1.add(adwrow);
        // group2
        const group2 = Adw.PreferencesGroup.new();
        group2.set_title(_("Blacklist players"));
        group2.set_name("mediacontrols_blacklistplayers");
        page5.add(group2);
        //row1
        adwrow = new Adw.ActionRow({ title: _("Player") });
        const blacklistentry = new Gtk.Entry({ valign: Gtk.Align.CENTER });
        adwrow.add_suffix(blacklistentry);
        adwrow.activatable_widget = blacklistentry;
        group2.add(adwrow);
        const blacklistbuttonadd = Gtk.Button.new_from_icon_name(
            "list-add-symbolic",
            Gtk.IconSize.BUTTON || Gtk.IconSize.NORMAL
        );
        blacklistbuttonadd.set_valign(Gtk.Align.CENTER);
        adwrow.add_suffix(blacklistbuttonadd);
        adwrow.activatable_widget = blacklistbuttonadd;
        blacklistbuttonadd.connect(
            "clicked",
            this._onblacklistentryadd.bind(
                this,
                settings,
                group2,
                blacklistentry
            )
        );
        this._initblacklistapps(settings, group2);
    }

    _onseperatorpresetchanged(widget) {
        let label = widget.get_label();
        let strlabelC = _("Custom");
        if (label !== strlabelC) {
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
            let presetValue = presetSepChars[widget.get_active()];
            settings.set_strv("seperator-chars", [
                presetValue.charAt(0),
                presetValue.charAt(presetValue.length - 1),
            ]);
        }
    }

    _onseperatorcustomchanged(widget, widgetPreset) {
        let label = widgetPreset.get_label();
        let strlabelC = _("Custom");
        if (label === strlabelC) {
            let customValues = widget.get_text().split("...");
            if (customValues[0] && customValues[1]) {
                settings.set_strv("seperator-chars", [
                    customValues[0],
                    customValues[1],
                ]);
            }
        }
    }

    async _getCacheSize() {
        // Command: du -hs [data_directory]/media-controls | awk '{NF=1}1'
        try {
            let dir = GLib.get_user_config_dir() + "/media-controls";
            const result = await execCommunicate([
                "/bin/bash",
                "-c",
                `du -hs ${dir} | awk '{NF=1}1'`,
            ]);
            return result || "0K";
        } catch (error) {
            logError(error);
        }
    }

    async _clearcache(widgetCacheSize, clearcachespinner) {
        let dir = GLib.get_user_config_dir() + "/media-controls";
        try {
            clearcachespinner.start();
            await execCommunicate(["rm", "-r", dir]);
            widgetCacheSize.set_text(await this._getCacheSize());
            clearcachespinner.stop();
        } catch (error) {
            widgetCacheSize.set_text(_("Failed to clear cache"));
            clearcachespinner.stop();
        }
    }

    _onclearcacheclicked(widgetCacheSize, clearcachespinner) {
        this._clearcache(widgetCacheSize, clearcachespinner);
    }
}
