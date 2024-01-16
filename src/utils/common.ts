const DEBUG = true;

export const enumValueByIndex = <T>(enumObject: T, index: number) => {
    return Object.values(enumObject)[index];
};

export const enumKeyByValue = <T>(enumObject: T, value: unknown) => {
    return Object.keys(enumObject).find((key) => enumObject[key] === value);
};

export const debugLog = (...args: unknown[]) => {
    if (DEBUG) {
        console.log("[Media Controls]", ...args);
    }
};

export const errorLog = (...args: unknown[]) => {
    console.error("[Media Controls]", "Error:", ...args);
};

export const handleError = (error: unknown): null => {
    errorLog(error);
    return null;
};

export const msToHHMMSS = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);

    const secondsString = String(seconds % 60).padStart(2, "0");
    const minutesString = String(minutes % 60).padStart(2, "0");
    const hoursString = String(hours).padStart(2, "0");

    if (hours > 0) {
        return `${hoursString}:${minutesString}:${secondsString}`;
    } else {
        return `${minutesString}:${secondsString}`;
    }
};
