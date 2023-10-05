import { MediaControls } from "./widget.js";

let mc_extension;

import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";

export default class MediaControlsExtension extends Extension {
  enable() {
    log(_("[MediaControls] Enabling"));
    mc_extension = new MediaControls();
    mc_extension.enable(this);
  }

  disable() {
    log(_("[MediaControls] Disabling"));
    mc_extension.disable();
    mc_extension = null;
  }
}
