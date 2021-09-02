// Imports

const { St, GLib, Gio, Clutter } = imports.gi;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { getMetadata, getPlayers, getPlaybackStatus, playbackAction } =
    Me.imports.dbus;

// User-defined settings

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
    mouseActionsLeftClick,
    mouseActionsRightClick,
    elementOrder;

// Global variables

let currentPlayer, playerIcon, playerState, displayText;
let onUpdateDelayChanged,
    onMaxLengthChanged,
    onHideTrackNameChanged,
    onHidePlayerIconChanged,
    onHideControlsChanged,
    onHideSeperatorsChanged,
    onExtensionPositionChanged,
    onExtensionIndexChanged,
    onColoredPlayerIconChanged,
    onSepCharsChanged,
    onMouseActionsChanged,
    onShowAllOnHoverChanged,
    onElementOrderChanged;

let mainLoop;
let settings;

// Tracking variables

let lastPlayer,
    lastMetadata,
    lastState,
    lastPlayerChanged,
    lastStateChanged,
    lastMetadataChanged,
    mouseHovered,
    contentRemoved;

// UI elements

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

// Constants

const playerIcons = {
    default: "audio-x-generic-symbolic",
    chromium: "chromium",
    firefox: "firefox",
    rhythmbox: "rhythmbox",
    spotify: "spotify",
    vlc: "vlc",
};

const positions = {
    left: "_leftBox",
    center: "_centerBox",
    right: "_rightBox",
};

const playbackActions = {
    none: () => {},
    toggle_play: () => {
        if (playerState === "Playing") {
            buttonToggle.set_child(iconPause);
            playerState = "Paused";
        } else {
            buttonToggle.set_child(iconPlay);
            playerState = "Playing";
        }
        playbackAction("PlayPause", currentPlayer);
    },
    play: () => {
        playbackAction("Play", currentPlayer);
    },
    pause: () => {
        playbackAction("Pause", currentPlayer);
    },
    next: () => {
        playbackAction("Next", currentPlayer);
    },
    prev: () => {
        playbackAction("Previous", currentPlayer);
    },
};

// Performs corresponding mouse action
const _mouseAction = (event) => {
    // log("came here");
    // log(event.pseudo_class);
    if (event.pseudo_class && event.pseudo_class.includes("active")) {
        // log(mouseActionsLeftClick);
        // log("Came here but upper case");
        playbackActions[mouseActionsLeftClick]();
    } else {
        // log("Doesn't include");
        // log(mouseActionsRightClick);
        playbackActions[mouseActionsRightClick]();
    }
};

// Reset variables variables

const resetData = () => {
    currentPlayer = undefined;
    playerIcon = undefined;
    playerState = undefined;
    displayText = undefined;
    lastPlayer = undefined;
    lastMetadata = undefined;
    lastState = undefined;
    lastPlayerChanged = undefined;
    lastStateChanged = undefined;
    lastMetadataChanged = undefined;
};

// Other utility methods

const updatePlayerIconEffects = () => {
    if (coloredPlayerIcon) {
        iconPlayer.clear_effects();
        iconPlayer.set_style("padding: 0; -st-icon-style: requested");
    } else {
        iconPlayer.set_style("padding: 0; -st-icon-style: symbolic");
        iconPlayer.add_effect(new Clutter.DesaturateEffect());
    }
};

// Housekeeping methods

const addContent = () => {
    // let currentIndex;
    // log(`Adding to ${extensionPosition} box`);
    if (contentRemoved) {
        let currentIndex = 0;
        elementOrder.forEach((element) => {
            // Add player icon
            if (element === "icon" && !hidePlayerIcon) {
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonPlayer,
                    extensionIndex + currentIndex
                );
                currentIndex++;
            }
            // Add opening seperator
            if (element === "title" && !hideTrackName) {
                if (!hideSeperators) {
                    Main.panel[
                        positions[extensionPosition]
                    ].insert_child_at_index(
                        labelSeperatorStart,
                        extensionIndex + currentIndex
                    );
                    currentIndex++;
                }
                // Add track title

                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonLabel,
                    extensionIndex + currentIndex
                );
                currentIndex++;

                // Add closing seperator
                if (!hideSeperators) {
                    Main.panel[
                        positions[extensionPosition]
                    ].insert_child_at_index(
                        labelSeperatorEnd,
                        extensionIndex + currentIndex
                    );
                    currentIndex++;
                }
            }
            // Add controls
            if (element === "controls" && !hideControls) {
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonPrev,
                    extensionIndex + currentIndex
                );
                currentIndex++;

                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonToggle,
                    extensionIndex + currentIndex
                );
                currentIndex++;
                Main.panel[positions[extensionPosition]].insert_child_at_index(
                    buttonNext,
                    extensionIndex + currentIndex
                );
                currentIndex++;
            }
        });
        contentRemoved = false;
    }
};

const removeContent = () => {
    // extensionPosition, extensionPosition Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah
    // log(`Removing from ${extensionPosition} box`);

    if (!contentRemoved) {
        Main.panel[positions[extensionPosition]].remove_actor(buttonNext);
        Main.panel[positions[extensionPosition]].remove_actor(buttonToggle);
        Main.panel[positions[extensionPosition]].remove_actor(buttonPrev);
        Main.panel[positions[extensionPosition]].remove_actor(buttonLabel);
        Main.panel[positions[extensionPosition]].remove_actor(
            labelSeperatorEnd
        );
        Main.panel[positions[extensionPosition]].remove_actor(
            labelSeperatorStart
        );
        Main.panel[positions[extensionPosition]].remove_actor(buttonPlayer);
        contentRemoved = true;
    }
};

// Utility methods

const updateMetadata = async () => {
    // log("Updating metadata");
    try {
        playersList = await getPlayers();
        if (playersList.length > 0) {
            let playerStateMap = [];
            let playerDataMap = {};
            for (let i = 0; i <= playersList.length; i++) {
                player = playersList[i];
                if (player) {
                    _playerStatePromise = getPlaybackStatus(player);
                    _metadataPromise = getMetadata(player);
                    [_playerState, [_title, _artist, _url]] = await Promise.all(
                        [_playerStatePromise, _metadataPromise]
                    );
                    if (_title || _url) {
                        playerStateMap.push([player, _playerState]);
                        playerDataMap[player] = {
                            _title: _title || _url,
                            _artist,
                            _playerState,
                        };
                    }
                }
            }

            let playingPlayers = playerStateMap.filter(([player, state]) => {
                if (state === "Playing") {
                    return true;
                }
                return false;
            });

            if (playingPlayers.length > 0) {
                if (contentRemoved) {
                    addContent();
                    contentRemoved = false;
                }
                player = playingPlayers[0][0];
                updateData(
                    player,
                    playerDataMap[player]._playerState,
                    playerDataMap[player]._title,
                    playerDataMap[player]._artist
                );
            } else if (playerStateMap.length > 0) {
                if (contentRemoved) {
                    addContent();
                    contentRemoved = false;
                }
                player = playerStateMap[0][0];
                updateData(
                    player,
                    playerDataMap[player]._playerState,
                    playerDataMap[player]._title,
                    playerDataMap[player]._artist
                );
            } else {
                removeContent();
                resetData();
            }
        } else {
            removeContent();
            resetData();
        }
    } catch (e) {
        logError(e);
    }
};

const updateData = (player, _playerState, _title, _artist) => {
    // log("Updating data");
    let currentMetadata = `${_title}${_artist ? " - " + _artist : ""}`;
    let splittedPlayer = player.split(".");
    if (lastPlayer !== player) {
        // log("Updating player");
        currentPlayer = player;
        lastPlayer = player;
        playerIcon = playerIcons["default"];
        for ([key, value] of Object.entries(playerIcons)) {
            if (splittedPlayer.includes(key)) {
                playerIcon = playerIcons[key];
                break;
            }
        }
        lastPlayerChanged = true;
    }
    if (lastState !== _playerState) {
        // log("Updating player state");
        playerState = _playerState;
        lastState = _playerState;
        lastStateChanged = true;
    }
    if (currentMetadata !== lastMetadata) {
        // log("Updating player metadata");
        lastMetadata = currentMetadata;
        displayText = currentMetadata;
        lastMetadataChanged = true;
    }
    if (lastMetadata.length > maxDisplayLength && maxDisplayLength !== 0) {
        if (mouseHovered && showAllOnHover) {
            // log("Mouse hovered...");
            displayText = lastMetadata;
            // let diff = lastMetadata.length - maxDisplayLength;
            // displayText =
            //     "..." +
            //     lastMetadata.substr(lastMetadata.length - diff - 3) +
            //     " ".repeat(maxDisplayLength - diff);
            // log(displayText.length);
        } else {
            displayText =
                lastMetadata.substring(0, maxDisplayLength - 3) + "...";
            // log(displayText.length);
        }
    } else {
        displayText = lastMetadata;
    }
};

const updateContent = () => {
    if (lastStateChanged) {
        if (playerState === "Playing") {
            buttonToggle.set_child(iconPause);
        } else {
            buttonToggle.set_child(iconPlay);
        }
        lastStateChanged = false;
    }
    if (lastPlayerChanged) {
        iconPlayer.set_icon_name(playerIcon);
        lastPlayerChanged = false;
    }
    if (lastMetadataChanged) {
        buttonLabel.set_label(`${displayText}`);
    }
};

const startMainLoop = () => {
    if (updateDelay < 50) {
        updateDelay = 50;
    }
    mainLoop = Mainloop.timeout_add(updateDelay, () => {
        (async () => {
            // startTime = Date.now();
            await updateMetadata();
            updateContent();
        })();
        return true;
    });
};

// Lifecycle methods

const init = () => {
    contentRemoved = true;
};

const enable = () => {
    // Initialize settings

    settings = ExtensionUtils.getSettings();

    onUpdateDelayChanged = settings.connect("changed::update-delay", () => {
        updateDelay = settings.get_int("update-delay");
        Mainloop.source_remove(mainLoop);
        startMainLoop();
    });

    onMaxLengthChanged = settings.connect("changed::max-text-length", () => {
        maxDisplayLength = settings.get_int("max-text-length");
    });

    onHideTrackNameChanged = settings.connect("changed::hide-text", () => {
        hideTrackName = settings.get_boolean("hide-text");
        removeContent();
        addContent();
    });

    onHidePlayerIconChanged = settings.connect(
        "changed::hide-player-icon",
        () => {
            hidePlayerIcon = settings.get_boolean("hide-player-icon");
            removeContent();
            addContent();
        }
    );

    onExtensionIndexChanged = settings.connect(
        "changed::extension-index",
        () => {
            extensionIndex = settings.get_int("extension-index");
            removeContent();
            addContent();
        }
    );

    onExtensionPositionChanged = settings.connect(
        "changed::extension-position",
        () => {
            removeContent();
            extensionPosition = settings.get_string("extension-position");
            addContent();
        }
    );

    onHideControlsChanged = settings.connect(
        "changed::hide-control-icons",
        () => {
            hideControls = settings.get_boolean("hide-control-icons");
            removeContent();
            addContent();
        }
    );

    onHideSeperatorsChanged = settings.connect(
        "changed::hide-seperators",
        () => {
            hideSeperators = settings.get_boolean("hide-seperators");
            removeContent();
            addContent();
        }
    );

    onMouseActionsChanged = settings.connect("changed::mouse-actions", () => {
        mouseActions = settings.get_strv("mouse-actions");
        mouseActionsLeftClick = mouseActions[0];
        mouseActionsRightClick = mouseActions[1];
        // log(mouseActionsRightClick);
    });

    onColoredPlayerIconChanged = settings.connect(
        "changed::colored-player-icon",
        () => {
            coloredPlayerIcon = settings.get_boolean("colored-player-icon");
            log(`Colirng playeer icon ${coloredPlayerIcon}`);
            updatePlayerIconEffects();
        }
    );

    onShowAllOnHoverChanged = settings.connect(
        "changed::show-all-on-hover",
        () => {
            showAllOnHover = settings.get_boolean("show-all-on-hover");
        }
    );

    onSepCharsChanged = settings.connect("changed::seperator-chars", () => {
        sepChars = settings.get_strv("seperator-chars");
        labelSeperatorStart.set_text(sepChars[0]);
        labelSeperatorEnd.set_text(sepChars[1]);
    });

    onElementOrderChanged = settings.connect("changed::element-order", () => {
        elementOrder = settings.get_strv("element-order");
        removeContent();
        addContent();
    });

    mouseActions = settings.get_strv("mouse-actions");
    sepChars = settings.get_strv("seperator-chars");
    elementOrder = settings.get_strv("element-order");

    updateDelay = settings.get_int("update-delay");
    maxDisplayLength = settings.get_int("max-text-length");
    hideTrackName = settings.get_boolean("hide-text");
    hidePlayerIcon = settings.get_boolean("hide-player-icon");
    hideControls = settings.get_boolean("hide-control-icons");
    extensionIndex = settings.get_int("extension-index");
    extensionPosition = settings.get_string("extension-position");
    coloredPlayerIcon = settings.get_boolean("colored-player-icon");
    showAllOnHover = settings.get_boolean("show-all-on-hover");
    mouseActionsLeftClick = mouseActions[0];
    mouseActionsRightClick = mouseActions[1];
    hideSeperators = settings.get_boolean("hide-seperators");

    // UI Elements

    buttonToggle = new St.Button({ style_class: "panel-button" });
    buttonNext = new St.Button({
        style_class: "panel-button",
        style: "padding-right: 3px; padding-left: 0px;",
    });
    buttonPrev = new St.Button({
        style_class: "panel-button",
        style: "padding-left: 3px; padding-right: 0px;",
    });
    buttonLabel = new St.Button({
        track_hover: false,
        style_class: "panel-button",
        style: "padding: 0px 3px;",
        label: "No player found",
    });
    buttonPlayer = new St.Button({
        style_class: "panel-button",
        track_hover: false,
        style: "padding: 0px 3px;",
    });

    iconPlay = new St.Icon({
        icon_name: "media-playback-start-symbolic",
        style_class: "system-status-icon",
        style: "padding: 0px;",
    });
    iconPause = new St.Icon({
        icon_name: "media-playback-pause-symbolic",
        style_class: "system-status-icon",
        style: "padding: 0px;",
    });
    iconNext = new St.Icon({
        icon_name: "media-skip-forward-symbolic",
        style_class: "system-status-icon",
        style: "padding: 0px;",
    });
    iconPrev = new St.Icon({
        icon_name: "media-skip-backward-symbolic",
        style_class: "system-status-icon",
        style: "padding: 0px;",
    });
    iconPlayer = new St.Icon({
        icon_name: playerIcons.default,
        icon_size: 16,
    });

    labelSeperatorStart = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style: "padding-left: 3px; padding-right: 0px;",
        style_class: "panel-button",
    });

    labelSeperatorEnd = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style: "padding-right: 3px; padding-left: 0px;",
        style_class: "panel-button",
    });

    // Set childs and bind methods
    buttonNext.set_child(iconNext);
    buttonNext.connect("button-release-event", playbackActions.next);

    buttonPrev.set_child(iconPrev);
    buttonPrev.connect("button-release-event", playbackActions.prev);

    buttonToggle.set_child(iconPlay);
    buttonToggle.connect("button-release-event", playbackActions.toggle_play);

    buttonLabel.connect("button-release-event", _mouseAction);
    buttonLabel.connect("enter-event", () => {
        mouseHovered = true;
    });
    buttonLabel.connect("leave-event", () => {
        mouseHovered = false;
    });

    buttonPlayer.set_child(iconPlayer);
    buttonPlayer.connect("button-release-event", _mouseAction);

    labelSeperatorStart.set_text(sepChars[0]);
    labelSeperatorEnd.set_text(sepChars[1]);

    // Initialize content
    updatePlayerIconEffects();

    // Reset data and add content to the panel
    resetData();
    addContent();

    // Start the main loop
    startMainLoop();
};

const disable = () => {
    Mainloop.source_remove(mainLoop);

    settings.disconnect(onMaxLengthChanged);
    settings.disconnect(onUpdateDelayChanged);
    settings.disconnect(onHideControlsChanged);
    settings.disconnect(onHidePlayerIconChanged);
    settings.disconnect(onHideTrackNameChanged);
    settings.disconnect(onHideSeperatorsChanged);
    settings.disconnect(onExtensionIndexChanged);
    settings.disconnect(onExtensionPositionChanged);
    settings.disconnect(onMouseActionsChanged);
    settings.disconnect(onColoredPlayerIconChanged);
    settings.disconnect(onSepCharsChanged);
    settings.disconnect(onShowAllOnHoverChanged);

    buttonNext.destroy();
    buttonPrev.destroy();
    buttonToggle.destroy();
    iconNext.destroy();
    iconPause.destroy();
    iconPlay.destroy();
    iconPrev.destroy();
    labelSeperatorEnd.destroy();
    labelSeperatorStart.destroy();
    buttonLabel.destroy();

    removeContent();
};
