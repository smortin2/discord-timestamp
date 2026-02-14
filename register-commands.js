const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID || null;
const API_BASE = "https://discord.com/api/v10";
const GLOBAL_ENDPOINT = `${API_BASE}/applications/${APP_ID}/commands`;
const GUILD_ENDPOINT = GUILD_ID
    ? `${API_BASE}/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : null;

const AUTH_HEADERS = {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
};

const COMMANDS = [
    {
        name: "time",
        description: "Convert a time into a Discord timestamp that displays in everyone's local timezone",
        options: [
            {
                name: "time",
                description: "The time to convert (e.g. 2:30PM, 14:30, 9:00 AM)",
                type: 3,
                required: true,
            },
            {
                name: "date",
                description: "Optional date (e.g. 3/15, 2024-12-25). Defaults to next occurrence if no year given.",
                type: 3,
                required: false,
            },
            {
                name: "timezone",
                description: "One-time timezone override (e.g. America/New_York, EST, UTC-5). See /timesetzone.",
                type: 3,
                required: false,
            },
        ],
    },
    {
        name: "timesetzone",
        description: "Set your default timezone for /time",
        options: [
            {
                name: "timezone",
                description: "IANA name (America/New_York), abbreviation (EST), or offset (UTC-5)",
                type: 3,
                required: true,
            },
            {
                name: "index",
                description: "If an abbreviation matches multiple timezones, pick which one (e.g. 2 for the 2nd match)",
                type: 4,
                required: false,
            },
        ],
    },
    {
        name: "timesetculture",
        description: "Set your date format preference (e.g. en-US for M/D/Y, en-GB for D/M/Y)",
        options: [
            {
                name: "culture",
                description: "Locale code: en-US (M/D/Y), en-GB (D/M/Y), ja-JP (Y/M/D), etc.",
                type: 3,
                required: true,
            },
        ],
    },
];

async function purgeCommands(endpoint, label) {
    const response = await fetch(endpoint, { method: "GET", headers: AUTH_HEADERS });
    const existing = await response.json();

    if (!Array.isArray(existing)) {
        console.log(`[${label}] No existing commands to purge.`);
        return;
    }

    console.log(`[${label}] Purging ${existing.length} existing commands...`);

    for (const cmd of existing) {
        const delResponse = await fetch(`${endpoint}/${cmd.id}`, {
            method: "DELETE",
            headers: AUTH_HEADERS,
        });
        if (delResponse.ok) {
            console.log(`[${label}] Deleted /${cmd.name}`);
        } else {
            console.error(`[${label}] Failed to delete /${cmd.name}:`, await delResponse.text());
        }
    }
}

async function registerToEndpoint(endpoint, label) {
    await purgeCommands(endpoint, label);

    for (const command of COMMANDS) {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: AUTH_HEADERS,
            body: JSON.stringify(command),
        });
        const result = await response.json();
        if (response.ok) {
            console.log(`[${label}] Registered /${command.name}`);
        } else {
            console.error(`[${label}] Failed /${command.name}:`, result);
        }
    }
}

async function main() {
    console.log("Registering global commands...");
    await registerToEndpoint(GLOBAL_ENDPOINT, "GLOBAL");

    if (GUILD_ENDPOINT) {
        console.log(`Registering guild commands for ${GUILD_ID}...`);
        await registerToEndpoint(GUILD_ENDPOINT, "GUILD");
    } else {
        console.log("No GUILD_ID set, skipping guild registration.");
    }
}

main();