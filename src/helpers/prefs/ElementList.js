import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import Gdk from "gi://Gdk";

export default class ElementList extends Adw.PreferencesGroup {
    constructor(params = {}) {
        super(params);
        this.listBox = this._list_box;
        this.iconRow = this._icon_row;
        this.labelRow = this._label_row;
        this.controlsRow = this._controls_row;
        
        this.iconRow.elementKey = "ICON";
        this.labelRow.elementKey = "LABEL";
        this.controlsRow.elementKey = "CONTROLS";
        
        this._elements = [];
        this._setupDragDrop();
    }

    get elements() { return [...this._elements]; }

    initElements(elements) {
        this._elements = Array.isArray(elements) ? [...elements] : [];
        this._rebuild();
    }

    _setupDragDrop() {
        this.listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        
        const dropTarget = Gtk.DropTarget.new(GObject.TYPE_UINT, Gdk.DragAction.MOVE);
        dropTarget.connect("drop", (_, srcIdx, x, y) => {
            const targetRow = this.listBox.get_row_at_y(y);
            if (!targetRow || srcIdx == null) return false;

            const srcVal = this._elements[srcIdx];
            const tgtIdx = targetRow.get_index();

            this._elements.splice(srcIdx, 1);
            this._elements.splice(tgtIdx, 0, srcVal);

            this.notify("elements");
            this.listBox.invalidate_sort();
            return true;
        });
        
        this.listBox.add_controller(dropTarget);
        this.listBox.set_sort_func((a, b) => {
            // @ts-expect-error
            return this._elements.indexOf(a.elementKey) - this._elements.indexOf(b.elementKey);
        });
    }

    _rebuild() {
        if (!this._controllersInitialized) {
            [this.iconRow, this.labelRow, this.controlsRow].forEach(row => {
                const ds = new Gtk.DragSource({ actions: Gdk.DragAction.MOVE });
                ds.connect("prepare", (source) => {
                    // @ts-expect-error
                    const idx = this._elements.indexOf(source.widget.elementKey);
                    const v = new GObject.Value(); v.init(GObject.TYPE_UINT); v.set_uint(idx);
                    return Gdk.ContentProvider.new_for_value(v);
                });
                row.add_controller(ds);
            });
            this._controllersInitialized = true;
        }
        this.listBox.invalidate_sort();
    }
}