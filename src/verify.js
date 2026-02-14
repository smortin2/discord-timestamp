import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(request, publicKey) {
    const signature = request.headers.get("X-Signature-Ed25519");
    const timestamp = request.headers.get("X-Signature-Timestamp");
    const body = await request.text();

    if (!signature || !timestamp) {
        return { isValid: false, body };
    }

    const isValid = await verifyKey(body, signature, timestamp, publicKey);
    return { isValid, body };
}