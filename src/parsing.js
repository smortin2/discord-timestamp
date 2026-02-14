import { DateTime } from "luxon";

// Parse time string using Luxon's flexible parsing
export function parseTime(raw) {
    const cleaned = raw.trim();

    const formats = [
        "h:mma",     // 2:30PM
        "h:mm a",    // 2:30 PM
        "h:mma",     // 2:30pm
        "HH:mm",     // 14:30
        "H:mm",      // 9:05
    ];

    for (const fmt of formats) {
        const dt = DateTime.fromFormat(cleaned, fmt);
        if (dt.isValid) {
            return { hours: dt.hour, minutes: dt.minute };
        }
    }

    return null;
}

// Parse date respecting locale conventions, defaulting to next occurrence if year omitted
export function parseDate(raw, culture, referenceTimezone) {
    const cleaned = raw.trim();

    // Determine date component order from culture
    const order = getDateComponentOrder(culture);

    // Try parsing with various separators and formats
    const parsedDate = tryParseWithOrder(cleaned, order);

    if (!parsedDate) {
        return null;
    }

    // If no year provided, find next occurrence of this month/day
    if (!parsedDate.hasYear) {
        return resolveNextOccurrence(parsedDate.month, parsedDate.day, referenceTimezone);
    }

    return parsedDate;
}

function getDateComponentOrder(culture) {
    const formatter = new Intl.DateTimeFormat(culture, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(new Date(2000, 0, 2));
    return parts.filter((p) => ["year", "month", "day"].includes(p.type)).map((p) => p.type);
}

function tryParseWithOrder(raw, order) {
    const parts = raw.split(/[/\-\.\s]+/);

    if (parts.length === 2) {
        // No year provided: M/D or D/M depending on culture
        const monthIndex = order.indexOf("month");
        const dayIndex = order.indexOf("day");

        const month = parseInt(parts[Math.min(monthIndex, dayIndex)], 10);
        const day = parseInt(parts[Math.max(monthIndex, dayIndex)], 10);

        if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return { month, day, hasYear: false };
        }
    }

    if (parts.length === 3) {
        // Full date with year
        const mapped = {};
        for (let i = 0; i < order.length && i < parts.length; i++) {
            mapped[order[i]] = parseInt(parts[i], 10);
        }

        if (mapped.year < 100) {
            mapped.year += mapped.year > 50 ? 1900 : 2000;
        }

        if (
            mapped.year &&
            mapped.month >= 1 &&
            mapped.month <= 12 &&
            mapped.day >= 1 &&
            mapped.day <= 31
        ) {
            const test = new Date(mapped.year, mapped.month - 1, mapped.day);
            if (
                test.getFullYear() === mapped.year &&
                test.getMonth() === mapped.month - 1 &&
                test.getDate() === mapped.day
            ) {
                return { year: mapped.year, month: mapped.month, day: mapped.day, hasYear: true };
            }
        }
    }

    // Try Luxon's flexible parsing as fallback
    const luxonAttempt = DateTime.fromISO(raw);
    if (luxonAttempt.isValid) {
        return { year: luxonAttempt.year, month: luxonAttempt.month, day: luxonAttempt.day, hasYear: true };
    }

    return null;
}

// Find the next occurrence of month/day from now in the user's timezone
function resolveNextOccurrence(month, day, timezone) {
    const now = DateTime.now().setZone(timezone);

    // Try this year first
    let candidate = DateTime.fromObject({ year: now.year, month, day }, { zone: timezone });

    // If the date has already passed this year, use next year
    if (candidate < now) {
        candidate = DateTime.fromObject({ year: now.year + 1, month, day }, { zone: timezone });
    }

    return { year: candidate.year, month: candidate.month, day: candidate.day, hasYear: true };
}

// Build a Unix timestamp from parsed time and date in the user's timezone
export function buildUnixTimestamp(time, date, ianaTimezone) {
    const now = DateTime.now().setZone(ianaTimezone);

    const year = date?.year || now.year;
    const month = date?.month || now.month;
    const day = date?.day || now.day;

    const dt = DateTime.fromObject(
        { year, month, day, hour: time.hours, minute: time.minutes, second: 0 },
        { zone: ianaTimezone }
    );

    if (!dt.isValid) {
        return null;
    }

    return Math.floor(dt.toSeconds());
}