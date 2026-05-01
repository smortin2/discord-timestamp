// src/commands.js
import {
    DEFAULT_OFFSET,
    DEFAULT_CULTURE,
    FORMAT_FULL_DATETIME,
    FORMAT_TIME_ONLY,
} from "./constants.js";
import { calculateOffsetSeconds } from "./timezone.js";
import { parseTime, parseDate, buildUnixTimestamp } from "./parsing.js";
import { ephemeralResponse, publicResponse } from "./responses.js";

function getUserId(interaction) {
    return interaction.member?.user?.id || interaction.user?.id;
}

function getOption(interaction, name) {
    return (interaction.data.options || []).find((opt) => opt.name === name)?.value || null;
}

export async function handleTimeCommand(interaction, timezoneKv, cultureKv) {
    const userId = getUserId(interaction);
    const rawTime = getOption(interaction, "time");
    const rawDate = getOption(interaction, "date");

    if (!rawTime) return ephemeralResponse("You must provide a time.");

    let offsetSeconds = await timezoneKv.get(userId);
    if (offsetSeconds === null) offsetSeconds = DEFAULT_OFFSET;
    else offsetSeconds = parseInt(offsetSeconds, 10);

    const storedCulture = await cultureKv.get(userId) || DEFAULT_CULTURE;

    const parsedTime = parseTime(rawTime);
    if (!parsedTime) return ephemeralResponse(`Could not parse time: \`${rawTime}\`.`);

    let parsedDate = null;
    if (rawDate) {
        parsedDate = parseDate(rawDate, storedCulture, offsetSeconds);
        if (!parsedDate) return ephemeralResponse(`Could not parse date: \`${rawDate}\`.`);
    }

    const unixSeconds = buildUnixTimestamp(parsedTime, parsedDate, offsetSeconds);
    const formatCode = parsedDate ? FORMAT_FULL_DATETIME : FORMAT_TIME_ONLY;
    return publicResponse(`<t:${unixSeconds}:${formatCode}>`);
}

export async function handleSetCurrentCommand(interaction, timezoneKv) {
    const userId = getUserId(interaction);
    const rawTime = getOption(interaction, "time");

    if (!rawTime) return ephemeralResponse("You must provide your current time (e.g. 2:17PM).");

    const parsedTime = parseTime(rawTime);
    if (!parsedTime) return ephemeralResponse(`Could not parse time: \`${rawTime}\`.`);

    const offsetSeconds = calculateOffsetSeconds(parsedTime.hours, parsedTime.minutes);
    await timezoneKv.put(userId, offsetSeconds.toString()); // KV stores strings

    // Format offset for display (+5:00, -4:30)
    const sign = offsetSeconds >= 0 ? "+" : "-";
    const absMins = Math.abs(offsetSeconds) / 60;
    const hrs = Math.floor(absMins / 60);
    const mins = (absMins % 60).toString().padStart(2, "0");

    return ephemeralResponse(
        `✅ Timezone offset saved as \`UTC${sign}${hrs}:${mins}\`.\n` +
        `*(Note: Run this command again when Daylight Saving Time changes!)*`
    );
}

export async function handleCheckOffsetCommand(interaction, timezoneKv) {
    const userId = getUserId(interaction);

    let offsetSeconds = await timezoneKv.get(userId);
    if (offsetSeconds === null) offsetSeconds = DEFAULT_OFFSET;
    else offsetSeconds = parseInt(offsetSeconds, 10);

    // Calculate current local time using the offset
    const localNow = new Date(Date.now() + offsetSeconds * 1000);
    let hrs = localNow.getUTCHours();
    const mins = localNow.getUTCMinutes().toString().padStart(2, "0");
    const period = hrs >= 12 ? "PM" : "AM";

    hrs = hrs % 12 || 12;
    const plainTextTime = `${hrs}:${mins} ${period}`;
    const unixSeconds = Math.floor(Date.now() / 1000);

    return ephemeralResponse(
        `According to your saved offset, your current time is **${plainTextTime}**.\n` +
        `Discord dynamic timestamp: <t:${unixSeconds}:${FORMAT_TIME_ONLY}>`
    );
}

export async function handleSetCultureCommand(interaction, cultureKv) {
    const userId = getUserId(interaction);
    const rawCulture = getOption(interaction, "culture");

    if (!rawCulture) return ephemeralResponse("You must provide a culture code.");

    try { Intl.DateTimeFormat(rawCulture); }
    catch { return ephemeralResponse(`Invalid culture code: \`${rawCulture}\`.`); }

    await cultureKv.put(userId, rawCulture);
    return ephemeralResponse(`✅ Date culture set to \`${rawCulture}\`.`);
}