// src/timezone.js

/**
 * Calculates the exact offset in seconds between the user's local time and UTC.
 * Rounds to the nearest 15 minutes (900 seconds) to match real-world timezones.
 */
export function calculateOffsetSeconds(userHours, userMinutes) {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    const userTotalMins = userHours * 60 + userMinutes;
    const utcTotalMins = utcHours * 60 + utcMinutes;

    // Calculate raw difference in minutes
    let diff = userTotalMins - utcTotalMins;

    // Normalize to a positive modulo [0, 1439] (handles negative JS modulo)
    diff = ((diff % 1440) + 1440) % 1440;

    // Timezones range from -12h (-720m) to +14h (+840m). Shift accordingly.
    if (diff > 840) {
        diff -= 1440;
    }

    // Round to nearest 15 minutes (900 seconds)
    return Math.round(diff / 15) * 900;
}