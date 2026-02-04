import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import Gdk from "gi://Gdk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { LabelTypes } from "../../types/enums/common.js";

export default class LabelList extends Adw.PreferencesGroup {
    constructor(params = {}) {
        super(params);
        this.listBox = this._list_box;
        this.addItemBtn = this._add_item_btn;
        this.addTextBtn = this._add_text_btn;
        this._labels = [];
        this._setupUI();
    }

    initLabels(labels) {
        this._labels = Array.isArray(labels) ? [...labels] : [];
        this._rebuild();
    }

    get labels() { return [...this._labels]; }

    _setupUI() {
        this._labelsModel = new Gtk.StringList({ strings: Object.values(LabelTypes).map(_) });

        this.addItemBtn.connect("clicked", () => {
            this._labels.push("ALBUM");
            this.notify("labels");
            this._rebuild();
        });

        this.addTextBtn.connect("clicked", () => {
            this._labels.push("");
            this.notify("labels");
            this._rebuild();
        });

        const dropTarget = Gtk.DropTarget.new(GObject.TYPE_UINT, Gdk.DragAction.MOVE);
        dropTarget.connect("drop", (_, srcIdx, x, y) => {
            const targetRow = this.listBox.get_row_at_y(y);
            if (!targetRow || srcIdx == null) return false;

            const val = this._labels[srcIdx];
            const tgtIdx = targetRow.get_index();
            
            this._labels.splice(srcIdx, 1);
            this._labels.splice(tgtIdx, 0, val);
            
            this.notify("labels");
            this._rebuild();
            return true;
        });
        this.listBox.add_controller(dropTarget);
    }

    _rebuild() {
        this.listBox.remove_all();
        
        if (this._labels.length === 0) {
            const row = new Adw.ActionRow();
            row.set_child(new Gtk.Label({ label: _("<span size='x-large' weight='bold' color='#ccc'>No labels</span>"), useMarkup: true, halign: Gtk.Align.CENTER, marginTop: 20, marginBottom: 20 }));
            this.listBox.append(row);
            return;
        }

        this._labels.forEach((el, idx) => {
            let row;
            if (Object.keys(LabelTypes).includes(el)) {
                row = new Adw.ComboRow({ 
                    title: _(LabelTypes[el]), 
                    model: this._labelsModel, 
                    selected: Object.keys(LabelTypes).indexOf(el) 
                });
                row.connect("notify::selected", () => {
                    this._labels[idx] = Object.keys(LabelTypes)[row.selected];
                    this.notify("labels");
                });
            } else {
                row = new Adw.EntryRow({ title: _("Custom"), text: el });
                row.connect("notify::text", () => {
                    this._labels[idx] = row.text;
                    this.notify("labels");
                });
            }

            const ds = new Gtk.DragSource({ actions: Gdk.DragAction.MOVE });
            ds.connect("prepare", () => {
                const v = new GObject.Value(); v.init(GObject.TYPE_UINT); v.set_uint(idx);
                return Gdk.ContentProvider.new_for_value(v);
            });
            row.add_controller(ds);

            const del = new Gtk.Button({ icon_name: "user-trash-symbolic", css_classes: ["flat", "circular"], marginTop: 10, marginBottom: 10 });
            del.connect("clicked", () => {
                this._labels.splice(idx, 1);
                this.notify("labels");
                this._rebuild();
            });
            row.add_suffix(del);
            row.add_prefix(new Gtk.Image({ icon_name: "list-drag-handle-symbolic" }));
            this.listBox.append(row);
        });
    }
}