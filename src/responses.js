import { RESPONSE_TYPE_CHANNEL_MESSAGE, EPHEMERAL_FLAG } from "./constants.js";

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

export function ephemeralResponse(content) {
    return jsonResponse({
        type: RESPONSE_TYPE_CHANNEL_MESSAGE,
        data: { content, flags: EPHEMERAL_FLAG },
    });
}

export function publicResponse(content) {
    return jsonResponse({
        type: RESPONSE_TYPE_CHANNEL_MESSAGE,
        data: { content },
    });
}

export function errorResponse(message) {
    return ephemeralResponse(`❌ ${message}`);
}