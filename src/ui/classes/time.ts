export function formatTime(ms: number) {
    const milliseconds = ms % 1000;
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 1000 / 60) % 60;
    const hours = Math.floor(ms / 1000 / 60 / 60);
    let result = "";
    if (hours > 0) {
        result += `${hours}h `;
    }
    if (minutes > 0) {
        result += `${minutes}m `;
    }
    if (seconds > 0) {
        result += `${seconds}s `;
    }
    if (milliseconds > 0) {
        result += `${milliseconds}ms`;
    }
    return result;
}

export function day(offset = 0, hour = 12) {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date.toISOString().split(".")[0];
}

export function dayAsTime(offset = 0, hour = 12) {
    return new Date(day(offset, hour)).getTime();
}

export function getPastDateWarning(date: number) {
    if (new Date(date).getTime() < dayAsTime(0, 0)) {
        return "Date is in the past";
    }
    return null;
}