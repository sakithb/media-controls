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
    extensionPosition,
    extensionIndex,
    coloredPlayerIcon,
    animateText,
    mouseActionsLeftClick,
    mouseActionsRightClick;

// Global variables

let currentPlayer, playerIcon, playerState, displayText;
let onUpdateDelayChanged,
    onMaxLengthChanged,
    onHideTrackNameChanged,
    onHidePlayerIconChanged,
    onHideControlsChanged,
    onExtensionPositionChanged,
    onExtensionIndexChanged,
    onColoredPlayerIconChanged,
    onAnimateTextChanged,
    onMouseActionsLeftClickChanged,
    onMouseActionsRightClickChanged;

let mainLoop;
let settings;
// Tracking variables

let lastPlayer,
    lastMetadata,
    lastState,
    lastPlayerChanged,
    lastStateChanged,
    animateTextCount,
    contentRemoved;

// Constants

const playerIcons = {
    default: "audio-x-generic-symbolic",
    chromium: "chromium",
    firefox: "firefox",
    rhythmbox: "rhythmbox",
    spotify: "spotify",
};

const positions = {
    left: "_leftBox",
    center: "_centerBox",
    right: "_rightBox",
};

// UI elements

let buttonNext,
    buttonPrev,
    buttonToggle,
    buttonLabel,
    iconNext,
    iconPause,
    iconPlay,
    iconPrev,
    iconPlayer,
    labelText,
    labelSeperatorStart,
    labelSeperatorEnd;

// Button trigger methods

const _actionToggle = () => {
    if (playerState === "Playing") {
        buttonToggle.set_child(iconPause);
        playerState = "Paused";
    } else {
        buttonToggle.set_child(iconPlay);
        playerState = "Playing";
    }
    playbackAction("PlayPause", currentPlayer);
};

const _actionNext = () => {
    playbackAction("Next", currentPlayer);
};

const _actionPrev = () => {
    playbackAction("Previous", currentPlayer);
};

const _mouseAction = (event) => {
    if (event.pseudo_class === "active") {
        mouseActions[mouseActionsLeftClick]();
    } else {
        mouseActions[mouseActionsRightClick]();
    }
};

const mouseActions = {
    none: () => {},
    toggle_play: _actionToggle,
    play: () => {
        playbackAction("Play", currentPlayer);
    },
    pause: () => {
        playbackAction("Pause", currentPlayer);
    },
    next: _actionNext,
    prev: _actionPrev,
};

// Other utility methods

const updatePlayerIconEffects = () => {
    if (coloredPlayerIcon) {
        iconPlayer.clear_effects();
        iconPlayer.set_style("padding-right: 5px; -st-icon-style: requested");
    } else {
        iconPlayer.set_style("padding-right: 5px; -st-icon-style: symbolic");
        iconPlayer.add_effect(new Clutter.DesaturateEffect());
    }
};

const scrollText = () => {
    // let difference = lastMetadata.length - maxDisplayLength;
    // log("Animating text", difference, animateTextCount);
    // if (difference <= 0) {
    //     displayText = lastMetadata;
    // }
    // displayText = lastMetadata.substr(animateTextCount, difference);
    // if (displayText.length < maxDisplayLength) {
    //     displayText =
    //         displayText + " ".repeat(maxDisplayLength - displayText.length);
    // }
    // animateTextCount++;
};

// Housekeeping methods

const addContent = () => {
    // let currentIndex;
    log(`Adding to ${extensionPosition} box`);
    let currentIndex = 0;
    if (!hidePlayerIcon) {
        Main.panel[positions[extensionPosition]].insert_child_at_index(
            iconPlayer,
            extensionIndex + currentIndex
        );
        currentIndex++;
    }
    if (!hideTrackName) {
        Main.panel[positions[extensionPosition]].insert_child_at_index(
            labelSeperatorStart,
            extensionIndex + currentIndex
        );
        currentIndex++;
        Main.panel[positions[extensionPosition]].insert_child_at_index(
            buttonLabel,
            extensionIndex + currentIndex
        );
        currentIndex++;
        Main.panel[positions[extensionPosition]].insert_child_at_index(
            labelSeperatorEnd,
            extensionIndex + currentIndex
        );
        currentIndex++;
    }
    if (!hideControls) {
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
};

const removeContent = () => {
    // extensionPosition, extensionPosition Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah
    log(`Removing from ${extensionPosition} box`);
    Main.panel[positions[extensionPosition]].remove_actor(buttonNext);
    Main.panel[positions[extensionPosition]].remove_actor(buttonToggle);
    Main.panel[positions[extensionPosition]].remove_actor(buttonPrev);
    Main.panel[positions[extensionPosition]].remove_actor(buttonLabel);
    Main.panel[positions[extensionPosition]].remove_actor(iconPlayer);
};

// Utility methods

const updateData = (player, _playerState, _title, _artist) => {
    if (lastPlayer !== player) {
        log("Updating player");
        currentPlayer = player;
        lastPlayer = player;
        playerIcon = playerIcons["default"];
        for ([key, value] of Object.entries(playerIcons)) {
            if (player.includes(key)) {
                playerIcon = playerIcons[key];
                break;
            }
        }
        lastPlayerChanged = true;
    }
    if (lastState !== _playerState) {
        log("Updating State");
        playerState = _playerState;
        lastState = _playerState;
        lastStateChanged = true;
    }
    if (_title + _artist !== lastMetadata) {
        log("Updating Metadata");
        lastMetadata = _title + _artist;
        animateTextCount = 0;
        displayText = `${_title}${_artist ? " - " + _artist : ""}`;
    }
    if (lastMetadata.length > maxDisplayLength) {
        log("Trimming text");
        // if (animateText) {
        //     scrollText();
        // } else {
        // }
        displayText = displayText.substring(0, maxDisplayLength - 3) + "...";
    }
};

const updateMetadata = async () => {
    try {
        // log("Determining current player");
        playersList = await getPlayers();
        if (playersList.length > 0) {
            let playerStateMap = [];
            let playerDataMap = {};
            // log("Starting for loop");
            // log(`Player list - ${playersList}`);
            for (let i = 0; i <= playersList.length; i++) {
                player = playersList[i];
                if (player) {
                    _playerStatePromise = getPlaybackStatus(player);
                    _metadataPromise = getMetadata(player);
                    // log("Resolving promises");
                    [_playerState, [_title, _artist]] = await Promise.all([
                        _playerStatePromise,
                        _metadataPromise,
                    ]);
                    // log("Promises resolved");
                    if (_title) {
                        playerStateMap.push([player, _playerState]);
                        playerDataMap[player] = {
                            _title,
                            _artist,
                            _playerState,
                        };
                    }
                }
            }

            // log(`${playerStateMap.length} eligible players found!`);
            let playingPlayers = playerStateMap.filter(([player, state]) => {
                if (state === "Playing") {
                    return true;
                }
                return false;
            });
            // log(`${playingPlayers.length} playing players found!`);
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
                contentRemoved = true;
            }
        } else {
            removeContent();
            contentRemoved = true;
        }
    } catch (e) {
        logError(e);
    }
};

const updateContent = () => {
    if (lastStateChanged) {
        log("Updating state icon");
        if (playerState === "Playing") {
            buttonToggle.set_child(iconPause);
        } else {
            buttonToggle.set_child(iconPlay);
        }
        lastStateChanged = false;
    }
    if (lastPlayerChanged) {
        log("Updating player icon");
        iconPlayer.set_icon_name(playerIcon);
        lastPlayerChanged = false;
    }
    labelText.set_text(`${displayText}`);
};

// Lifecycle methods

const init = () => {};

const enable = () => {
    // Initialize settings

    settings = ExtensionUtils.getSettings();

    onUpdateDelayChanged = settings.connect("changed::update-delay", () => {
        updateDelay = settings.get_int("update-delay");
        Mainloop.source_remove(mainLoop);
        mainLoop = Mainloop.timeout_add(updateDelay, () => {
            updatePlayers();
            updateMetadata();
            updateContent();
            return true;
        });
        // log(`Updated setting "updateDelay": ${updateDelay}`);
    });

    onMaxLengthChanged = settings.connect("changed::max-text-length", () => {
        maxDisplayLength = settings.get_int("max-text-length");
        // buttonLabel.set_style(
        //     `width: ${maxDisplayLength}px;text-overflow: clip;`
        // );
        // log(`Updated setting "maxDisplayLength": ${maxDisplayLength}`);
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

    onMouseActionsLeftClickChanged = settings.connect(
        "changed::mouse-actions-left",
        () => {
            mouseActionsLeftClick = settings.get_string("mouse-actions-left");
        }
    );

    onMouseActionsRightClickChanged = settings.connect(
        "changed::mouse-actions-right",
        () => {
            mouseActionsRightClick = settings.get_string("mouse-actions-right");
        }
    );

    onColoredPlayerIconChanged = settings.connect(
        "changed::colored-player-icon",
        () => {
            coloredPlayerIcon = settings.get_boolean("colored-player-icon");
            updatePlayerIconEffects();
        }
    );

    onAnimateTextChanged = settings.connect("changed::animate-text", () => {
        animateText = settings.get_boolean("animate-text");
    });

    updateDelay = settings.get_int("update-delay");
    maxDisplayLength = settings.get_int("max-text-length");
    hideTrackName = settings.get_boolean("hide-text");
    hidePlayerIcon = settings.get_boolean("hide-player-icon");
    hideControls = settings.get_boolean("hide-control-icons");
    extensionIndex = settings.get_int("extension-index");
    extensionPosition = settings.get_string("extension-position");
    coloredPlayerIcon = settings.get_boolean("colored-player-icon");
    animateText = settings.get_boolean("animate-text");

    // UI Elements

    buttonToggle = new St.Button({ style_class: "panel-button" });
    buttonNext = new St.Button({ style_class: "panel-button" });
    buttonPrev = new St.Button({ style_class: "panel-button" });
    buttonLabel = new St.Button({ track_hover: false });

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
        icon_name: playerIcons.default,
        icon_size: 16,
        style: "padding-right: 5px;",
    });

    labelText = new St.Label({
        text: "No player found",
        y_align: Clutter.ActorAlign.CENTER,
    });

    labelSeperatorStart = new St.Label({
        text: "|",
        style: "padding-right: 2px;",
        y_align: Clutter.ActorAlign.CENTER,
    });

    labelSeperatorEnd = new St.Label({
        text: "|",
        style: "padding-left: 2px;",
        y_align: Clutter.ActorAlign.CENTER,
    });

    // Set childs and bind methods
    buttonNext.set_child(iconNext);
    buttonNext.connect("button-release-event", _actionNext);

    buttonPrev.set_child(iconPrev);
    buttonPrev.connect("button-release-event", _actionPrev);

    buttonToggle.set_child(iconPlay);
    buttonToggle.connect("button-release-event", _actionToggle);

    buttonLabel.set_child(labelText);
    buttonLabel.connect("button-release-event", _mouseAction);

    // buttonLabel.set_style(`width: ${maxDisplayLength}px;`);

    // Initialize content
    updatePlayerIconEffects();

    // Add content to the panel
    addContent();

    // Start the main loop
    mainLoop = Mainloop.timeout_add(updateDelay, () => {
        updateMetadata().then(() => {
            updateContent();
        });
        return true;
    });
};

const disable = () => {
    Mainloop.source_remove(mainLoop);

    settings.disconnect(onMaxLengthChanged);
    settings.disconnect(onUpdateDelayChanged);
    settings.disconnect(onHideControlsChanged);
    settings.disconnect(onHidePlayerIconChanged);
    settings.disconnect(onHideTrackNameChanged);
    settings.disconnect(onExtensionIndexChanged);
    settings.disconnect(onExtensionPositionChanged);
    settings.disconnect(onMouseActionsLeftClickChanged);
    settings.disconnect(onMouseActionsRightClickChanged);
    settings.disconnect(onColoredPlayerIconChanged);
    settings.disconnect(onAnimateTextChanged);

    buttonNext.destroy();
    buttonPrev.destroy();
    buttonToggle.destroy();
    iconNext.destroy();
    iconPause.destroy();
    iconPlay.destroy();
    iconPrev.destroy();
    labelText.destroy();
    buttonLabel.destroy();

    removeContent();
};
