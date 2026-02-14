import crypto from "crypto";

/**
 * Webhook Signature Verifier
 * Verifies PayHero webhook signatures to ensure authenticity
 */

/**
 * Verify PayHero webhook signature
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Signature from request headers
 * @param {string} secret - PayHero webhook secret
 * @returns {boolean} True if signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret) {
    if (!signature || !secret) {
        console.warn("Missing signature or secret for webhook verification");
        return false;
    }

    try {
        // PayHero typically uses HMAC-SHA256 for webhook signatures
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("hex");

        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        console.error("Webhook signature verification error:", error);
        return false;
    }
}

/**
 * Extract signature from request headers
 * PayHero may send signature in different header formats
 * @param {Headers} headers - Request headers
 * @returns {string|null} Signature if found
 */
export function extractSignature(headers) {
    // Check common signature header names
    const signatureHeaders = [
        "x-payhero-signature",
        "x-webhook-signature",
        "x-signature",
    ];

    for (const headerName of signatureHeaders) {
        const signature = headers.get(headerName);
        if (signature) {
            return signature;
        }
    }

    return null;
}
