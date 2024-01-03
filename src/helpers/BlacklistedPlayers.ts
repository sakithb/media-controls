import Adw from "gi://Adw?version=1";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Gtk from "gi://Gtk?version=4.0";
import AppChooser from "./AppChooser.js";

GObject.type_ensure(AppChooser.$gtype);

class BlacklistedPlayers extends Adw.PreferencesGroup {
    public players: string[];

    private appChooser: InstanceType<typeof AppChooser>;
    private listBox: Gtk.ListBox;
    private addBtn: Gtk.Button;

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
            const appId = await this.appChooser.showChooser();
            this.players.unshift(appId);
            this.notify("players");
            this.addElements();
        });
    }

    public initPlayers(players: string[]) {
        this.players = players;
        this.addElements();
    }

    private addElements() {
        this.listBox.remove_all();

        if (this.players.length === 0) {
            const row = new Adw.ActionRow();

            const label = new Gtk.Label();
            label.label = "<span size='x-large' weight='bold' color='#ccc'>No players are blacklisted</span>";
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

const GBlacklistedPlayers = GObject.registerClass(
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
    BlacklistedPlayers,
);

export default GBlacklistedPlayers;
