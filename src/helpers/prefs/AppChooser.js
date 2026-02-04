import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

export default class AppChooser extends Adw.Window {
    constructor(params = {}) {
        super(params);
        // Map children from template
        this.listBox = this._list_box;
        this.selectBtn = this._select_btn;
        this.cancelBtn = this._cancel_btn;

        this._populateApps();
        
        this.cancelBtn.connect("clicked", () => this.close());
    }

    _populateApps() {
        const appSystem = Gio.AppInfo.get_all();
        const apps = appSystem
            .filter(app => app.should_show())
            .sort((a, b) => a.get_display_name().toLowerCase().localeCompare(b.get_display_name().toLowerCase()));

        for (const app of apps) {
            this.listBox.append(this._createAppRow(app));
        }
    }

    _createAppRow(app) {
        const row = new Adw.ActionRow({
            title: app.get_display_name(),
            subtitle: app.get_id(),
            subtitleLines: 1,
            activatable: true
        });

        const icon = new Gtk.Image({
            gicon: app.get_icon(),
            pixel_size: 32
        });
        row.add_prefix(icon);

        // Store ID
        // @ts-expect-error
        row._appId = app.get_id();

        return row;
    }

    showChooser() {
        return new Promise((resolve) => {
            const signalId = this.selectBtn.connect("clicked", () => {
                this.selectBtn.disconnect(signalId);
                // @ts-expect-error
                const row = this.listBox.get_selected_row();
                this.close();
                resolve(row ? row._appId : null);
            });

            const closeId = this.connect("close-request", () => {
                this.disconnect(closeId);
                if (this.selectBtn.signal_handler_is_connected(signalId)) {
                    this.selectBtn.disconnect(signalId);
                }
                resolve(null);
                return false;
            });

            this.present();
        });
    }
}