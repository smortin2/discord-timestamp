import {
    DEFAULT_TIMEZONE,
    DEFAULT_CULTURE,
    FORMAT_FULL_DATETIME,
    FORMAT_TIME_ONLY,
} from "./constants.js";
import { resolveTimezone, listAbbreviationMatches } from "./timezone.js";
import { parseTime, parseDate, buildUnixTimestamp } from "./parsing.js";
import { ephemeralResponse, publicResponse } from "./responses.js";

function getUserId(interaction) {
    return interaction.member?.user?.id || interaction.user?.id;
}

function getOption(interaction, name) {
    return (interaction.data.options || []).find((opt) => opt.name === name)?.value || null;
}

/**
 * /time [time] [date?] [timezone?]
 *
 * Converts a user-provided time (and optional date) into a Discord dynamic timestamp.
 * The timestamp will display in each viewer's local timezone automatically.
 *
 * Uses the user's saved timezone and culture from KV. If not set, defaults to EST and en-US.
 * If a date is provided, uses full datetime format; otherwise time-only format (no date shown).
 * Timezone can be overridden per-invocation via the optional third argument.
 *
 * When a date is given without a year, assumes the next occurrence of that date in the future.
 */
export async function handleTimeCommand(interaction, timezoneKv, cultureKv) {
    const userId = getUserId(interaction);
    const rawTime = getOption(interaction, "time");
    const rawDate = getOption(interaction, "date");
    const rawTimezone = getOption(interaction, "timezone");

    if (!rawTime) {
        return ephemeralResponse("You must provide a time.");
    }

    const storedTimezone = await timezoneKv.get(userId);
    const storedCulture = await cultureKv.get(userId);

    const ianaTimezone = rawTimezone
        ? resolveTimezone(rawTimezone)
        : (storedTimezone || DEFAULT_TIMEZONE);

    const culture = storedCulture || DEFAULT_CULTURE;

    if (rawTimezone && !ianaTimezone) {
        return ephemeralResponse(
            `Unrecognized timezone: \`${rawTimezone}\`. Use /timesetzone to configure your default, ` +
            `or provide an IANA name (e.g. America/New_York), abbreviation (e.g. EST), or offset (e.g. UTC-5).`
        );
    }

    const parsedTime = parseTime(rawTime);
    if (!parsedTime) {
        return ephemeralResponse(
            `Could not parse time: \`${rawTime}\`. Use formats like \`2:30PM\`, \`14:30\`, or \`9:00 AM\`.`
        );
    }

    let parsedDate = null;
    if (rawDate) {
        parsedDate = parseDate(rawDate, culture, ianaTimezone);
        if (!parsedDate) {
            return ephemeralResponse(
                `Could not parse date: \`${rawDate}\` with culture \`${culture}\`. ` +
                `Try formats like \`3/15\`, \`2024-12-25\`, or \`Dec 25\`. Use /timesetculture to change date format.`
            );
        }
    }

    const unixSeconds = buildUnixTimestamp(parsedTime, parsedDate, ianaTimezone);
    if (!unixSeconds) {
        return ephemeralResponse("Failed to build timestamp. Check your inputs.");
    }

    const formatCode = parsedDate ? FORMAT_FULL_DATETIME : FORMAT_TIME_ONLY;
    const discordTimestamp = `<t:${unixSeconds}:${formatCode}>`;

    return publicResponse(discordTimestamp);
}

/**
 * /timesetzone [timezone] [index?]
 *
 * Stores the user's preferred IANA timezone in KV for use with /time.
 * Accepts IANA names (e.g. America/New_York), common abbreviations (e.g. EST), or UTC offsets (e.g. UTC-5).
 * If an abbreviation maps to multiple timezones, the user can specify which one via the index argument.
 * This timezone becomes the default interpretation context for all future /time commands unless overridden.
 */
export async function handleSetTimezoneCommand(interaction, timezoneKv) {
    const userId = getUserId(interaction);
    const rawTimezone = getOption(interaction, "timezone");
    const rawIndex = getOption(interaction, "index");

    if (!rawTimezone) {
        return ephemeralResponse("You must provide a timezone.");
    }

    const matches = listAbbreviationMatches(rawTimezone);

    // If multiple matches and no index given, show the user their options
    if (matches.length > 1 && !rawIndex) {
        const list = matches.map((tz, i) => `\`${i + 1}\`: ${tz}`).join("\n");
        return ephemeralResponse(
            `\`${rawTimezone.toUpperCase()}\` matches multiple timezones. ` +
            `Re-run with an index to pick one:\n${list}\n\n` +
            `Example: \`/timesetzone ${rawTimezone} 1\``
        );
    }

    const resolved = resolveTimezone(rawTimezone, rawIndex);
    if (!resolved) {
        return ephemeralResponse(
            `Unrecognized timezone: \`${rawTimezone}\`. Use IANA (e.g. \`America/New_York\`), ` +
            `abbreviation (e.g. \`EST\`), or offset (e.g. \`UTC-5\`).`
        );
    }

    await timezoneKv.put(userId, resolved);
    return ephemeralResponse(`✅ Timezone set to \`${resolved}\`.`);
}

/**
 * /timesetculture [culture]
 *
 * Stores the user's preferred locale/culture code in KV (e.g. en-US, en-GB, ja-JP).
 * This determines how date input is interpreted: MM/DD/YYYY (en-US), DD/MM/YYYY (en-GB), YYYY/MM/DD (ja-JP), etc.
 * Validates the culture code by checking if it works with Intl.DateTimeFormat.
 */
export async function handleSetCultureCommand(interaction, cultureKv) {
    const userId = getUserId(interaction);
    const rawCulture = getOption(interaction, "culture");

    if (!rawCulture) {
        return ephemeralResponse("You must provide a culture code.");
    }

    try {
        Intl.DateTimeFormat(rawCulture);
    } catch {
        return ephemeralResponse(
            `Invalid culture code: \`${rawCulture}\`. Use a BCP 47 locale tag like \`en-US\`, \`en-GB\`, ` +
            `\`de-DE\`, \`ja-JP\`, etc.`
        );
    }

    await cultureKv.put(userId, rawCulture);

    const sampleDate = new Intl.DateTimeFormat(rawCulture, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(2024, 11, 25));

    return ephemeralResponse(
        `✅ Date culture set to \`${rawCulture}\`. Example date format: \`${sampleDate}\``
    );
}