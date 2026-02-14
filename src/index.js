import {
    INTERACTION_TYPE_PING,
    INTERACTION_TYPE_APPLICATION_COMMAND,
    RESPONSE_TYPE_PONG,
} from "./constants.js";
import { verifyDiscordRequest } from "./verify.js";
import { jsonResponse, errorResponse } from "./responses.js";
import { handleTimeCommand, handleSetTimezoneCommand, handleSetCultureCommand } from "./commands.js";

export default {
    async fetch(request, env) {
        const DISCORD_PUBLIC_KEY = env.DISCORD_PUBLIC_KEY;
        const TIMEZONE_KV = env.TIMEZONE_KV;
        const CULTURE_KV = env.CULTURE_KV;

        try {
            if (request.method !== "POST") {
                return errorResponse("Only POST requests are accepted.");
            }

            const { isValid, body } = await verifyDiscordRequest(request, DISCORD_PUBLIC_KEY);
            if (!isValid) {
                return errorResponse("Invalid request signature.");
            }

            const interaction = JSON.parse(body);

            if (interaction.type === INTERACTION_TYPE_PING) {
                return jsonResponse({ type: RESPONSE_TYPE_PONG });
            }

            if (interaction.type === INTERACTION_TYPE_APPLICATION_COMMAND) {
                switch (interaction.data.name) {
                    case "time":
                        return await handleTimeCommand(interaction, TIMEZONE_KV, CULTURE_KV);
                    case "timesetzone":
                        return await handleSetTimezoneCommand(interaction, TIMEZONE_KV);
                    case "timesetculture":
                        return await handleSetCultureCommand(interaction, CULTURE_KV);
                    default:
                        return errorResponse("Unknown command.");
                }
            }

            return errorResponse("Unknown interaction type.");
        } catch (error) {
            console.error("Unhandled error:", error);
            return errorResponse(`Internal error: ${error.message}`);
        }
    },
};