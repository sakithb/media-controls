import Adw from "gi://Adw?version=1";
import GObject from "gi://GObject?version=2.0";
import Gio from "gi://Gio?version=2.0";
import Gtk from "gi://Gtk?version=4.0";

class AppChooser extends Adw.Window {
    private listBox: Gtk.ListBox;
    private selectBtn: Gtk.Button;
    private cancelBtn: Gtk.Button;

    constructor(params = {}) {
        super(params);

        // @ts-expect-error Typescript doesn't know about the internal children
        this.listBox = this._list_box;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.selectBtn = this._select_btn;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.cancelBtn = this._cancel_btn;

        const apps = Gio.AppInfo.get_all();

        for (const app of apps) {
            if (app.should_show() === false) continue;

            const row = new Adw.ActionRow();
            row.title = app.get_display_name();
            row.subtitle = app.get_id();
            row.subtitleLines = 1;

            const icon = new Gtk.Image({ gicon: app.get_icon() });
            row.add_prefix(icon);

            this.listBox.append(row);
        }

        this.cancelBtn.connect("clicked", () => {
            this.close();
        });
    }

    public showChooser() {
        return new Promise<string>((resolve) => {
            const signalId = this.selectBtn.connect("clicked", () => {
                this.close();
                this.selectBtn.disconnect(signalId);

                const row = this.listBox.get_selected_row() as Adw.ActionRow;
                resolve(row.subtitle);
            });

            this.present();
        });
    }
}

const GAppChooser = GObject.registerClass(
    {
        GTypeName: "AppChooser",
        Template: "resource:///org/gnome/shell/extensions/mediacontrols/ui/app-chooser.ui",
        InternalChildren: ["list-box", "select-btn", "cancel-btn"],
    },
    AppChooser,
);

export default GAppChooser;
