/**
 * @param {...unknown} [args]
 * @returns {void}
 */
export const debugLog = (...args) => {
    console.debug("[Media Controls]", ...args);
};

/**
 * @param {...unknown} [args]
 * @returns {void}
 */
export const errorLog = (...args) => {
    console.error("[Media Controls]", ...args);
};

/**
 * @template T
 * @param {T} enumObject
 * @param {number} index
 * @returns {any}
 */
export const enumValueByIndex = (enumObject, index) => {
    return Object.values(enumObject)[index];
};

/**
 * @template T
 * @param {T} enumObject
 * @param {unknown} value
 * @returns {string}
 */
export const enumKeyByValue = (enumObject, value) => {
    return Object.keys(enumObject).find((key) => enumObject[key] === value);
};

/**
 * Formats Seconds into HH:MM:SS or MM:SS
 * @param {number} secondsInput
 * @returns {string}
 */
export const formatTime = (secondsInput) => {
    // Handle invalid inputs
    if (typeof secondsInput !== "number" || isNaN(secondsInput) || secondsInput < 0) {
        return "00:00";
    }

    const totalSeconds = Math.floor(secondsInput);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const secondsStr = String(seconds).padStart(2, "0");
    const minutesStr = String(minutes).padStart(2, "0");

    if (hours > 0) {
        const hoursStr = String(hours).padStart(2, "0");
        return `${hoursStr}:${minutesStr}:${secondsStr}`;
    }

    return `${minutesStr}:${secondsStr}`;
};

// Deprecated alias just in case other files use it, but redirects to formatTime logic
export const msToHHMMSS = (ms) => {
    return formatTime(ms / 1000); 
};