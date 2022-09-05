const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MediaControls = Me.imports.widget.MediaControls;

let extension;

function init() {};

function enable() {
    log("[MediaControls] Enabling");
    extension = new MediaControls();
    extension.enable();
};

function disable() {
    log("[MediaControls] Disabling");
    extension.disable();
    extension = null;
};
