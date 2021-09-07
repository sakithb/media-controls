const { St, GLib, Gio, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Mainloop = imports.mainloop;
const Main = imports.ui.main;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const {
    playerAction,
    getPlayers,
    getMetadata,
    getStatus,
    updatePlayers,
    isValidPlayer,
    isEqual,
    getDisplayLabel,
    saveIcon,
} = Me.imports.utils;

let maxDisplayLength,
    updateDelay,
    showTrackName,
    showPlayerIcon,
    showControls,
    showSeperators,
    showMenu,
    extensionPosition,
    extensionIndex,
    coloredPlayerIcon,
    showAllOnHover,
    sepChars,
    mouseActions,
    elementOrder;

let onMaxLengthChanged,
    onUpdateDelayChanged,
    onShowTrackNameChanged,
    onShowPlayerIconChanged,
    onShowControlsChanged,
    onShowMenuChanged,
    onShowSeperatorsChanged,
    onExtensionPositionChanged,
    onExtensionIndexChanged,
    onColoredPlayerIconChanged,
    onShowAllOnHoverChanged,
    onSepCharsChanged,
    onMouseActionsChanged,
    onElementOrderChanged;

let buttonNext,
    buttonPrev,
    buttonToggle,
    buttonLabel,
    buttonPlayer,
    iconNext,
    iconPause,
    iconPlay,
    iconPrev,
    iconPlayer,
    labelSeperatorStart,
    labelSeperatorEnd,
    container,
    box,
    menuIcon;

let mainloop, settings, settingsMap, positions, playerIcons;

let currentPlayer, currentMetadata, currentLabel, currentStatus;

let loopFinished, contentRemoved, mouseHovered, sourceChanged;

const init = () => {
    playerIcons = ["chromium", "firefox"];
    positions = {
        left: "_leftBox",
        center: "_centerBox",
        right: "_rightBox",
    };
};

const enable = () => {
    settings = ExtensionUtils.getSettings();
    loopFinished = true;
    contentRemoved = true;

    currentMetadata = null;
    currentPlayer = null;
    currentStatus = null;
    currentLabel = null;
    sourceChanged = false;

    initNewSettings();

    onMaxLengthChanged = settings.connect("changed::max-text-width", () => {
        maxDisplayLength = settings.get_int("max-text-width");
        if (maxDisplayLength === 0) {
            buttonLabel.set_style(`max-width: none; padding: 0px 3px;`);
        } else {
            buttonLabel.set_style(`max-width: ${maxDisplayLength}px;  padding: 0px 3px;`);
        }
    });

    onUpdateDelayChanged = settings.connect("changed::update-delay", () => {
        updateDelay = settings.get_int("update-delay");
        startMainloop();
    });

    onShowTrackNameChanged = settings.connect("changed::show-text", () => {
        showTrackName = settings.get_boolean("show-text");
        removeContent();
        addContent();
    });

    onShowPlayerIconChanged = settings.connect("changed::show-player-icon", () => {
        showPlayerIcon = settings.get_boolean("show-player-icon");
        removeContent();
        addContent();
    });

    onShowControlsChanged = settings.connect("changed::show-control-icons", () => {
        showControls = settings.get_boolean("show-control-icons");
        removeContent();
        addContent();
    });

    onShowSeperatorsChanged = settings.connect("changed::show-seperators", () => {
        showSeperators = settings.get_boolean("show-seperators");
        removeContent();
        addContent();
    });

    onShowMenuChanged = settings.connect("changed::show-sources-menu", () => {
        showMenu = settings.get_boolean("show-sources-menu");
        if (!showMenu) {
            if (showTrackName) {
                altSourceMenu = new PanelMenu.Button(1);
            } else {
            }
        }
        removeContent();
        addContent();
    });

    onExtensionPositionChanged = settings.connect("changed::extension-position", () => {
        removeContent();
        extensionPosition = settings.get_string("extension-position");
        addContent();
    });

    onExtensionIndexChanged = settings.connect("changed::extension-index", () => {
        extensionIndex = settings.get_int("extension-index");
        removeContent();
        addContent();
    });

    onColoredPlayerIconChanged = settings.connect("changed::colored-player-icon", () => {
        coloredPlayerIcon = settings.get_boolean("colored-player-icon");
        updatePlayerIconEffects();
    });

    onShowAllOnHoverChanged = settings.connect("changed::show-all-on-hover", () => {
        showAllOnHover = settings.get_boolean("show-all-on-hover");
    });

    onSepCharsChanged = settings.connect("changed::seperator-chars", () => {
        sepChars = settings.get_strv("seperator-chars");
        labelSeperatorStart.set_text(sepChars[0]);
        labelSeperatorEnd.set_text(sepChars[1]);
    });

    onMouseActionsChanged = settings.connect("changed::mouse-actions", () => {
        mouseActions = settings.get_strv("mouse-actions");
    });

    onElementOrderChanged = settings.connect("changed::element-order", () => {
        elementOrder = settings.get_strv("element-order");
        removeContent();
        addContent();
    });

    maxDisplayLength = settings.get_int("max-text-width");
    updateDelay = settings.get_int("update-delay");
    showTrackName = settings.get_boolean("show-text");
    showPlayerIcon = settings.get_boolean("show-player-icon");
    showControls = settings.get_boolean("show-control-icons");
    showSeperators = settings.get_boolean("show-seperators");
    showMenu = settings.get_boolean("show-sources-menu");
    extensionPosition = settings.get_string("extension-position");
    extensionIndex = settings.get_int("extension-index");
    coloredPlayerIcon = settings.get_boolean("colored-player-icon");
    showAllOnHover = settings.get_boolean("show-all-on-hover");
    mouseActions = settings.get_strv("mouse-actions");
    sepChars = settings.get_strv("seperator-chars");
    elementOrder = settings.get_strv("element-order");

    // UI Elements

    buttonToggle = new St.Button({ style_class: "panel-button" });
    buttonNext = new St.Button({
        style_class: "panel-button",
    });
    buttonPrev = new St.Button({
        style_class: "panel-button",
    });
    buttonLabel = new St.Button({
        style: `max-width: ${maxDisplayLength}px; padding: 0px 3px;`,
        style_class: "panel-button",
        label: "No media",
    });
    buttonPlayer = new St.Button({
        style_class: "panel-button",
    });

    iconPlay = new St.Icon({
        icon_name: "media-playback-start-symbolic",
        style_class: "system-status-icon",
    });
    iconPause = new St.Icon({
        icon_name: "media-playback-pause-symbolic",
        style_class: "system-status-icon",
    });
    iconNext = new St.Icon({
        icon_name: "media-skip-forward-symbolic",
        style_class: "system-status-icon",
    });
    iconPrev = new St.Icon({
        icon_name: "media-skip-backward-symbolic",
        style_class: "system-status-icon",
    });
    iconPlayer = new St.Icon({
        style_class: "system-status-icon",
    });

    labelSeperatorStart = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "panel-button",
        style: "padding: 3px",
    });

    labelSeperatorEnd = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "panel-button",
        style: "padding: 3px",
    });

    box = new St.BoxLayout();

    container = new PanelMenu.Button(0.5);
    container.set_style_class_name(null);

    container.add_child(box);
    container.menu.connect("open-state-changed", (menu, open) => {
        if (open) {
            menuIcon.add_style_pseudo_class("active");
            try {
                (() => {
                    updatePlayers(container, changeSource);
                })();
            } catch (error) {
                logError(error);
            }
        } else {
            menuIcon.remove_style_pseudo_class("active");
        }
    });
    container.menu.addMenuItem(new PopupMenu.PopupMenuItem("Players", { reactive: false }));

    menuIcon = PopupMenu.arrowIcon(St.Side.BOTTOM);
    menuIcon.add_style_class_name("panel-button");
    menuIcon.set_style("padding: 3px;");

    buttonNext.set_child(iconNext);
    buttonNext.connect("button-release-event", () => {
        (() => {
            playerAction(currentPlayer, "next");
        })();
    });

    buttonPrev.set_child(iconPrev);
    buttonPrev.connect("button-release-event", () => {
        (() => {
            playerAction(currentPlayer, "previous");
        })();
    });

    buttonToggle.set_child(iconPlay);
    buttonToggle.connect("button-release-event", () => {
        (() => {
            playerAction(currentPlayer, "toggle_play");
        })();
    });

    buttonPlayer.set_child(iconPlayer);
    buttonPlayer.connect("button-release-event", mouseAction);

    buttonLabel.connect("button-release-event", mouseAction);
    buttonLabel.connect("enter-event", () => {
        if (showAllOnHover) {
            buttonLabel.set_style("max-width: none; padding: 0px 3px;");
        }
    });
    buttonLabel.connect("leave-event", () => {
        if (showAllOnHover) {
            buttonLabel.set_style(`max-width: ${maxDisplayLength}px; padding: 0px 3px;`);
        }
    });

    labelSeperatorStart.set_text(sepChars[0]);
    labelSeperatorEnd.set_text(sepChars[1]);

    updatePlayerIconEffects();

    startMainloop();
};

const disable = () => {
    Mainloop.source_remove(mainloop);

    settings.disconnect(onMaxLengthChanged);
    settings.disconnect(onUpdateDelayChanged);
    settings.disconnect(onShowControlsChanged);
    settings.disconnect(onShowPlayerIconChanged);
    settings.disconnect(onShowTrackNameChanged);
    settings.disconnect(onShowSeperatorsChanged);
    settings.disconnect(onExtensionPositionChanged);
    settings.disconnect(onExtensionIndexChanged);
    settings.disconnect(onShowAllOnHoverChanged);
    settings.disconnect(onColoredPlayerIconChanged);
    settings.disconnect(onMouseActionsChanged);
    settings.disconnect(onSepCharsChanged);
    settings.disconnect(onElementOrderChanged);

    buttonNext.destroy();
    buttonPrev.destroy();
    buttonToggle.destroy();
    buttonLabel.destroy();
    iconNext.destroy();
    iconPause.destroy();
    iconPlay.destroy();
    iconPrev.destroy();
    iconPlayer.destroy();
    labelSeperatorStart.destroy();
    labelSeperatorEnd.destroy();
    container.destroy();

    delete Main.panel.statusArea["sourceMenu"];

    currentMetadata = null;
    currentPlayer = null;
    currentStatus = null;
    currentLabel = null;
    sourceChanged = false;

    removeContent();
};

const mainLoop = async () => {
    loopFinished = false;
    try {
        let players = await getPlayers();
        if (players.length > 0) {
            if (players.includes(currentPlayer)) {
                let status = await getStatus(currentPlayer);
                if (status === "Playing") {
                    currentStatus = status;
                    let metadata = await getMetadata(currentPlayer);
                    if (isValidPlayer(metadata["id"], metadata["title"])) {
                        if (!isEqual(metadata, currentMetadata)) {
                            currentMetadata = metadata;
                            currentLabel = getDisplayLabel(metadata);
                            updateContent();
                        } else {
                            updateToggleButtonIcon();
                        }
                    } else {
                        currentPlayer = null;
                        sourceChanged = false;
                    }
                } else {
                    for (player of players) {
                        _status = await getStatus(player);
                        if (_status === "Playing" && !sourceChanged) {
                            currentPlayer = null;
                            break;
                        }
                    }

                    if (currentPlayer) {
                        currentStatus = _status;
                        _metadata = await getMetadata(currentPlayer);

                        if (isValidPlayer(_metadata["id"], _metadata["title"])) {
                            if (!isEqual(_metadata, currentMetadata)) {
                                currentMetadata = _metadata;
                                currentLabel = getDisplayLabel(_metadata);
                                updateContent();
                            } else {
                                updateToggleButtonIcon();
                            }
                        } else {
                            currentPlayer = null;
                            sourceChanged = false;
                        }
                    }
                }
            } else {
                sourceChanged = false;
                let validPlayers = new Map();
                let playingPlayers = [];
                for (player of players) {
                    let metadata = await getMetadata(player);
                    if (isValidPlayer(metadata["id"], metadata["title"])) {
                        let status = await getStatus(player);
                        if (status === "Playing") {
                            playingPlayers.push(player);
                        }
                        validPlayers.set(player, metadata);
                    }
                }
                if (validPlayers.size > 0) {
                    if (playingPlayers.length > 0) {
                        currentPlayer = playingPlayers[0];
                        currentStatus = "Playing";
                    } else {
                        currentPlayer = validPlayers.keys().next().value;
                        currentStatus = "Paused";
                    }
                    currentMetadata = validPlayers.get(currentPlayer);

                    currentLabel = getDisplayLabel(currentMetadata);

                    addContent();
                    updateContent();
                } else {
                    removeContent();
                    currentMetadata = null;
                    currentPlayer = null;
                    currentStatus = null;
                    currentLabel = null;

                    sourceChanged = false;
                }
            }
        } else {
            removeContent();
            currentMetadata = null;
            currentPlayer = null;
            currentStatus = null;
            currentLabel = null;
            sourceChanged = false;
        }
    } catch (error) {
        logError(error);
    }
    loopFinished = true;
};

const startMainloop = () => {
    Mainloop.source_remove(mainloop);
    mainloop = Mainloop.timeout_add(updateDelay, () => {
        if (loopFinished) {
            mainLoop();
        }
        return true;
    });
};

const updateContent = () => {
    log("[Media-Controls] Updating content");

    let currentIcon = null;
    for (playerIcon of playerIcons) {
        if (currentPlayer.includes(playerIcon)) {
            currentIcon = playerIcon;
            break;
        }
    }
    if (!currentIcon) {
        let splittedCurrentPlayer = currentPlayer.split(".");
        currentIcon = splittedCurrentPlayer[splittedCurrentPlayer.length - 1];
    }
    iconPlayer.set_icon_name(currentIcon);

    let displayLabel = currentLabel + (currentMetadata["artist"] ? ` - ${currentMetadata["artist"]}` : "");

    buttonLabel.set_label(displayLabel);

    updateToggleButtonIcon();

    if (currentMetadata["image"]) {
        saveIcon(currentMetadata["id"], currentMetadata["image"]);
    }
};

const addContent = () => {
    if (contentRemoved) {
        log("[Media-Controls] Adding content");
        // Deleting reference as safety measuremnt
        delete Main.panel.statusArea["sourceMenu"];
        Main.panel.addToStatusArea("sourceMenu", container, extensionIndex, extensionPosition);
        for (element of elementOrder) {
            if (element === "icon" && showPlayerIcon) {
                box.add(buttonPlayer);
            } else if (element === "title" && showTrackName) {
                if (showSeperators) {
                    box.add(labelSeperatorStart);
                }

                box.add(buttonLabel);

                if (showSeperators) {
                    box.add(labelSeperatorEnd);
                }
            } else if (element === "controls" && showControls) {
                box.add(buttonPrev);

                box.add(buttonToggle);

                box.add(buttonNext);
            } else if (element === "menu" && showMenu) {
                box.add(menuIcon);
            }
        }

        contentRemoved = false;
    }
};

const removeContent = () => {
    if (!contentRemoved) {
        log("[Media-Controls] Removing content");
        box.remove_child(buttonNext);
        box.remove_child(buttonToggle);
        box.remove_child(buttonPrev);
        box.remove_child(buttonLabel);
        box.remove_child(buttonPlayer);
        box.remove_child(labelSeperatorStart);
        box.remove_child(labelSeperatorEnd);
        box.remove_child(menuIcon);

        delete Main.panel.statusArea["sourceMenu"];

        contentRemoved = true;
    }
};

const updatePlayerIconEffects = () => {
    if (coloredPlayerIcon) {
        iconPlayer.clear_effects();
        iconPlayer.set_style("-st-icon-style: requested");
        iconPlayer.set_fallback_icon_name("audio-x-generic");
    } else {
        iconPlayer.set_style("-st-icon-style: symbolic");
        iconPlayer.add_effect(new Clutter.DesaturateEffect());
        iconPlayer.set_fallback_icon_name("audio-x-generic-symbolic");
    }
};

const updateToggleButtonIcon = () => {
    if (currentStatus === "Playing") {
        buttonToggle.set_child(iconPause);
    } else {
        buttonToggle.set_child(iconPlay);
    }
};

const mouseAction = (event) => {
    let button = 1;
    if (event.pseudo_class && event.pseudo_class.includes("active")) {
        button = 0;
    }
    if (mouseActions[button] === "toggle_menu") {
        container.menu.open();
    } else {
        playerAction(currentPlayer, mouseActions[button]);
    }
};

const changeSource = (player) => {
    log(`[Media-Controls] Changing player to ${player}`);
    currentPlayer = player;
    sourceChanged = true;
};

const initNewSettings = () => {
    let elOrder = settings.get_strv("element-order");
    if (elOrder.length === 3) {
        settingsMap = {
            "hide-text": "show-text",
            "hide-player-icon": "show-player-icon",
            "hide-control-icons": "show-control-icons",
            "hide-seperators": "show-seperators",
        };
        Object.keys(settingsMap).forEach((old) => {
            let oldVal = settings.get_boolean(old);
            settings.set_boolean(settingsMap[old], !oldVal);
        });

        settings.set_strv("element-order", [...elOrder, "menu"]);

        let msActions = settings.get_strv("mouse-actions");
        if (msActions.includes("toggle")) {
            msActions[msActions.indexOf("toggle")] = "toggle_play";
        }
        settings.set_strv("mouse-actions", msActions);
    }
};
