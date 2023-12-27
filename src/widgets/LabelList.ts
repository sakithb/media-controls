import Adw from "gi://Adw?version=1";
import GObject from "gi://GObject?version=2.0";
import Gdk from "gi://Gdk?version=4.0";
import Graphene from "gi://Graphene?version=1.0";
import Gtk from "gi://Gtk?version=4.0";

import { LabelTypes } from "../types/enums.js";

class LabelList extends Gtk.ListBox {
    public readonly labels: string[];
    private labelsList: Gtk.StringList;

    constructor(initLabels: string[]) {
        super();

        this.labels = initLabels;
        this.labelsList = new Gtk.StringList();

        for (const label of Object.values(LabelTypes)) {
            this.labelsList.append(label);
        }

        const dropTarget = Gtk.DropTarget.new(GObject.TYPE_STRING, Gdk.DragAction.MOVE);
        dropTarget.connect("drop", (_, value, x, y) => {
            const targetRow = this.get_row_at_y(y);
            if (!targetRow || !value) return;

            const sourceIndex = this.labels.indexOf(value);
            const targetIndex = targetRow.get_index();

            this.labels.splice(sourceIndex, 1, this.labels[targetIndex]);
            this.labels.splice(targetIndex, 1, value);

            this.notify("labels");
            this.drag_unhighlight_row();
            this.addElements();
        });

        this.add_css_class("boxed-list");
        this.set_selection_mode(Gtk.SelectionMode.NONE);
        this.add_controller(dropTarget);
        this.addElements();
    }

    public addItem() {
        this.labels.unshift("ALBUM");
        this.notify("labels");
        this.addElements();
    }

    public addText() {
        this.labels.unshift("");
        this.notify("labels");
        this.addElements();
    }

    private addElements() {
        this.remove_all();

        if (this.labels.length === 0) {
            const row = new Adw.ActionRow();

            const label = new Gtk.Label();
            label.label = "<span size='x-large' weight='bold' color='#ccc'>No labels added</span>";
            label.useMarkup = true;
            label.halign = Gtk.Align.CENTER;
            label.marginTop = 20;
            label.marginBottom = 20;

            row.set_child(label);
            this.append(row);
            return;
        }

        for (const element of this.labels) {
            if (Object.keys(LabelTypes).includes(element)) {
                const row = new Adw.ComboRow();
                row.title = LabelTypes[element];
                row.model = this.labelsList;
                row.selected = Object.keys(LabelTypes).indexOf(element);

                this.handleComboBoxChange(row);
                this.completeRowCreation(row, element);
            } else {
                const row = new Adw.EntryRow();
                row.title = "Custom text";
                row.text = element;

                this.handleEntryChange(row);
                this.completeRowCreation(row, element);
            }
        }
    }

    private completeRowCreation(row: Adw.ComboRow | Adw.EntryRow, element: string) {
        const dragIcon = new Gtk.Image({ icon_name: "list-drag-handle-symbolic" });
        row.add_prefix(dragIcon);

        const deleteBtn = new Gtk.Button({ icon_name: "user-trash-symbolic" });
        deleteBtn.marginTop = 10;
        deleteBtn.marginBottom = 10;
        deleteBtn.add_css_class("flat");
        deleteBtn.add_css_class("circular");
        row.add_suffix(deleteBtn);

        deleteBtn.connect("clicked", () => {
            this.labels.splice(this.labels.indexOf(element), 1);
            this.notify("labels");
            this.addElements();
        });

        const dragSource = new Gtk.DragSource({ actions: Gdk.DragAction.MOVE });
        const dropController = new Gtk.DropControllerMotion();

        dragSource.connect("prepare", (dragSource, x, y) => {
            const row = dragSource.widget as Adw.ComboRow | Adw.EntryRow;
            const snapshot = this.snapshotRow(row);
            dragSource.set_icon(snapshot, x, y);

            const value = new GObject.Value();
            value.init(GObject.TYPE_STRING);
            value.set_string(element);

            return Gdk.ContentProvider.new_for_value(value);
        });

        dropController.connect("enter", (dropController) => {
            const row = dropController.widget as Adw.ComboRow | Adw.EntryRow;
            this.drag_highlight_row(row);
        });

        dropController.connect("leave", () => {
            this.drag_unhighlight_row();
        });

        row.add_controller(dragSource);
        row.add_controller(dropController);

        this.append(row);
    }

    private handleComboBoxChange(row: Adw.ComboRow) {
        row.connect("notify::selected", () => {
            const rowIndex = row.get_index();
            const labelListKeys = Object.keys(LabelTypes);
            const labelKey = labelListKeys[row.selected];

            this.labels.splice(rowIndex, 1, labelKey);
            this.notify("labels");
        });
    }

    private handleEntryChange(row: Adw.EntryRow) {
        row.connect("notify::text", () => {
            const rowIndex = row.get_index();
            this.labels.splice(rowIndex, 1, row.text);
            this.notify("labels");
        });
    }

    private snapshotRow(row: Adw.PreferencesRow) {
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

const classPropertiers = {
    GTypeName: "McLabelList",
    Properties: {
        labels: GObject.ParamSpec.jsobject("labels", "Labels", "Labels", GObject.ParamFlags.READABLE),
    },
};

export default GObject.registerClass(classPropertiers, LabelList);
