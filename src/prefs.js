import Adw from "gi://Adw";
import GLib from "gi://GLib";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import { ExtensionPreferences, gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import BlacklistedPlayersOrig from "./helpers/prefs/BlacklistedPlayers.js";
import ElementListOrig from "./helpers/prefs/ElementList.js";
import LabelListOrig from "./helpers/prefs/LabelList.js";
import AppChooserorig from "./helpers/prefs/AppChooser.js";
import { isValidBinding, isValidAccelerator } from "./utils/prefs_only.js";
import { handleError } from "./utils/common.js";

/** @type {typeof BlacklistedPlayersOrig} */
export let BlacklistedPlayers;
/** @type {typeof ElementListOrig} */
export let ElementList;
/** @type {typeof LabelListOrig} */
export let LabelList;
/** @type {typeof AppChooserorig} */
export let AppChooser;

Gio._promisify(Gio.File.prototype, "trash_async", "trash_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");
Gio._promisify(Gio.File.prototype, "enumerate_children_async", "enumerate_children_finish");
Gio._promisify(Gio.FileEnumerator.prototype, "next_files_async", "next_files_finish");

export default class MediaControlsPreferences extends ExtensionPreferences {
    /**
     * @private
     * @type {Adw.PreferencesWindow}
     */
    window;
    /**
     * @private
     * @type {Gio.Settings}
     */
    settings;
    /**
     * @private
     * @type {Gtk.Builder}
     */
    builder;

    /**
     * @private
     * @type {Adw.PreferencesPage}
     */
    generalPage;
    /**
     * @private
     * @type {Adw.PreferencesPage}
     */
    panelPage;
    /**
     * @private
     * @type {Adw.PreferencesPage}
     */
    positionsPage;
    /**
     * @private
     * @type {Adw.PreferencesPage}
     */
    shortcutsPage;
    /**
     * @private
     * @type {Adw.PreferencesPage}
     */
    otherPage;

    /**
     * @public
     * @param {Adw.PreferencesWindow} window
     * @returns {Promise<void>}
     */
    async fillPreferencesWindow(window) {
        const resourcePath = GLib.build_filenamev([this.path, "org.gnome.shell.extensions.mediacontrols.gresource"]);
        Gio.resources_register(Gio.resource_load(resourcePath));
        if (AppChooser == null) {
            AppChooser = GObject.registerClass(
                {
                    GTypeName: "AppChooser",
                    Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/app-chooser.ui",
                    InternalChildren: ["list-box", "select-btn", "cancel-btn"],
                },
                AppChooserorig,
            );
        }
        if (BlacklistedPlayers == null) {
            BlacklistedPlayers = GObject.registerClass(
                {
                    GTypeName: "BlacklistedPlayers",
                    Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/blacklisted-players.ui",
                    Properties: {
                        players: GObject.ParamSpec.jsobject(
                            "players",
                            "Blacklisted players",
                            "Blacklisted players",
                            GObject.ParamFlags.READABLE,
                        ),
                    },
                    InternalChildren: ["list-box", "add-btn"],
                },
                BlacklistedPlayersOrig,
            );
        }
        if (LabelList == null) {
            LabelList = GObject.registerClass(
                {
                    GTypeName: "LabelList",
                    Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/label-list.ui",
                    InternalChildren: ["list-box", "add-item-btn", "add-text-btn"],
                    Properties: {
                        labels: GObject.ParamSpec.jsobject("labels", "Labels", "Labels", GObject.ParamFlags.READABLE),
                    },
                },
                LabelListOrig,
            );
        }
        if (ElementList == null) {
            ElementList = GObject.registerClass(
                {
                    GTypeName: "ElementList",
                    Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/element-list.ui",
                    InternalChildren: ["list-box", "icon-row", "label-row", "controls-row"],
                    Properties: {
                        elements: GObject.ParamSpec.jsobject(
                            "elements",
                            "Elements",
                            "Elements",
                            GObject.ParamFlags.READABLE,
                        ),
                    },
                },
                ElementListOrig,
            );
        }
        GObject.type_ensure(AppChooser.$gtype);
        GObject.type_ensure(BlacklistedPlayers.$gtype);
        GObject.type_ensure(LabelList.$gtype);
        GObject.type_ensure(ElementList.$gtype);
        this.window = window;
        this.settings = this.getSettings();
        this.builder = Gtk.Builder.new_from_resource("/org/gnome/shell/extensions/mediacontrols/ui/prefs.ui");
        this.generalPage = this.builder.get_object("page-general");
        this.panelPage = this.builder.get_object("page-panel");
        this.positionsPage = this.builder.get_object("page-positions");
        this.shortcutsPage = this.builder.get_object("page-shortcuts");
        this.otherPage = this.builder.get_object("page-other");
        this.window.add(this.generalPage);
        this.window.add(this.panelPage);
        this.window.add(this.positionsPage);
        this.window.add(this.shortcutsPage);
        this.window.add(this.otherPage);
        this.initWidgets();
        this.bindSettings();
        this.window.connect("close-request", () => {
            this.window = null;
            this.settings = null;
            this.builder = null;
            this.generalPage = null;
            this.panelPage = null;
            this.positionsPage = null;
            this.shortcutsPage = null;
            this.otherPage = null;
        });
    }

    /**
     * @private
     * @returns {void}
     */
    initWidgets() {
        const elementsOrder = this.settings.get_strv("elements-order");
        const elementsGroup = /** @type {InstanceType<typeof ElementList>} */ (
            this.builder.get_object("gp-positions-elements")
        );
        elementsGroup.initElements(elementsOrder);
        elementsGroup.connect("notify::elements", () => {
            this.settings.set_strv("elements-order", elementsGroup.elements);
        });
        const labelsGroup = /** @type {InstanceType<typeof LabelList>} */ (
            this.builder.get_object("gp-positions-labels")
        );
        const labelsOrder = this.settings.get_strv("labels-order");
        labelsGroup.initLabels(labelsOrder);
        labelsGroup.connect("notify::labels", () => {
            this.settings.set_strv("labels-order", labelsGroup.labels);
        });
        const shortcutRow = /** @type {Adw.ActionRow} */ (this.builder.get_object("row-shortcuts-popup"));
        const shortcutLabel = /** @type {Gtk.ShortcutLabel} */ (this.builder.get_object("sl-shortcuts-popup"));

        const shortcutEditorWindow = /** @type {Adw.Window} */ (this.builder.get_object("win-shortcut-editor"));
        const shortcutEditorLabel = /** @type {Gtk.ShortcutLabel} */ (this.builder.get_object("sl-shortcut-editor"));

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
        const cacheClearRow = /** @type {Adw.ActionRow} */ (this.builder.get_object("row-other-cache-clear"));
        const cacheClearBtn = /** @type {Gtk.Button} */ (this.builder.get_object("btn-other-cache-clear"));
        cacheClearBtn.connect("clicked", () => {
            const dialog = Adw.MessageDialog.new(this.window, "", _("Are you sure you want to clear the cache?"));
            dialog.add_response("cancel", _("Cancel"));
            dialog.add_response("clear", _("Clear cache"));
            dialog.set_response_appearance("clear", Adw.ResponseAppearance.DESTRUCTIVE);
            dialog.connect("response", (self, response) => {
                if (response === "cancel") return;
                this.clearCache().then(() => {
                    cacheClearRow.subtitle = _("Cache size: %s").format(GLib.format_size(0));
                });
            });
            dialog.present();
        });
        this.getCacheSize().then((size) => {
            const sizeReadable = GLib.format_size(size);
            cacheClearRow.subtitle = _("Cache size: %s").format(sizeReadable);
        });
        const blacklistedGrp = /** @type {InstanceType<typeof BlacklistedPlayers>} */ (
            this.builder.get_object("gp-other-blacklist")
        );
        const blacklistedPlayers = this.settings.get_strv("blacklisted-players");
        blacklistedGrp.initPlayers(blacklistedPlayers);
        blacklistedGrp.connect("notify::players", () => {
            this.settings.set_strv("blacklisted-players", blacklistedGrp.players);
        });
    }

    /**
     * @private
     * @returns {void}
     */
    bindSettings() {
        this.bindSetting("label-width", "sr-general-label-width", "value");
        this.bindSetting("fixed-label-width", "sr-general-label-fixed", "active");
        this.bindSetting("scroll-labels", "sr-general-scroll-labels", "active");
        this.bindSetting("hide-media-notification", "sr-general-hide-media-notification", "active");
        this.bindSetting("show-track-slider", "sr-general-show-track-slider", "active");
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

    /**
     * @private
     * @param {string} key
     * @param {string} widgetName
     * @param {string} property
     * @returns {void}
     */
    bindSetting(key, widgetName, property) {
        if (property === "selected") {
            const widget = this.builder.get_object(widgetName);
            widget[property] = this.settings.get_enum(key);
            widget.connect(`notify::${property}`, () => {
                this.settings.set_enum(key, widget[property]);
            });
            this.settings.connect(`changed::${key}`, () => {
                widget[property] = this.settings.get_enum(key);
            });
        } else if (property === "accelerator") {
            const widget = this.builder.get_object(widgetName);
            widget[property] = this.settings.get_strv(key)[0];
            widget.connect(`notify::${property}`, () => {
                this.settings.set_strv(key, [widget[property]]);
            });
            this.settings.connect(`changed::${key}`, () => {
                widget[property] = this.settings.get_strv(key)[0];
            });
        } else {
            const widget = this.builder.get_object(widgetName);
            widget[property] = this.settings.get_value(key).recursiveUnpack();
            const bindingFlags = Gio.SettingsBindFlags.DEFAULT | Gio.SettingsBindFlags.NO_SENSITIVITY;
            this.settings.bind(key, widget, property, bindingFlags);
        }
    }

    /**
     * @private
     * @param {string} title
     * @returns {void}
     */
    sendToast(title) {
        const toast = new Adw.Toast({ title, timeout: 3 });
        this.window.add_toast(toast);
    }

    /**
     * @private
     * @returns {Promise<void>}
     */
    async clearCache() {
        const cacheDir = GLib.build_pathv("/", [GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);
        if (GLib.file_test(cacheDir, GLib.FileTest.EXISTS)) {
            const folder = Gio.File.new_for_path(cacheDir);
            const success = await folder.trash_async(null, null).catch(handleError);
            if (success) {
                this.sendToast(_("Cache cleared successfully!"));
            } else {
                this.sendToast(_("Failed to clear cache!"));
            }
        }
    }

    /**
     * @private
     * @returns {Promise<number>}
     */
    async getCacheSize() {
        const cacheDir = GLib.build_pathv("/", [GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);
        if (GLib.file_test(cacheDir, GLib.FileTest.EXISTS)) {
            const folder = Gio.File.new_for_path(cacheDir);
            const enumerator = await folder
                .enumerate_children_async("standard::*", Gio.FileQueryInfoFlags.NONE, 0, null)
                .catch(handleError);
            if (enumerator == null) {
                return 0;
            }
            let size = 0;
            let retries = 0;
            while (true) {
                const fileInfos = await enumerator.next_files_async(10, null, null).catch(handleError);
                if (fileInfos == null) {
                    if (retries < 3) {
                        retries++;
                        continue;
                    } else {
                        break;
                    }
                }
                if (fileInfos.length === 0) {
                    break;
                }
                for (const fileInfo of fileInfos) {
                    const file = enumerator.get_child(fileInfo);
                    const info = await file
                        .query_info_async("standard::size", Gio.FileQueryInfoFlags.NONE, 0, null)
                        .catch(handleError);
                    const fileSize = info?.get_size() ?? 0;
                    size += fileSize;
                }
            }
            return size;
        }
        return 0;
    }
}
