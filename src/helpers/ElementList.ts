import Adw from "gi://Adw?version=1";
import GObject from "gi://GObject?version=2.0";
import Gdk from "gi://Gdk?version=4.0";
import Graphene from "gi://Graphene?version=1.0";
import Gtk from "gi://Gtk?version=4.0";

import { PanelElements } from "../types/enums/general.js";

class ElementList extends Gtk.ListBox {
    public readonly elements: string[];

    constructor(initOrder: string[]) {
        super();

        const dropTarget = Gtk.DropTarget.new(GObject.TYPE_UINT, Gdk.DragAction.MOVE);
        dropTarget.connect("drop", (_, sourceIndex, x, y) => {
            const targetRow = this.get_row_at_y(y);
            if (targetRow == null || sourceIndex == null) return;

            const sourceValue = this.elements[sourceIndex];
            const targetIndex = targetRow.get_index();

            this.elements.splice(targetIndex > sourceIndex ? targetIndex + 1 : targetIndex, 0, sourceValue);
            this.elements.splice(sourceIndex > targetIndex ? sourceIndex + 1 : sourceIndex, 1);

            this.notify("elements");
            this.drag_unhighlight_row();
            this.addElements();
        });

        this.elements = initOrder;
        this.add_css_class("boxed-list");
        this.set_selection_mode(Gtk.SelectionMode.NONE);
        this.add_controller(dropTarget);
        this.addElements();
    }

    private addElements() {
        this.remove_all();

        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];

            const row = new Adw.ActionRow();
            row.title = PanelElements[element];
            row.activatable = true;

            const dragIcon = new Gtk.Image({ icon_name: "list-drag-handle-symbolic" });
            row.add_suffix(dragIcon);

            const value = new GObject.Value();
            value.init(GObject.TYPE_UINT);
            value.set_uint(i);

            const content = Gdk.ContentProvider.new_for_value(value);

            const dragSource = new Gtk.DragSource({ actions: Gdk.DragAction.MOVE, content });
            const dropController = new Gtk.DropControllerMotion();

            dragSource.connect("prepare", (dragSource, x, y) => {
                const row = dragSource.widget as Adw.ActionRow;
                const icon = this.snapshotRow(row);

                dragSource.set_icon(icon, x, y);
                return dragSource.content;
            });

            dropController.connect("enter", (dropController) => {
                const row = dropController.widget as Adw.ActionRow;
                this.drag_highlight_row(row);
            });

            dropController.connect("leave", () => {
                this.drag_unhighlight_row();
            });

            row.add_controller(dragSource);
            row.add_controller(dropController);
            this.append(row);
        }
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
    GTypeName: "McElementList",
    Properties: {
        elements: GObject.ParamSpec.jsobject("elements", "Elements", "Elements", GObject.ParamFlags.READABLE),
    },
};

export default GObject.registerClass(classPropertiers, ElementList);