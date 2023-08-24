"use strict";

import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import Adw from "gi://Adw";

import { Utf8ArrayToStr, execCommunicate } from "./utils.js";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class MediaControlsPreferences extends ExtensionPreferences {
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
    trackLabelStart.set_active(trackLabelOptKeys.indexOf(tracklabelSetting[0]));
    trackLabelEnd.set_active(trackLabelOptKeys.indexOf(tracklabelSetting[2]));
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
      widgetPreset.set_active(0);
    }
  }

  _initWidgets(
    settings,
    widgetPreset,
    widgetCustom,
    trackLabelStart,
    trackLabelSep,
    trackLabelEnd,
    widgetCacheSize,
    widgetElementOrder,
    widgetBacklistBox
  ) {
    let elementOrderWidgets = [];

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
    ];
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
    const positions = [_("left"), _("center"), _("right")];
    let widgetExtensionPos = builder.get_object("extension-position");
    positions.forEach((position) => {
      widgetExtensionPos.append(position, _(position));
    });
    widgetExtensionPos.set_active(
      positions.indexOf(settings.get_string("extension-position"))
    );

    let elementOrder = settings.get_strv("element-order");
    const elements = {
      icon: _("Player icon"),
      title: _("Track title"),
      controls: _("Control icons"),
      menu: _("Sources menu"),
    };
    const elementIds = Object.keys(elements);
    elementIds.forEach((element, index) => {
      let widget = new Gtk.ComboBoxText({
        visible: true,
        can_focus: false,
      });

      elementIds.forEach((_element) => {
        widget.append(_element, _(elements[_element]));
      });

      widget.set_active(elementIds.indexOf(elementOrder[index]));

      widget.connect("changed", () => {
        let newElementOrder = [];
        elementOrder = settings.get_strv("element-order");
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
      });

      widgetElementOrder.attach(widget, 1, index, 1, 1);
      elementOrderWidgets.push(widget);
    });
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
    trackLabelStart.set_active(trackLabelOptKeys.indexOf(tracklabelSetting[0]));
    trackLabelEnd.set_active(trackLabelOptKeys.indexOf(tracklabelSetting[2]));

    let mouseActions = settings.get_strv("mouse-actions");
    let widgetMouseActionsGrid = builder.get_object("mouse-actions-grid");
    const mouseActionLabels = [
      _("Left click"),
      _("Right click"),
      _("Middle click"),
      _("Left double click"),
      _("Right double click"),
      _("Scroll up"),
      _("Scroll down"),
      _("Hover <i><span size='smaller'>(unstable)</span></i>"),
    ];
    mouseActionLabels.forEach((label, index) => {
      let widgetLabel = new Gtk.Label({
        use_markup: true,
        label,
        visible: true,
        halign: Gtk.Align.START,
      });

      let widgetCombobox = new Gtk.ComboBoxText({
        visible: true,
        halign: Gtk.Align.END,
        can_focus: false,
      });
      const mouseActionNamesMap = {
        none: _("None"),
        toggle_play: _("Toggle play/pause"),
        play: _("Play"),
        pause: _("Pause"),
        next: _("Next"),
        previous: _("Previous"),
        toggle_loop: _("Cycle loop options"),
        toggle_shuffle: _("Toggle shuffle"),
        toggle_menu: _("Open sources menu"),
        toggle_info: _("Open track information menu"),
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

      widgetCombobox.connect("changed", (widget) => {
        let currentMouseActions = settings.get_strv("mouse-actions");
        currentMouseActions[widget.index] =
          mouseActionNameIds[widget.get_active()];
        settings.set_strv("mouse-actions", currentMouseActions);
      });

      widgetMouseActionsGrid.attach(widgetLabel, 0, index, 1, 1);
      widgetMouseActionsGrid.attach(widgetCombobox, 1, index, 1, 1);
    });

    let currentBacklistApps = settings.get_strv("backlist-apps");

    currentBacklistApps.forEach((app) => {
      addToBacklistListBox(app, widgetBacklistBox);
    });

    (async () => {
      widgetCacheSize.set_text(await getCacheSize());
    })();
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
    const seekintervalsecs = new Gtk.SpinButton({ valign: Gtk.Align.CENTER });
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
    const trackLabelStart = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
    adwrow.add_suffix(trackLabelStart);
    adwrow.activatable_widget = trackLabelStart;
    const trackLabelSep = new Gtk.Entry({ valign: Gtk.Align.CENTER });
    adwrow.add_suffix(trackLabelSep);
    adwrow.activatable_widget = trackLabelSep;
    const trackLabelEnd = new Gtk.ComboBoxText({ valign: Gtk.Align.CENTER });
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
      title: _("Player controls"),
    });
    const showcontrolicons = this._createGtkSwitch(
      settings,
      "show-control-icons"
    );
    adwrow.add_suffix(showcontrolicons);
    adwrow.activatable_widget = showcontrolicons;
    group1.add(adwrow);
    //row3
    adwrow = new Adw.ActionRow({
      title: _("Play/pause button"),
    });
    const showplaypauseicon = this._createGtkSwitch(
      settings,
      "show-playpause-icon"
    );
    adwrow.add_suffix(showplaypauseicon);
    adwrow.activatable_widget = showplaypauseicon;
    group1.add(adwrow);
    //row4
    adwrow = new Adw.ActionRow({
      title: _("Previous track button"),
    });
    const showprevicon = this._createGtkSwitch(settings, "show-prev-icon");
    adwrow.add_suffix(showprevicon);
    adwrow.activatable_widget = showprevicon;
    group1.add(adwrow);
    //row5
    adwrow = new Adw.ActionRow({
      title: _("Next track button"),
    });
    const shownexticon = this._createGtkSwitch(settings, "show-next-icon");
    adwrow.add_suffix(shownexticon);
    adwrow.activatable_widget = shownexticon;
    group1.add(adwrow);
    //row6
    adwrow = new Adw.ActionRow({
      title: _("Seek back button"),
    });
    const showseekback = this._createGtkSwitch(settings, "show-seek-back");
    adwrow.add_suffix(showseekback);
    adwrow.activatable_widget = showseekback;
    group1.add(adwrow);
    //row7
    adwrow = new Adw.ActionRow({
      title: _("Seek forward button"),
    });
    const showseekforward = this._createGtkSwitch(
      settings,
      "show-seek-forward"
    );
    adwrow.add_suffix(showseekforward);
    adwrow.activatable_widget = showseekforward;
    group1.add(adwrow);
    //row8
    adwrow = new Adw.ActionRow({
      title: _("Player icon"),
    });
    const showplayericon = this._createGtkSwitch(settings, "show-player-icon");
    adwrow.add_suffix(showplayericon);
    adwrow.activatable_widget = showplayericon;
    group1.add(adwrow);
    //row9
    adwrow = new Adw.ActionRow({
      title: _("Seperators"),
    });
    const showseperators = this._createGtkSwitch(settings, "show-seperators");
    adwrow.add_suffix(showseperators);
    adwrow.activatable_widget = showseperators;
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
    group3.set_title(_("Seperator characters"));
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
    adwrow = new Adw.ActionRow({ title: _("Custom") });
    const widgetCustom = new Gtk.Entry({
      valign: Gtk.Align.CENTER,
    });
    widgetCustom.set_text("<...>");
    adwrow.add_suffix(widgetCustom);
    adwrow.activatable_widget = widgetCustom;
    group3.add(adwrow);
    this._initSeperatorwidgets(settings, widgetPreset, widgetCustom);
    widgetPreset.connect(
      "changed",
      this._onseperatorpresetchanged.bind(this, widgetPreset)
    );
    widgetCustom.connect(
      "changed",
      this._onseperatorcustomchanged.bind(this, widgetCustom, widgetPreset)
    );
  }

  _fillpage3(page3, settings) {
    let adwrow;
    page3.set_title(_("Position"));
    page3.set_name("mediacontrols_page3");
    page3.set_icon_name("video-single-display-symbolic");
  }

  _fillpage4(page4, settings) {
    let adwrow;
    page4.set_title(_("Other"));
    page4.set_name("mediacontrols_page4");
    page4.set_icon_name("preferences-other-symbolic");
  }

  fillPreferencesWindow(window) {
    window.set_default_size(675, 750);
    window._settings = this.getSettings();

    const page1 = Adw.PreferencesPage.new();
    this._fillpage1(page1, window._settings);
    const page2 = Adw.PreferencesPage.new();
    this._fillpage2(page2, window._settings);
    const page3 = Adw.PreferencesPage.new();
    this._fillpage3(page3, window._settings);
    const page4 = Adw.PreferencesPage.new();
    this._fillpage4(page4, window._settings);
    window.add(page1);
    window.add(page2);
    window.add(page3);
    window.add(page4);
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
}

const signalHandler = {
  // Disable the opposite inputs from the selected and apply changes
  on_seperator_character_group_changed: (widget) => {
    let label = widget.get_label();
    let strlabelP = _("Preset");
    let strlabelC = _("Custom");
    let active = widget.get_active();
    if (label === strlabelP && active) {
      widgetCustom.set_sensitive(false);
      widgetPreset.set_sensitive(true);
      signalHandler.on_seperator_preset_changed(widgetPreset);
    } else if (label === strlabelC && active) {
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
        settings.set_strv("seperator-chars", [
          customValues[0],
          customValues[1],
        ]);
      }
    }
  },

  // on_mouse_actions_left_changed: (widget) => {
  //     let currentMouseActions = settings.get_strv("mouse-actions");
  //     currentMouseActions[0] = mouseActionNameIds[widget.get_active()];
  //     settings.set_strv("mouse-actions", currentMouseActions);
  // },
  // on_mouse_actions_right_changed: (widget) => {
  //     let currentMouseActions = settings.get_strv("mouse-actions");
  //     currentMouseActions[1] = mouseActionNameIds[widget.get_active()];
  //     settings.set_strv("mouse-actions", currentMouseActions);
  // },
  on_extension_position_changed: (widget) => {
    settings.set_string("extension-position", positions[widget.get_active()]);
  },

  on_clear_cache_clicked: () => {
    let dir = GLib.get_user_config_dir() + "/media-controls";
    try {
      (async () => {
        builder.get_object("clear-cache-spinner").start();
        await execCommunicate(["rm", "-r", dir]);
        widgetCacheSize.set_text(await getCacheSize());
        builder.get_object("clear-cache-spinner").stop();
      })();
    } catch (error) {
      widgetCacheSize.set_text("Failed to clear cache");
    }
  },
  on_track_label_changed: () => {
    let currentTrackLabel = settings.get_strv("track-label");

    let trackLabelSepText = trackLabelSep.get_text();

    let trackLabelArray = [
      trackLabelOptKeys[trackLabelStart.get_active()] || currentTrackLabel[0],
      trackLabelSepText !== null || trackLabelSepText !== undefined
        ? trackLabelSepText
        : currentTrackLabel[1],
      trackLabelOptKeys[trackLabelEnd.get_active()] || currentTrackLabel[2],
    ];

    settings.set_strv("track-label", trackLabelArray);
  },

  on_backlist_entry_changed: (entry) => {
    let currentBacklistApps = settings.get_strv("backlist-apps");
    currentBacklistApps.push(entry.get_text());
    addToBacklistListBox(entry.get_text());
    settings.set_strv("backlist-apps", currentBacklistApps);
    entry.set_text("");
  },
};

const getCacheSize = async () => {
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
};

const addToBacklistListBox = (app, widgetBacklistBox) => {
  let box = new Gtk.Box({
    visible: true,
  });

  let label = new Gtk.Label({
    visible: true,
    label: app,
    hexpand: true,
    halign: Gtk.Align.START,
  });

  let deleteButton = Gtk.Button.new_from_icon_name(
    "edit-delete-symbolic",
    Gtk.IconSize.BUTTON || Gtk.IconSize.NORMAL
  );

  deleteButton.visible = true;
  deleteButton.app = app;

  deleteButton.connect("clicked", (widget) => {
    let currentBacklistApps = settings.get_strv("backlist-apps");
    currentBacklistApps.splice(currentBacklistApps.indexOf(widget.app), 1);
    settings.set_strv("backlist-apps", currentBacklistApps);
    widgetBacklistBox.remove(widget.get_parent().get_parent());
  });

  box.append(label);
  box.append(deleteButton);
  widgetBacklistBox.append(box);
};
