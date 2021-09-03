const { St, GLib, Gio, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Mainloop = imports.mainloop;
const Main = imports.ui.main;

const { playerAction, getPlayers, getMetadata, getStatus } = Me.imports.utils;

let maxDisplayLength,
    updateDelay,
    hideTrackName,
    hidePlayerIcon,
    hideControls,
    hideSeperators,
    extensionPosition,
    extensionIndex,
    coloredPlayerIcon,
    showAllOnHover,
    sepChars,
    mouseActions,
    elementOrder;

let onMaxLengthChanged,
    onUpdateDelayChanged,
    onHideTrackNameChanged,
    onHidePlayerIconChanged,
    onHideControlsChanged,
    onHideSeperatorsChanged,
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
    labelSeperatorEnd;

let mainloop, settings, positions, playerIcons;

let currentPlayer, currentMetadata, currentStatus;

let loopFinished, contentRemoved, mouseHovered;

const init = () => {
    loopFinished = true;
    contentRemoved = true;
    playerIcons = ["chromium", "firefox"];
    positions = {
        left: "_leftBox",
        center: "_centerBox",
        right: "_rightBox",
    };
};

const enable = () => {
    settings = ExtensionUtils.getSettings();

    onMaxLengthChanged = settings.connect("changed::max-text-length", () => {
        maxDisplayLength = settings.get_int("max-text-length");
        updateContent();
    });

    onUpdateDelayChanged = settings.connect("changed::update-delay", () => {
        updateDelay = settings.get_int("update-delay");
        startMainloop();
    });

    onHideTrackNameChanged = settings.connect("changed::hide-text", () => {
        hideTrackName = settings.get_boolean("hide-text");
        removeContent();
        addContent();
    });

    onHidePlayerIconChanged = settings.connect("changed::hide-player-icon", () => {
        hidePlayerIcon = settings.get_boolean("hide-player-icon");
        removeContent();
        addContent();
    });

    onHideControlsChanged = settings.connect("changed::hide-control-icons", () => {
        hideControls = settings.get_boolean("hide-control-icons");
        removeContent();
        addContent();
    });

    onHideSeperatorsChanged = settings.connect("changed::hide-seperators", () => {
        hideSeperators = settings.get_boolean("hide-seperators");
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

    maxDisplayLength = settings.get_int("max-text-length");
    updateDelay = settings.get_int("update-delay");
    hideTrackName = settings.get_boolean("hide-text");
    hidePlayerIcon = settings.get_boolean("hide-player-icon");
    hideControls = settings.get_boolean("hide-control-icons");
    hideSeperators = settings.get_boolean("hide-seperators");
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
        style_class: "panel-button",
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
            playerAction(currentPlayer, "toggle");
        })();
    });

    buttonPlayer.set_child(iconPlayer);
    buttonPlayer.connect("button-release-event", mouseAction);

    buttonLabel.connect("button-release-event", mouseAction);
    buttonLabel.connect("enter-event", () => {
        if (showAllOnHover) {
            mouseHovered = true;
            updateContent();
        }
    });
    buttonLabel.connect("leave-event", () => {
        if (showAllOnHover) {
            mouseHovered = false;
            updateContent();
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
    settings.disconnect(onHideControlsChanged);
    settings.disconnect(onHidePlayerIconChanged);
    settings.disconnect(onHideTrackNameChanged);
    settings.disconnect(onHideSeperatorsChanged);
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
    labelSeperatorStart.destroy();
    labelSeperatorEnd.destroy();

    removeContent();
};

const mainLoop = async () => {
    loopFinished = false;
    try {
        let players = await getPlayers();
        if (players.length > 0) {
            // log("\nPlayers are availablee");
            if (players.includes(currentPlayer)) {
                // log("Current player is in list");
                let status = await getStatus(currentPlayer);
                if (status === "Playing") {
                    // log("Player is playing");
                    currentStatus = "Playing";
                    let metadata = await getMetadata(currentPlayer);
                    if (Object.keys(metadata).every((key) => metadata[key] !== currentMetadata[key])) {
                        // log("Metadata is not equal, updating em");
                        currentMetadata = metadata;
                        updateContent();
                    } else {
                        updateToggleButtonIcon();
                    }
                } else {
                    // log("Current player is not playing");
                    for (player of players) {
                        _status = await getStatus(player);
                        if (_status === "Playing") {
                            // log("nulling player", _status);
                            currentPlayer = null;
                            break;
                        }
                    }

                    if (currentPlayer) {
                        // log("not nulling player", currentPlayer);
                        currentStatus = _status;
                        _metadata = await getMetadata(currentPlayer);
                        if (Object.keys(_metadata).every((key) => _metadata[key] !== currentMetadata[key])) {
                            // log("Metadata is not equal, updating em");
                            currentMetadata = _metadata;
                            updateContent();
                        } else {
                            updateToggleButtonIcon();
                        }
                    }
                }
            } else {
                // log("Player not in list");
                // log("New player/ new state");
                let validPlayers = new Map();
                let playingPlayers = [];
                for (player of players) {
                    let { id, title, artist } = await getMetadata(player);
                    if (title || (id && id !== "/org/mpris/MediaPlayer2/TrackList/NoTrack")) {
                        let status = await getStatus(player);
                        if (status === "Playing") {
                            playingPlayers.push(player);
                        }
                        validPlayers.set(player, {
                            id,
                            title,
                            artist,
                        });
                    }
                }
                if (validPlayers.size > 0) {
                    if (playingPlayers.length > 0) {
                        currentPlayer = playingPlayers[0];
                        currentStatus = "Playing";
                        // log("Playing player", currentPlayer);
                    } else {
                        currentPlayer = validPlayers.keys().next().value;
                        currentStatus = "Paused";
                        // log("no playing players", currentPlayer);
                    }
                    currentMetadata = validPlayers.get(currentPlayer);
                    addContent();
                    updateContent();
                } else {
                    removeContent();
                }
            }
        } else {
            // log("No players available");
            removeContent();
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
    // log("Updating content");
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

    let currentLabel =
        (currentMetadata["title"] || currentMetadata["id"]) +
        (currentMetadata["artist"] ? ` - ${currentMetadata["artist"]}` : "");

    if (currentLabel.length > maxDisplayLength && maxDisplayLength !== 0 && !mouseHovered) {
        currentLabel = currentLabel.substr(0, maxDisplayLength - 3) + "...";
    }

    buttonLabel.set_label(currentLabel);

    updateToggleButtonIcon();
};

const addContent = () => {
    if (contentRemoved) {
        // log("Adding content");
        let index = 0;
        for (element of elementOrder) {
            if (element === "icon" && !hidePlayerIcon) {
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonPlayer,
                    extensionIndex + index
                );
                index++;
            } else if (element === "title" && !hideTrackName) {
                if (!hideSeperators) {
                    Main.panel[positions[extensionPosition]].insert_child_at_index(
                        labelSeperatorStart,
                        extensionIndex + index
                    );
                    index++;
                }

                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonLabel,
                    extensionIndex + index
                );
                index++;

                if (!hideSeperators) {
                    Main.panel[positions[extensionPosition]].insert_child_at_index(
                        labelSeperatorEnd,
                        extensionIndex + index
                    );
                    index++;
                }
            } else if (element === "controls" && !hideControls) {
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonPrev,
                    extensionIndex + index
                );
                index++;

                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonToggle,
                    extensionIndex + index
                );
                index++;
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonNext,
                    extensionIndex + index
                );
                index++;
            }
        }
        contentRemoved = false;
    }
};

const removeContent = () => {
    if (!contentRemoved) {
        // log("Removing content");
        Main.panel[positions[extensionPosition]].remove_actor(buttonNext);
        Main.panel[positions[extensionPosition]].remove_actor(buttonToggle);
        Main.panel[positions[extensionPosition]].remove_actor(buttonPrev);
        Main.panel[positions[extensionPosition]].remove_actor(buttonLabel);
        Main.panel[positions[extensionPosition]].remove_actor(buttonPlayer);
        Main.panel[positions[extensionPosition]].remove_actor(labelSeperatorStart);
        Main.panel[positions[extensionPosition]].remove_actor(labelSeperatorEnd);
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
    if (event.pseudo_class && event.pseudo_class.includes("active")) {
        playerAction(currentPlayer, mouseActions[0]);
    } else {
        playerAction(currentPlayer, mouseActions[1]);
    }
};
