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
import AppChooserOrig from "./helpers/prefs/AppChooser.js";
import { isValidBinding, isValidAccelerator } from "./utils/prefs_only.js";
import { errorLog } from "./utils/common.js";

// Global variables to prevent "Type already registered"
let AppChooser;
let BlacklistedPlayers;
let LabelList;
let ElementList;

Gio._promisify(Gio.File.prototype, "delete_async", "delete_finish");
Gio._promisify(Gio.File.prototype, "trash_async", "trash_finish");
Gio._promisify(Gio.File.prototype, "query_info_async", "query_info_finish");
Gio._promisify(Gio.File.prototype, "enumerate_children_async", "enumerate_children_finish");
Gio._promisify(Gio.FileEnumerator.prototype, "next_files_async", "next_files_finish");

export default class MediaControlsPreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        const resourcePath = GLib.build_filenamev([this.path, "org.gnome.shell.extensions.mediacontrols.gresource"]);
        Gio.resources_register(Gio.resource_load(resourcePath));

        // Register Classes if not exists
        // Note: We use the exact GTypeNames from your original working code to match the UI templates
        if (!AppChooser) {
            AppChooser = GObject.registerClass({
                GTypeName: "AppChooser", 
                Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/app-chooser.ui",
                InternalChildren: ["list-box", "select-btn", "cancel-btn"],
            }, AppChooserOrig);
        }

        if (!BlacklistedPlayers) {
            BlacklistedPlayers = GObject.registerClass({
                GTypeName: "BlacklistedPlayers",
                Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/blacklisted-players.ui",
                InternalChildren: ["list-box", "add-btn"],
                Properties: {
                    players: GObject.ParamSpec.jsobject("players", "Blacklisted players", "List", GObject.ParamFlags.READABLE),
                },
            }, BlacklistedPlayersOrig);
        }

        if (!LabelList) {
            LabelList = GObject.registerClass({
                GTypeName: "LabelList",
                Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/label-list.ui",
                InternalChildren: ["list-box", "add-item-btn", "add-text-btn"],
                Properties: {
                    labels: GObject.ParamSpec.jsobject("labels", "Labels", "Config", GObject.ParamFlags.READABLE),
                },
            }, LabelListOrig);
        }

        if (!ElementList) {
            ElementList = GObject.registerClass({
                GTypeName: "ElementList",
                Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/element-list.ui",
                InternalChildren: ["list-box", "icon-row", "label-row", "controls-row"],
                Properties: {
                    elements: GObject.ParamSpec.jsobject("elements", "Elements", "Order", GObject.ParamFlags.READABLE),
                },
            }, ElementListOrig);
        }

        GObject.type_ensure(AppChooser.$gtype);
        GObject.type_ensure(BlacklistedPlayers.$gtype);
        GObject.type_ensure(LabelList.$gtype);
        GObject.type_ensure(ElementList.$gtype);

        this.window = window;
        this.settings = this.getSettings();
        this.builder = Gtk.Builder.new_from_resource("/org/gnome/shell/extensions/mediacontrols/ui/prefs.ui");

        ["page-general", "page-panel", "page-positions", "page-shortcuts", "page-other"].forEach(id => {
            const page = this.builder.get_object(id);
            if(page) window.add(page);
        });

        this.initWidgets();
        this.bindSettings();
    }

    initWidgets() {
        // Elements
        const elementsGroup = this.builder.get_object("gp-positions-elements");
        if (elementsGroup) {
            elementsGroup.initElements(this.settings.get_strv("elements-order"));
            elementsGroup.connect("notify::elements", () => {
                this.settings.set_strv("elements-order", elementsGroup.elements);
            });
        }

        // Labels
        const labelsGroup = this.builder.get_object("gp-positions-labels");
        if (labelsGroup) {
            labelsGroup.initLabels(this.settings.get_strv("labels-order"));
            labelsGroup.connect("notify::labels", () => {
                this.settings.set_strv("labels-order", labelsGroup.labels);
            });
        }

        // Blacklist
        const blacklistGroup = this.builder.get_object("gp-other-blacklist");
        if (blacklistGroup) {
            blacklistGroup.initPlayers(this.settings.get_strv("blacklisted-players"), AppChooser);
            blacklistGroup.connect("notify::players", () => {
                this.settings.set_strv("blacklisted-players", blacklistGroup.players);
            });
        }

        // --- FIX: Width Increment ---
        const widthRow = this.builder.get_object("sr-general-label-width");
        if (widthRow && widthRow.get_adjustment) {
            const adj = widthRow.get_adjustment();
            if(adj) {
                adj.set_step_increment(1);
                adj.set_page_increment(10);
            }
        }

        this._initShortcutEditor();
        this._initCacheLogic();
    }

    _initShortcutEditor() {
        const row = this.builder.get_object("row-shortcuts-popup");
        const lbl = this.builder.get_object("sl-shortcuts-popup");
        const win = this.builder.get_object("win-shortcut-editor");
        const elbl = this.builder.get_object("sl-shortcut-editor");
        
        if(!row) return;

        row.connect("activated", () => {
            const ctrl = new Gtk.EventControllerKey();
            win.add_controller(ctrl);
            elbl.accelerator = this.settings.get_strv("mediacontrols-show-popup-menu")[0] || "";
            
            ctrl.connect("key-pressed", (_, k, c, s) => {
                let m = s & Gtk.accelerator_get_default_mod_mask();
                m &= ~Gdk.ModifierType.LOCK_MASK;
                if(!m && k === Gdk.KEY_Escape) { win.close(); return Gdk.EVENT_STOP; }
                if(!m && k === Gdk.KEY_BackSpace) { elbl.accelerator = ""; return Gdk.EVENT_STOP; }
                if(!m && k === Gdk.KEY_Return) {
                    lbl.accelerator = elbl.accelerator;
                    this.settings.set_strv("mediacontrols-show-popup-menu", [elbl.accelerator]);
                    win.close();
                    return Gdk.EVENT_STOP;
                }
                if (isValidBinding(m, c, k) && isValidAccelerator(m, k)) {
                    elbl.accelerator = Gtk.accelerator_name_with_keycode(null, k, c, m);
                }
                return Gdk.EVENT_STOP;
            });
            win.present();
        });
    }

    _initCacheLogic() {
        const row = this.builder.get_object("row-other-cache-clear");
        const btn = this.builder.get_object("btn-other-cache-clear");
        
        if (!row || !btn) return;

        this.getCacheSize().then(s => {
            row.subtitle = _("Cache size: %s").format(GLib.format_size(s));
        });

        btn.connect("clicked", () => {
            const d = new Adw.MessageDialog({ transient_for: this.window, heading: _("Clear Cache?"), body: _("Are you sure?") });
            d.add_response("cancel", _("Cancel")); d.add_response("clear", _("Clear")); d.set_response_appearance("clear", 1);
            d.connect("response", (_, r) => { 
                if(r === "clear") this.clearCache().then(() => row.subtitle = _("Cache size: %s").format(GLib.format_size(0))); 
            });
            d.present();
        });
    }

    bindSettings() {
        const s = this.settings;
        const b = (k, i, p) => { const w = this.builder.get_object(i); if(w) s.bind(k, w, p, Gio.SettingsBindFlags.DEFAULT); };
        
        b("label-width", "sr-general-label-width", "value");
        b("fixed-label-width", "sr-general-label-fixed", "active");
        b("scroll-labels", "sr-general-scroll-labels", "active");
        b("scroll-speed", "sr-general-scroll-speed", "value");
        b("hide-media-notification", "sr-general-hide-media-notification", "active");
        b("show-track-slider", "sr-general-show-track-slider", "active");
        b("show-label", "sr-panel-show-label", "active");
        b("show-control-icons", "sr-panel-show-controls", "active");
        b("show-control-icons-play", "sr-panel-show-play", "active");
        b("show-control-icons-next", "sr-panel-show-next", "active");
        b("show-control-icons-previous", "sr-panel-show-prev", "active");
        b("show-control-icons-seek-forward", "sr-panel-show-seek-forward", "active");
        b("show-control-icons-seek-backward", "sr-panel-show-seek-backward", "active");
        b("show-player-icon", "sr-panel-show-player", "active");
        b("colored-player-icon", "sr-panel-colored-player", "active");
        b("extension-index", "sr-positions-extension-index", "value");
        b("cache-art", "sr-other-cache", "active");

        const be = (k, i) => { const w = this.builder.get_object(i); if(w) { w.selected = s.get_enum(k); w.connect("notify::selected", ()=>s.set_enum(k, w.selected)); s.connect(`changed::${k}`, ()=>w.selected=s.get_enum(k)); } };
        be("extension-position", "cr-positions-extension-position");
        be("mouse-action-left", "cr-shortcuts-mouse-left");
        be("mouse-action-middle", "cr-shortcuts-mouse-middle");
        be("mouse-action-right", "cr-shortcuts-mouse-right");
        be("mouse-action-double", "cr-shortcuts-mouse-double");
        be("mouse-action-scroll-up", "cr-shortcuts-mouse-scroll-up");
        be("mouse-action-scroll-down", "cr-shortcuts-mouse-scroll-down");

        const sl = this.builder.get_object("sl-shortcuts-popup");
        if(sl) sl.accelerator = s.get_strv("mediacontrols-show-popup-menu")[0] || "";
    }

    async clearCache() {
        const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);
        const dir = Gio.File.new_for_path(cacheDir);
        if (!dir.query_exists(null)) return;

        try {
            const enumerator = await dir.enumerate_children_async("standard::*", Gio.FileQueryInfoFlags.NONE, 0, null);
            while(true) {
                const files = await enumerator.next_files_async(10, 0, null);
                if(!files || files.length === 0) break;
                for(const info of files) {
                    await enumerator.get_child(info).delete_async(0, null).catch(()=>{});
                }
            }
        } catch(e) { console.error(e); }
    }

    async getCacheSize() {
        try {
            const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), "mediacontrols@cliffniff.github.com"]);
            const dir = Gio.File.new_for_path(cacheDir);
            if(!dir.query_exists(null)) return 0;
            let total = 0;
            const enumerator = await dir.enumerate_children_async("standard::size", 0, 0, null);
            while(true) {
                const files = await enumerator.next_files_async(10, 0, null);
                if(!files || files.length === 0) break;
                for(const info of files) total += info.get_size();
            }
            return total;
        } catch { return 0; }
    }
}