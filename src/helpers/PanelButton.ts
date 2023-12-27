import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import GObject from "gi://GObject?version=2.0";

class PanelButton extends PanelMenu.Button {
    constructor() {
        super(0.5, "Media Controls", false);
    }
}

const classPropertiers = {
    GTypeName: "McPanelButton",
    Properties: {},
};

export default GObject.registerClass(classPropertiers, PanelButton);
