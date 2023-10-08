const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain("mediacontrols");
const _ = Gettext.gettext;
const MediaControls = Me.imports.widget.MediaControls;

let extension;

function init() {
    ExtensionUtils.initTranslations("mediacontrols");
}

function enable() {
    log(_("[MediaControls] Enabling"));
    extension = new MediaControls();
    extension.enable();
}

function disable() {
    log(_("[MediaControls] Disabling"));
    extension.disable();
    extension = null;
}
