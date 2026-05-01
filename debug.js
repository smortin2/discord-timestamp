// debug.js
import {
    handleTimeCommand,
    handleSetCurrentCommand,
    handleCheckOffsetCommand,
    handleSetCultureCommand
} from "./src/commands.js";

const DEFAULT_USER_ID = "debug-user-001";

class MockKV {
    constructor() { this.store = {}; }
    async get(key) { return this.store[key] ?? null; }
    async put(key, value) { this.store[key] = value; }
}

const timezoneKv = new MockKV();
const cultureKv = new MockKV();

function buildInteraction(command, options) {
    return {
        type: 2,
        member: { user: { id: DEFAULT_USER_ID } },
        user: { id: DEFAULT_USER_ID },
        data: {
            name: command,
            options: options.filter((o) => o.value != null),
        },
    };
}

async function extractContent(response) {
    const body = JSON.parse(await response.text());
    return body.data?.content ?? "(no content)";
}

// ─── Command functions ─────────────────────────────────────────────────────

async function time(timeStr, date = null) {
    const interaction = buildInteraction("time", [
        { name: "time", value: timeStr },
        { name: "date", value: date },
    ]);
    return extractContent(await handleTimeCommand(interaction, timezoneKv, cultureKv));
}

async function timesetcurrent(timeStr) {
    const interaction = buildInteraction("timesetcurrent", [
        { name: "time", value: timeStr },
    ]);
    return extractContent(await handleSetCurrentCommand(interaction, timezoneKv));
}

async function timecheckoffset() {
    const interaction = buildInteraction("timecheckoffset", []);
    return extractContent(await handleCheckOffsetCommand(interaction, timezoneKv));
}

async function timesetculture(culture) {
    const interaction = buildInteraction("timesetculture", [
        { name: "culture", value: culture },
    ]);
    return extractContent(await handleSetCultureCommand(interaction, cultureKv));
}

// ─── Test wrappers ─────────────────────────────────────────────────────────

async function test_time(timeStr, date = null) {
    console.log(`[time] ->`, await time(timeStr, date));
}

async function test_timesetcurrent(timeStr) {
    console.log(`[setcurrent] ->`, await timesetcurrent(timeStr));
}

async function test_timecheckoffset() {
    console.log(`[checkoffset] ->\n${await timecheckoffset()}\n`);
}

// ─── Tests ─────────────────────────────────────────────────────────

// Dynamically generate a "user clock" reading for 5 hours behind UTC
// and add a weird minute count to prove the rounding works!
const now = new Date();
const targetOffsetMs = -5 * 60 * 60 * 1000;
const weirdDelayMs = 4 * 60 * 1000; // 4 minutes off
const simulatedUserTime = new Date(now.getTime() + targetOffsetMs + weirdDelayMs);

let hrs = simulatedUserTime.getUTCHours();
const mins = simulatedUserTime.getUTCMinutes().toString().padStart(2, "0");
const ampm = hrs >= 12 ? "PM" : "AM";
hrs = hrs % 12 || 12;

const simulatedInput = `${hrs}:${mins}${ampm}`;
console.log(`Simulating user looking at their clock and typing: ${simulatedInput}\n`);

// 1. Set the offset based on the "clock"
await test_timesetcurrent("2:52 AM");

// 2. Verify it calculates the current time correctly
await test_timecheckoffset();

// 3. Convert a future time using the new integer offset
await test_time("8:00PM");