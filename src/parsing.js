// src/parsing.js

// Zero-dependency time parser: handles 2:30PM, 14:30, 9am
export function parseTime(raw) {
    const match = raw.trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const period = match[3]?.toLowerCase();

    if (hours > 23 || minutes > 59) return null;

    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    return { hours, minutes };
}

// Zero-dependency date parser honoring culture conventions
export function parseDate(raw, culture, offsetSeconds) {
    const parts = raw.trim().split(/[/\-\.\s]+/);
    if (parts.length < 2) return null;

    // Get order (e.g. ['month', 'day', 'year'] or ['day', 'month', 'year'])
    const formatter = new Intl.DateTimeFormat(culture);
    const order = formatter.formatToParts(new Date(2000, 0, 2))
        .filter((p) => ["year", "month", "day"].includes(p.type))
        .map((p) => p.type);

    let month, day, year;
    const hasYear = parts.length >= 3;

    if (hasYear) {
        year = parseInt(parts[order.indexOf("year")], 10);
        if (year < 100) year += year > 50 ? 1900 : 2000;
        month = parseInt(parts[order.indexOf("month")], 10);
        day = parseInt(parts[order.indexOf("day")], 10);
    } else {
        // Only 2 parts, figure out which is month and which is day
        const mIdx = Math.min(order.indexOf("month"), order.indexOf("day"));
        const dIdx = Math.max(order.indexOf("month"), order.indexOf("day"));
        month = parseInt(parts[mIdx], 10);
        day = parseInt(parts[dIdx], 10);
    }

    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Find "today's" year in the user's local time zone to handle "next occurrence"
    const localNow = new Date(Date.now() + offsetSeconds * 1000);

    if (!hasYear) {
        year = localNow.getUTCFullYear();

        // If the date has passed this year, bump to next year
        const targetFaceValueMs = Date.UTC(year, month - 1, day, 23, 59, 59);
        if (targetFaceValueMs < localNow.getTime()) {
            year += 1;
        }
    }

    return { year, month, day, hasYear };
}

export function buildUnixTimestamp(time, date, offsetSeconds) {
    const localNow = new Date(Date.now() + offsetSeconds * 1000);

    const y = date?.year ?? localNow.getUTCFullYear();
    const m = date ? date.month - 1 : localNow.getUTCMonth();
    const d = date?.day ?? localNow.getUTCDate();

    // Construct the target time *as if* it were UTC
    const faceValueUTC = Date.UTC(y, m, d, time.hours, time.minutes, 0);

    // Subtract the offset to get the true absolute moment in time
    return Math.floor(faceValueUTC / 1000) - offsetSeconds;
}