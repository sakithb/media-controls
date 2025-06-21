import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

class AppChooser extends Adw.Window {
    /**
     * @private
     * @type {Gtk.ListBox}
     */
    listBox;
    /**
     * @private
     * @type {Gtk.Button}
     */
    selectBtn;
    /**
     * @private
     * @type {Gtk.Button}
     */
    cancelBtn;

    /**
     * @param {{}} [params={}]
     */
    constructor(params = {}) {
        super(params);
        // @ts-expect-error Typescript doesn't know about the internal children
        this.listBox = this._list_box;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.selectBtn = this._select_btn;
        // @ts-expect-error Typescript doesn't know about the internal children
        this.cancelBtn = this._cancel_btn;
        const apps = Gio.AppInfo.get_all()
            .filter((app) => app.should_show())
            .sort((a, b) => {
                const nameA = a.get_display_name().toLowerCase();
                const nameB = b.get_display_name().toLowerCase();
                return nameA.localeCompare(nameB);
            });
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

    /**
     * @public
     * @returns {Promise<string>}
     */
    showChooser() {
        return new Promise((resolve) => {
            const signalId = this.selectBtn.connect("clicked", () => {
                this.close();
                this.selectBtn.disconnect(signalId);
                const row = /** @type {Adw.ActionRow} */ (this.listBox.get_selected_row());
                resolve(row.subtitle);
            });
            this.present();
        });
    }
}
export default AppChooser;
