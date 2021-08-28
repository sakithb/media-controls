// Imports

const { St, GLib, Gio, Clutter } = imports.gi;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { getMetadata, getPlayers, getPlaybackStatus, playbackAction } =
    Me.imports.dbus;

// User-defined settings

let maxDisplayLength, updateDelay;

// Global variables

let currentPlayer, playerIcon, playerState, displayText;
let onUpdateDelayChanged, onMaxLengthChanged;
let mainLoop;
let settings;

// Tracking variables

let lastPlayer,
    lastMetadata,
    lastState,
    lastMetaDataChanged,
    lastStateChanged,
    contentRemoved;

// Constants

const playerIcons = {
    default: "",
    chrom: "",
    firefox: "",
    spotify: "",
};

// UI elements

let buttonNext,
    buttonPrev,
    buttonToggle,
    iconNext,
    iconPause,
    iconPlay,
    iconPrev,
    labelText;

// Button trigger methods

const _playerToggle = () => {
    if (playerState === "Playing") {
        buttonToggle.set_child(iconPause);
        playerState = "Paused";
    } else {
        buttonToggle.set_child(iconPlay);
        playerState = "Playing";
    }
    playbackAction("PlayPause", currentPlayer);
};

const _playerNext = () => {
    playbackAction("Next", currentPlayer);
};

const _playerPrev = () => {
    playbackAction("Previous", currentPlayer);
};

// Housekeeping methods

const addContent = () => {
    Main.panel._centerBox.insert_child_at_index(buttonNext, 0);
    Main.panel._centerBox.insert_child_at_index(buttonToggle, 0);
    Main.panel._centerBox.insert_child_at_index(buttonPrev, 0);
    Main.panel._centerBox.insert_child_at_index(labelText, 0);
};

const removeContent = () => {
    Main.panel._centerBox.remove_actor(buttonNext);
    Main.panel._centerBox.remove_actor(buttonToggle);
    Main.panel._centerBox.remove_actor(buttonPrev);
    Main.panel._centerBox.remove_actor(labelText);
};

// Utility methods

const updateData = (player, _playerState, _title, _artist) => {
    if (lastPlayer !== player) {
        currentPlayer = player;
        playerIcon = playerIcons["default"];
        for ([key, value] of Object.entries(playerIcons)) {
            if (player.includes(key)) {
                playerIcon = playerIcons[key];
                break;
            }
        }
    }
    if (lastState !== _playerState) {
        playerState = _playerState;
        lastStateChanged = true;
    }
    if ([_title, _artist] !== lastMetadata) {
        displayText = `${_title}${_artist ? " - " + _artist : ""}`;
        displayText =
            displayText.length > maxDisplayLength
                ? displayText.substring(0, maxDisplayLength - 3) + "..."
                : displayText;
        lastMetaDataChanged = true;
    }
};

const updatePlayer = async () => {
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
        // logError(e);
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
    if (lastMetaDataChanged) {
        labelText.set_text(`${playerIcon}  | ${displayText} |`);
        lastMetaDataChanged = false;
    }
};

// Lifecycle methods

const init = () => {};

const enable = () => {
    // Initialize settings
    let schemaDir = Me.dir.get_child("schemas");
    if (schemaDir.query_exists(null)) {
        let gschema = Gio.SettingsSchemaSource.new_from_directory(
            schemaDir.get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );
    } else {
        let gschema = Gio.SettingsSchemaSource.get_default();
    }

    settings = new Gio.Settings({
        settings_schema: gschema.lookup(
            "org.gnome.shell.extensions.mediacontrols",
            true
        ),
    });

    onUpdateDelayChanged = settings.connect("changed::update-delay", () => {
        updateDelay = settings.get_int("update-delay");
        Mainloop.source_remove(mainLoop);
        mainLoop = Mainloop.timeout_add(updateDelay, () => {
            updatePlayers();
            updatePlayer();
            updateContent();
            return true;
        });
        // log(`Updated setting "updateDelay": ${updateDelay}`);
    });

    onMaxLengthChanged = settings.connect("changed::max-display-length", () => {
        maxDisplayLength = settings.get_int("max-display-length");
        // log(`Updated setting "maxDisplayLength": ${maxDisplayLength}`);
    });

    updateDelay = settings.get_int("update-delay");
    maxDisplayLength = settings.get_int("max-display-length");

    // UI Elements

    buttonToggle = new St.Button({ style_class: "panel-button" });
    buttonNext = new St.Button({ style_class: "panel-button" });
    buttonPrev = new St.Button({ style_class: "panel-button" });

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

    labelText = new St.Label({
        text: "No player found",
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "system-status-icon",
    });

    // Set childs and bind methods
    buttonNext.set_child(iconNext);
    buttonNext.connect("button-press-event", _playerNext);

    buttonPrev.set_child(iconPrev);
    buttonPrev.connect("button-press-event", _playerPrev);

    buttonToggle.set_child(iconPlay);
    buttonToggle.connect("button-press-event", _playerToggle);

    // Add content to the panel
    addContent();

    // Start the main loop
    mainLoop = Mainloop.timeout_add(updateDelay, () => {
        updatePlayer().then(() => {
            updateContent();
        });
        return true;
    });
};

const disable = () => {
    Mainloop.source_remove(mainLoop);

    settings.disconnect(onMaxLengthChanged);
    settings.disconnect(onUpdateDelayChanged);

    buttonNext.destroy();
    buttonPrev.destroy();
    buttonToggle.destroy();
    iconNext.destroy();
    iconPause.destroy();
    iconPlay.destroy();
    iconPrev.destroy();
    labelText.destroy();

    removeContent();
};
