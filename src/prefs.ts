import Adw from "gi://Adw?version=1";
import GLib from "gi://GLib?version=2.0";
import Gdk from "gi://Gdk?version=4.0";
import Gio from "gi://Gio?version=2.0";
import Gtk from "gi://Gtk?version=4.0";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import { isValidAccelerator, isValidBinding } from "./utils/common.js";
import BlacklistedPlayers from "./helpers/BlacklistedPlayers.js";
import ElementList from "./helpers/ElementList.js";
import LabelList from "./helpers/LabelList.js";

Gio._promisify(Gio.File.prototype, "trash_async", "trash_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");
Gio._promisify(Gio.File.prototype, "enumerate_children_async", "enumerate_children_finish");
Gio._promisify(Gio.FileEnumerator.prototype, "next_files_async", "next_files_finish");

export default class MediaControlsPreferences extends ExtensionPreferences {
    private window: Adw.PreferencesWindow;
    private settings: Gio.Settings;
    private builder: Gtk.Builder;

    private generalPage: Adw.PreferencesPage;
    private panelPage: Adw.PreferencesPage;
    private positionsPage: Adw.PreferencesPage;
    private shortcutsPage: Adw.PreferencesPage;
    private otherPage: Adw.PreferencesPage;

    public fillPreferencesWindow(window: Adw.PreferencesWindow) {
        this.window = window;
        this.settings = this.getSettings();

        this.builder = Gtk.Builder.new_from_file(`${this.path}/ui/prefs.ui`);

        this.generalPage = this.builder.get_object("page-general") as Adw.PreferencesPage;
        this.panelPage = this.builder.get_object("page-panel") as Adw.PreferencesPage;
        this.positionsPage = this.builder.get_object("page-positions") as Adw.PreferencesPage;
        this.shortcutsPage = this.builder.get_object("page-shortcuts") as Adw.PreferencesPage;
        this.otherPage = this.builder.get_object("page-other") as Adw.PreferencesPage;

        this.window.add(this.generalPage);
        this.window.add(this.panelPage);
        this.window.add(this.positionsPage);
        this.window.add(this.shortcutsPage);
        this.window.add(this.otherPage);

        this.initWidgets();
        this.bindSettings();
    }

    private initWidgets() {
        const elementsGroup = this.builder.get_object("gp-positions-elements") as Adw.PreferencesGroup;
        const elementsOrder = this.settings.get_strv("elements-order");
        const elementsList = new ElementList(elementsOrder);

        elementsList.connect("notify::elements", () => {
            this.settings.set_strv("elements-order", elementsList.elements);
        });

        elementsGroup.add(elementsList);

        const labelsGroup = this.builder.get_object("gp-positions-labels") as Adw.PreferencesGroup;
        const labelsAddItemBtn = this.builder.get_object("btn-positions-labels-add-item") as Adw.PreferencesGroup;
        const labelsAddTextBtn = this.builder.get_object("btn-positions-labels-add-text") as Adw.PreferencesGroup;
        const labelsOrder = this.settings.get_strv("labels-order");
        const labelsList = new LabelList(labelsOrder);

        labelsList.connect("notify::labels", () => {
            this.settings.set_strv("labels-order", labelsList.labels);
        });

        labelsAddTextBtn.connect("clicked", labelsList.addText.bind(labelsList));
        labelsAddItemBtn.connect("clicked", labelsList.addItem.bind(labelsList));
        labelsGroup.add(labelsList);

        const shortcutRow = this.builder.get_object("row-shortcuts-popup") as Adw.ActionRow;
        const shortcutLabel = this.builder.get_object("sl-shortcuts-popup") as Gtk.ShortcutLabel;

        const shortcutEditorWindow = this.builder.get_object("win-shortcut-editor") as Adw.Window;
        const shortcutEditorLabel = this.builder.get_object("sl-shortcut-editor") as Gtk.ShortcutLabel;

        shortcutRow.connect("activated", () => {
            const controller = new Gtk.EventControllerKey();
            shortcutEditorWindow.add_controller(controller);

            const currentShortcut = this.settings.get_strv("mediacontrols-show-popup-menu");
            shortcutEditorLabel.accelerator = currentShortcut[0];

            controller.connect("key-pressed", (_, keyval, keycode, state) => {
                let mask = state & Gtk.accelerator_get_default_mod_mask();
                mask &= ~Gdk.ModifierType.LOCK_MASK;

                if (!mask && keyval === Gdk.KEY_Escape) {
                    shortcutEditorWindow.close();
                    return Gdk.EVENT_STOP;
                }

                if (!mask && keyval === Gdk.KEY_BackSpace) {
                    shortcutEditorLabel.accelerator = "";
                    return Gdk.EVENT_STOP;
                }

                if (!mask && keyval === Gdk.KEY_Return) {
                    const shortcut = shortcutEditorLabel.accelerator;

                    shortcutLabel.accelerator = shortcut;
                    this.settings.set_strv("mediacontrols-show-popup-menu", [shortcut]);

                    shortcutEditorWindow.close();
                    return Gdk.EVENT_STOP;
                }

                if (isValidBinding(mask, keycode, keyval) && isValidAccelerator(mask, keyval)) {
                    shortcutEditorLabel.accelerator = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
                }

                return Gdk.EVENT_STOP;
            });

            shortcutEditorWindow.present();
        });

        const cacheClearRow = this.builder.get_object("row-other-cache-clear") as Adw.ActionRow;
        const cacheClearBtn = this.builder.get_object("btn-other-cache-clear") as Gtk.Button;

        cacheClearBtn.connect("clicked", () => {
            const dialog = Adw.MessageDialog.new(this.window, "", "Are you sure you want to clear the cache?");
            dialog.add_response("cancel", "Cancel");
            dialog.add_response("clear", "Clear cache");
            dialog.set_response_appearance("clear", Adw.ResponseAppearance.DESTRUCTIVE);

            dialog.connect("response", (_, response) => {
                if (response === "cancel") return;

                this.clearCache().then(() => {
                    cacheClearRow.subtitle = `Cache size: ${GLib.format_size(0)}`;
                });
            });

            dialog.present();
        });

        this.getCacheSize().then((size) => {
            const sizeReadable = GLib.format_size(size);
            cacheClearRow.subtitle = `Cache size: ${sizeReadable}`;
        });

        const blacklistGrp = this.builder.get_object("gp-other-blacklist") as Adw.PreferencesGroup;
        const blacklistAddBtn = this.builder.get_object("btn-other-blacklist-add") as Gtk.Button;
        const blacklistedPlayers = this.settings.get_strv("blacklisted-players");
        const blacklistedPlayersList = new BlacklistedPlayers(blacklistedPlayers, this.builder);

        blacklistAddBtn.connect("clicked", () => {
            blacklistedPlayersList.newPlayer();
        });

        blacklistedPlayersList.connect("notify::players", () => {
            this.settings.set_strv("blacklisted-players", blacklistedPlayersList.players);
        });

        blacklistGrp.add(blacklistedPlayersList);
    }

    private bindSettings() {
        this.bindSetting("label-width", "sr-general-label-width", "value");
        this.bindSetting("fixed-label-width", "sr-general-label-fixed", "active");
        this.bindSetting("scroll-labels", "sr-general-scroll-labels", "active");
        this.bindSetting("hide-media-notification", "sr-general-hide-media-notification", "active");
        this.bindSetting("show-label", "sr-panel-show-label", "active");
        this.bindSetting("show-control-icons", "sr-panel-show-controls", "active");
        this.bindSetting("show-control-icons-play", "sr-panel-show-play", "active");
        this.bindSetting("show-control-icons-next", "sr-panel-show-next", "active");
        this.bindSetting("show-control-icons-previous", "sr-panel-show-prev", "active");
        this.bindSetting("show-control-icons-seek-forward", "sr-panel-show-seek-forward", "active");
        this.bindSetting("show-control-icons-seek-backward", "sr-panel-show-seek-backward", "active");
        this.bindSetting("show-player-icon", "sr-panel-show-player", "active");
        this.bindSetting("colored-player-icon", "sr-panel-colored-player", "active");
        this.bindSetting("extension-position", "cr-positions-extension-position", "selected");
        this.bindSetting("extension-index", "sr-positions-extension-index", "value");
        this.bindSetting("mediacontrols-show-popup-menu", "sl-shortcuts-popup", "accelerator");
        this.bindSetting("mouse-action-left", "cr-shortcuts-mouse-left", "selected");
        this.bindSetting("mouse-action-middle", "cr-shortcuts-mouse-middle", "selected");
        this.bindSetting("mouse-action-right", "cr-shortcuts-mouse-right", "selected");
        this.bindSetting("mouse-action-double", "cr-shortcuts-mouse-double", "selected");
        this.bindSetting("mouse-action-scroll-up", "cr-shortcuts-mouse-scroll-up", "selected");
        this.bindSetting("mouse-action-scroll-down", "cr-shortcuts-mouse-scroll-down", "selected");
        this.bindSetting("cache-art", "sr-other-cache", "active");
    }

    private bindSetting(key: string, widgetName: string, property: string) {
        if (property === "selected") {
            const widget = this.builder.get_object(widgetName) as Adw.ComboRow;
            widget[property] = this.settings.get_enum(key);

            widget.connect(`notify::${property}`, () => {
                this.settings.set_enum(key, widget[property]);
            });

            this.settings.connect(`changed::${key}`, () => {
                widget[property] = this.settings.get_enum(key);
            });
        } else if (property === "accelerator") {
            const widget = this.builder.get_object(widgetName) as Gtk.ShortcutLabel;
            widget[property] = this.settings.get_strv(key)[0];

            widget.connect(`notify::${property}`, () => {
                this.settings.set_strv(key, [widget[property]]);
            });

            this.settings.connect(`changed::${key}`, () => {
                widget[property] = this.settings.get_strv(key)[0];
            });
        } else {
            const widget = this.builder.get_object(widgetName) as Gtk.Widget;
            widget[property] = this.settings.get_value(key).recursiveUnpack();

            const bindingFlags = Gio.SettingsBindFlags.DEFAULT | Gio.SettingsBindFlags.NO_SENSITIVITY;
            this.settings.bind(key, widget, property, bindingFlags);
        }
    }

    private sendToast(title: string) {
        const toast = new Adw.Toast({ title, timeout: 3 });
        this.window.add_toast(toast);
    }

    private async clearCache() {
        const cacheDir = GLib.build_pathv("/", [GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);

        if (GLib.file_test(cacheDir, GLib.FileTest.EXISTS)) {
            const folder = Gio.File.new_for_path(cacheDir);
            const success = await folder.trash_async(null, null);

            if (success) {
                this.sendToast("Cache cleared successfully!");
            } else {
                this.sendToast("Failed to clear cache!");
            }
        }
    }

    private async getCacheSize() {
        const cacheDir = GLib.build_pathv("/", [GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);

        if (GLib.file_test(cacheDir, GLib.FileTest.EXISTS)) {
            const folder = Gio.File.new_for_path(cacheDir);
            const enumerator = await folder.enumerate_children_async(
                "standard::*",
                Gio.FileQueryInfoFlags.NONE,
                0,
                null,
            );

            let size = 0;

            while (true) {
                const fileInfos = await enumerator.next_files_async(10, null, null);

                if (fileInfos.length === 0) {
                    break;
                }

                for (const fileInfo of fileInfos) {
                    const file = enumerator.get_child(fileInfo);
                    const info = await file.query_info_async("standard::size", Gio.FileQueryInfoFlags.NONE, 0, null);
                    const fileSize = info.get_size();

                    size += fileSize;
                }
            }

            return size;
        }

        return 0;
    }
}
