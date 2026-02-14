import { DateTime } from "luxon";
import timezoneAbbreviations from "timezone-abbreviations";

// Resolve a timezone input to a valid IANA name, with optional index for ambiguous abbreviations
export function resolveTimezone(input, index = null) {
    if (!input) return null;
    const trimmed = input.trim();

    // Try abbreviation lookup first
    const upper = trimmed.toUpperCase();
    const abbrevResults = timezoneAbbreviations[upper];

    if (abbrevResults && abbrevResults.length > 0) {
        const ianaMatches = abbrevResults
            .map((entry) => entry.tz)
            .filter(Boolean);

        if (ianaMatches.length === 0) return null;

        const selectedIndex = index ? Math.max(1, Math.min(index, ianaMatches.length)) - 1 : 0;
        return ianaMatches[selectedIndex];
    }

    // Try UTC offset format like UTC-5, UTC+5:30
    const utcOffsetMatch = trimmed.match(/^UTC([+-]\d{1,2}(?::?\d{2})?)$/i);
    if (utcOffsetMatch) {
        return resolveUtcOffset(utcOffsetMatch[1]);
    }

    // Try as an IANA name directly via Luxon
    const testZone = DateTime.now().setZone(trimmed);
    if (testZone.isValid && testZone.zone.isValid) {
        return trimmed;
    }

    return null;
}

// List all IANA matches for an abbreviation, for display to the user
export function listAbbreviationMatches(abbreviation) {
    const results = timezoneAbbreviations[abbreviation.toUpperCase()];
    if (!results || results.length === 0) return [];
    return results.map((entry) => entry.tz).filter(Boolean);
}

function resolveUtcOffset(offsetString) {
    // Luxon can handle fixed offset zones directly
    const testDt = DateTime.now().setZone(`UTC${offsetString}`);
    if (testDt.isValid && testDt.zone.isValid) {
        return `UTC${offsetString}`;
    }
    return null;
}