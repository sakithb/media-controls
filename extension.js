import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import { MediaControls } from "./widget.js";

let mcExtension;

export default class MediaControlsExtension extends Extension {
    enable() {
        log(_("[MediaControls] Enabling"));
        mcExtension = new MediaControls();
        mcExtension.enable(this);
    }

    disable() {
        log(_("[MediaControls] Disabling"));
        mcExtension.disable();
        mcExtension = null;
    }

    reload() {
        log(_("[MediaControls] Reloading"));
        mcExtension.disable();
        mcExtension = new MediaControls();
        mcExtension.enable(this);
    }
}
