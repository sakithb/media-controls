import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gdk from "gi://Gdk";
import Graphene from "gi://Graphene";
import Gtk from "gi://Gtk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import { LabelTypes } from "../../types/enums/common.js";

/** @extends Adw.PreferencesGroup */

class LabelList extends Adw.PreferencesGroup {
    /**
     * @public
     * @type {string[]}
     */
    labels;

    /**
     * @private
     * @type {Gtk.StringList}
     */
    labelsList;
    /**
     * @private
     * @type {Gtk.ListBox}
     */
    listBox;
    /**
     * @private
     * @type {Gtk.Button}
     */
    addItemBtn;
    /**
     * @private
     * @type {Gtk.Button}
     */
    addTextBtn;

    /**
     * @param {{}} [params={}]
     */
    constructor(params = {}) {
        super(params);
        // @ts-expect-error Typescript doesn't know about internal children
        this.listBox = this._list_box;
        // @ts-expect-error Typescript doesn't know about internal children
        this.addItemBtn = this._add_item_btn;
        // @ts-expect-error Typescript doesn't know about internal children
        this.addTextBtn = this._add_text_btn;
        this.labelsList = new Gtk.StringList({
            strings: Object.values(LabelTypes).map(_),
        });
        const dropTarget = Gtk.DropTarget.new(GObject.TYPE_UINT, Gdk.DragAction.MOVE);
        dropTarget.connect("drop", (_, sourceIndex, x, y) => {
            const targetRow = this.listBox.get_row_at_y(y);
            if (targetRow == null || sourceIndex == null) return;
            // TODO: find out typeof of sourceIndex
            // @ts-expect-error sourceIndex is a number
            const index = /** @type {number} */ (sourceIndex);
            const sourceValue = this.labels[index];
            const targetIndex = targetRow.get_index();
            this.labels.splice(targetIndex > index ? targetIndex + 1 : targetIndex, 0, sourceValue);
            this.labels.splice(index > targetIndex ? index + 1 : index, 1);
            this.notify("labels");
            this.listBox.drag_unhighlight_row();
            this.addElements();
        });
        this.addItemBtn.connect("clicked", () => {
            this.labels.push("ALBUM");
            this.notify("labels");
            this.addElements();
        });
        this.addTextBtn.connect("clicked", () => {
            this.labels.push("");
            this.notify("labels");
            this.addElements();
        });
        this.listBox.add_controller(dropTarget);
    }

    /**
     * @public
     * @param {string[]} labels
     * @returns {void}
     */
    initLabels(labels) {
        this.labels = labels;
        this.addElements();
    }

    /**
     * @private
     * @returns {void}
     */
    addElements() {
        this.listBox.remove_all();
        if (this.labels.length === 0) {
            const row = new Adw.ActionRow();
            const label = new Gtk.Label();
            label.label = "<span size='x-large' weight='bold' color='#ccc'>No labels added</span>";
            label.useMarkup = true;
            label.halign = Gtk.Align.CENTER;
            label.marginTop = 20;
            label.marginBottom = 20;
            row.set_child(label);
            this.listBox.append(row);
            return;
        }
        for (let i = 0; i < this.labels.length; i++) {
            const element = this.labels[i];
            if (Object.keys(LabelTypes).includes(element)) {
                const row = new Adw.ComboRow();
                row.title = _(LabelTypes[element]);
                row.model = this.labelsList;
                row.selected = Object.keys(LabelTypes).indexOf(element);
                this.handleComboBoxChange(row);
                this.completeRowCreation(row, i);
            } else {
                const row = new Adw.EntryRow();
                row.title = _("Custom text");
                row.text = element;
                this.handleEntryChange(row);
                this.completeRowCreation(row, i);
            }
        }
    }

    /**
     * @private
     * @param {Adw.ComboRow | Adw.EntryRow} row
     * @param {number} index
     * @returns {void}
     */
    completeRowCreation(row, index) {
        const dragIcon = new Gtk.Image({
            icon_name: "list-drag-handle-symbolic",
        });
        row.add_prefix(dragIcon);
        const deleteBtn = new Gtk.Button({ icon_name: "user-trash-symbolic" });
        deleteBtn.marginTop = 10;
        deleteBtn.marginBottom = 10;
        deleteBtn.add_css_class("flat");
        deleteBtn.add_css_class("circular");
        row.add_suffix(deleteBtn);
        deleteBtn.connect("clicked", () => {
            this.labels.splice(index, 1);
            this.notify("labels");
            this.addElements();
        });
        const value = new GObject.Value();
        value.init(GObject.TYPE_UINT);
        value.set_uint(index);
        const content = Gdk.ContentProvider.new_for_value(value);
        const dragSource = new Gtk.DragSource({
            actions: Gdk.DragAction.MOVE,
            content,
        });
        const dropController = new Gtk.DropControllerMotion();
        dragSource.connect("prepare", (dragSource, x, y) => {
            const row = /** @type {Adw.ComboRow | Adw.EntryRow} */ (dragSource.widget);
            const snapshot = this.snapshotRow(row);
            dragSource.set_icon(snapshot, x, y);
            return dragSource.content;
        });
        dropController.connect("enter", (dropController) => {
            const row = /** @type {Adw.ComboRow | Adw.EntryRow} */ (dropController.widget);
            this.listBox.drag_highlight_row(row);
        });
        dropController.connect("leave", () => {
            this.listBox.drag_unhighlight_row();
        });
        row.add_controller(dragSource);
        row.add_controller(dropController);
        this.listBox.append(row);
    }

    /**
     * @private
     * @param {Adw.ComboRow} row
     * @returns {void}
     */
    handleComboBoxChange(row) {
        row.connect("notify::selected", () => {
            const rowIndex = row.get_index();
            const labelListKeys = Object.keys(LabelTypes);
            const labelKey = labelListKeys[row.selected];
            this.labels.splice(rowIndex, 1, labelKey);
            this.notify("labels");
            this.addElements();
        });
    }

    /**
     * @private
     * @param {Adw.EntryRow} row
     * @returns {void}
     */
    handleEntryChange(row) {
        row.connect("notify::text", () => {
            const rowIndex = row.get_index();
            this.labels.splice(rowIndex, 1, row.text);
            this.notify("labels");
        });
    }

    /**
     * @private
     * @param {Adw.PreferencesRow} row
     * @returns {any}
     */
    snapshotRow(row) {
        const paintable = new Gtk.WidgetPaintable({ widget: row });
        const width = row.get_allocated_width();
        const height = row.get_allocated_height();
        const snapshot = new Gtk.Snapshot();
        paintable.snapshot(snapshot, width, height);
        const node = snapshot.to_node();
        const renderer = row.get_native().get_renderer();
        const rect = new Graphene.Rect();
        rect.init(0, 0, width, height);
        const texture = renderer.render_texture(node, rect);
        return texture;
    }
}

export default LabelList;
