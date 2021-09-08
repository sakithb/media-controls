const Mainloop = imports.mainloop;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { bindSignals, initSettings, initWidgets, disconnectSignals, destroyWidgets, initVars, nullifyVars } =
    Me.imports.main;

const { startMainloop } = Me.imports.mainloop;

const init = () => {};

const enable = () => {
    initVars();

    bindSignals();

    initSettings();

    initWidgets();

    startMainloop();
};

const disable = () => {
    Mainloop.source_remove(mainloop);

    disconnectSignals();
    destroyWidgets();

    delete Main.panel.statusArea["sourceMenu"];

    nullifyVars();

    removeContent();
};
