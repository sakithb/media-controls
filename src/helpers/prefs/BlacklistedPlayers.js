import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import { AppChooser } from "../../prefs.js";
import { handleError } from "../../utils/common.js";

class BlacklistedPlayers extends Adw.PreferencesGroup {
    /**
     * @public
     * @type {string[]}
     */
    players;

    /**
     * @private
     * @type {InstanceType<typeof AppChooser>}
     */
    appChooser;
    /**
     * @private
     * @type {Gtk.ListBox}
     */
    listBox;
    /**
     * @private
     * @type {Gtk.ListBox}
     */
    addBtn;

    /**
     * @param {{}} [params={}]
     */
    constructor(params = {}) {
        super(params);
        // @ts-expect-error Typescript doesn't know about the internal children
        this.listBox = this._list_box;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.addBtn = this._add_btn;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.appChooser = this._app_chooser;
        this.appChooser = new AppChooser();
        this.addBtn.connect("clicked", async () => {
            const appId = await this.appChooser.showChooser().catch(handleError);
            if (appId == null) return;
            this.players.unshift(appId);
            this.notify("players");
            this.addElements();
        });
    }

    /**
     * @public
     * @param {string[]} players
     * @returns {void}
     */
    initPlayers(players) {
        this.players = players;
        this.addElements();
    }

    /**
     * @private
     * @returns {void}
     */
    addElements() {
        this.listBox.remove_all();
        if (this.players.length === 0) {
            const row = new Adw.ActionRow();
            const label = new Gtk.Label();
            label.label = _("<span size='x-large' weight='bold' color='#ccc'>No players are blacklisted</span>");
            label.useMarkup = true;
            label.halign = Gtk.Align.CENTER;
            label.marginTop = 20;
            label.marginBottom = 20;
            row.set_child(label);
            this.listBox.append(row);
            return;
        }
        const apps = Gio.AppInfo.get_all();
        for (const player of this.players) {
            const row = new Adw.ActionRow();
            const app = apps.find((app) => app.get_id() === player);
            if (!app) {
                continue;
            }
            row.title = app.get_display_name();
            const icon = new Gtk.Image({ gicon: app.get_icon(), iconSize: Gtk.IconSize.LARGE });
            row.add_prefix(icon);
            const deleteBtn = new Gtk.Button({ icon_name: "user-trash-symbolic" });
            deleteBtn.marginTop = 10;
            deleteBtn.marginBottom = 10;
            deleteBtn.add_css_class("flat");
            deleteBtn.add_css_class("circular");
            row.add_suffix(deleteBtn);
            deleteBtn.connect("clicked", () => {
                const index = this.players.indexOf(player);
                this.players.splice(index, 1);
                this.notify("players");
                this.addElements();
            });
            this.listBox.append(row);
        }
    }
}

export default BlacklistedPlayers;
