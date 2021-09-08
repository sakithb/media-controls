const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Mainloop = imports.mainloop;

var {
    loopFinished,
    currentIcon,
    currentLabel,
    currentMetadata,
    currentPlayer,
    sourceChanged,
    iconPlayer,
    addContent,
    buttonLabel,
    currentStatus,
    removeContent,
} = Me.imports.main;

const { getPlayers, getMetadata, getStatus, isValidPlayer, isEqual, getDisplayLabel, saveIcon } =
    Me.imports.utils;

var mainloop;

const _mainLoop = async () => {
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
                            _updateContent();
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
                                _updateContent();
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
                    _updateContent();
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
            _mainLoop();
        }
        return true;
    });
};

const _updateContent = () => {
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
