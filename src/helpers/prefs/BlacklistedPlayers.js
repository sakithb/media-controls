import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { errorLog } from "../../utils/common.js";

export default class BlacklistedPlayers extends Adw.PreferencesGroup {
    constructor(params = {}) {
        super(params);
        this.listBox = this._list_box;
        this.addBtn = this._add_btn;
        this._blacklist = [];
        this._AppChooserClass = null;
        
        this.listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.addBtn.connect("clicked", () => this._openAppChooser());
    }

    /**
     * Initialize with data and dependency
     * @param {string[]} players 
     * @param {typeof Adw.Window} AppChooserClass 
     */
    initPlayers(players, AppChooserClass) {
        this._blacklist = Array.isArray(players) ? [...players] : [];
        this._AppChooserClass = AppChooserClass;
        this._rebuild();
    }

    get players() {
        return [...this._blacklist];
    }

    _rebuild() {
        this.listBox.remove_all();

        if (this._blacklist.length === 0) {
            const row = new Adw.ActionRow();
            const label = new Gtk.Label({
                label: _("<span size='x-large' weight='bold' color='#ccc'>No players blacklisted</span>"),
                useMarkup: true,
                halign: Gtk.Align.CENTER,
                marginTop: 20,
                marginBottom: 20
            });
            row.set_child(label);
            this.listBox.append(row);
            return;
        }

        const apps = Gio.AppInfo.get_all();
        this._blacklist.forEach(player => {
            this.listBox.append(this._createRow(player, apps));
        });
    }

    _createRow(playerIdentity, apps) {
        const app = apps.find(a => a.get_id() === playerIdentity);
        
        const row = new Adw.ActionRow({
            title: app ? app.get_display_name() : playerIdentity,
            subtitle: app ? null : _("Application not found")
        });

        if (app) {
            row.add_prefix(new Gtk.Image({ gicon: app.get_icon(), iconSize: Gtk.IconSize.LARGE }));
        }

        const delBtn = new Gtk.Button({
            icon_name: "user-trash-symbolic",
            css_classes: ["flat", "circular"],
            marginTop: 10,
            marginBottom: 10,
            valign: Gtk.Align.CENTER
        });

        delBtn.connect("clicked", () => {
            const idx = this._blacklist.indexOf(playerIdentity);
            if (idx > -1) {
                this._blacklist.splice(idx, 1);
                this._rebuild();
                this.notify("players");
            }
        });

        row.add_suffix(delBtn);
        return row;
    }

    async _openAppChooser() {
        if (!this._AppChooserClass) return;

        const dialog = new this._AppChooserClass();
        const root = this.get_root();
        if (root) dialog.set_transient_for(root);

        const selectedId = await dialog.showChooser().catch(errorLog);
        
        if (selectedId && !this._blacklist.includes(selectedId)) {
            this._blacklist.unshift(selectedId);
            this._rebuild();
            this.notify("players");
        }
    }
}