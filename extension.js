const MediaControls = imports.misc.extensionUtils.getCurrentExtension().imports.widget.MediaControls;

let extension;

const init = () => {};

const enable = () => {
    log("[MediaControls] Enabling");
    extension = new MediaControls();
    extension.enable();
};

const disable = () => {
    log("[MediaControls] Disabling");
    extension.disable();
    extension = null;
};
