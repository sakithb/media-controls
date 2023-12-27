import Adw from "gi://Adw?version=1";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Gtk from "gi://Gtk?version=4.0";

class BlacklistedPlayers extends Gtk.ListBox {
    public readonly players: string[];
    private appChooserDialog: Adw.Window;
    private appChooserList: Gtk.ListBox;
    private appChooserSelectBtn: Gtk.Button;
    private appChooserCancelBtn: Gtk.Button;

    constructor(initPlayers: string[], builder: Gtk.Builder) {
        super();

        this.players = initPlayers;
        this.appChooserDialog = builder.get_object("win-app-chooser") as Adw.Window;
        this.appChooserList = builder.get_object("lb-app-chooser") as Gtk.ListBox;
        this.appChooserSelectBtn = builder.get_object("btn-app-chooser-select") as Gtk.Button;
        this.appChooserCancelBtn = builder.get_object("btn-app-chooser-cancel") as Gtk.Button;

        this.add_css_class("boxed-list");
        this.set_selection_mode(Gtk.SelectionMode.NONE);
        this.initAppChooserDialog();
        this.addElements();
    }

    public async newPlayer() {
        const appId = await this.showAppChooserDialog();
        this.players.unshift(appId);
        this.notify("players");
        this.addElements();
    }

    private initAppChooserDialog() {
        const apps = Gio.AppInfo.get_all();

        for (const app of apps) {
            if (app.should_show() === false) continue;

            const row = new Adw.ActionRow();
            row.title = app.get_display_name();
            row.subtitle = app.get_id();
            row.subtitleLines = 1;

            const icon = new Gtk.Image({ gicon: app.get_icon() });
            row.add_prefix(icon);

            this.appChooserList.append(row);
        }

        this.appChooserCancelBtn.connect("clicked", () => {
            this.appChooserDialog.close();
        });
    }

    private showAppChooserDialog(): Promise<string> {
        return new Promise((resolve) => {
            this.appChooserSelectBtn.connect("clicked", () => {
                this.appChooserDialog.close();

                const row = this.appChooserList.get_selected_row() as Adw.ActionRow;
                resolve(row.subtitle);
            });

            this.appChooserDialog.present();
        });
    }

    private addElements() {
        this.remove_all();

        if (this.players.length === 0) {
            const row = new Adw.ActionRow();

            const label = new Gtk.Label();
            label.label = "<span size='x-large' weight='bold' color='#ccc'>No players are blacklisted</span>";
            label.useMarkup = true;
            label.halign = Gtk.Align.CENTER;
            label.marginTop = 20;
            label.marginBottom = 20;

            row.set_child(label);
            this.append(row);
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
            deleteBtn.set_data("appId", player);
            row.add_suffix(deleteBtn);

            deleteBtn.connect("clicked", (deleteBtn) => {
                this.players.splice(this.players.indexOf(deleteBtn.get_data("appId")), 1);
                this.notify("players");
                this.addElements();
            });

            this.append(row);
        }
    }
}

const classPropertiers = {
    GTypeName: "McBlacklistedPlayers",
    Properties: {
        players: GObject.ParamSpec.jsobject(
            "players",
            "Blacklisted players",
            "Blacklisted players",
            GObject.ParamFlags.READABLE,
        ),
    },
};

export default GObject.registerClass(classPropertiers, BlacklistedPlayers);
