import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import {
    verifyWebhookSignature,
    extractSignature,
} from "@/lib/webhook-verifier";

/**
 * PayHero Callback Handler
 * Receives transaction status updates from PayHero for both deposits and withdrawals
 * Enhanced with security, idempotency, and better error handling
 */
export async function POST(request) {
    const startTime = Date.now();
    let callbackData = null;
    let payheroRef = null;

    try {
        // Read raw body for signature verification
        const rawBody = await request.text();
        callbackData = JSON.parse(rawBody);

        console.log("📥 PayHero callback received:", {
            timestamp: new Date().toISOString(),
            data: callbackData,
        });

        // Optional: Verify webhook signature if enabled
        if (process.env.PAYHERO_WEBHOOK_SIGNATURE_VERIFICATION === "true") {
            const signature = extractSignature(request.headers);
            const isValid = verifyWebhookSignature(
                rawBody,
                signature,
                process.env.PAYHERO_SECRET
            );

            if (!isValid) {
                console.error("❌ Invalid webhook signature");
                return NextResponse.json(
                    { error: "Invalid signature" },
                    { status: 401 }
                );
            }
            console.log("✅ Webhook signature verified");
        }

        // Extract transaction details from callback
        // New PayHero format includes: transaction_date, provider, success, merchant,
        // payment_reference, third_party_reference, status, reference, CheckoutRequestID, provider_reference
        const {
            reference,
            transaction_id,
            status,
            success,
            amount,
            phone_number,
            result_code,
            result_desc,
            transaction_date,
            provider,
            merchant,
            payment_reference,
            third_party_reference,
            CheckoutRequestID,
            provider_reference,
        } = callbackData;

        // Validate required fields - reference is the primary identifier
        payheroRef = reference || transaction_id;
        if (!payheroRef) {
            console.error("❌ No PayHero reference found in callback");
            return NextResponse.json(
                { error: "Invalid callback data: missing reference" },
                { status: 400 }
            );
        }

        // Determine if transaction was successful
        // Check both the 'success' boolean field and status string
        const isSuccess =
            success === true ||
            result_code === 0 ||
            result_code === "0" ||
            status === "SUCCESS" ||
            status === "success";
        const transactionStatus = isSuccess ? "success" : "failed";

        console.log("🔍 Processing transaction:", {
            reference: payheroRef,
            status: transactionStatus,
            successFlag: success,
            statusField: status,
            resultCode: result_code,
            resultDesc: result_desc,
            provider: provider,
            thirdPartyRef: third_party_reference || provider_reference,
            transactionDate: transaction_date,
        });

        // Find transaction by PayHero reference
        const transactions = await sql`
      SELECT id, user_id, type, amount, status
      FROM transactions
      WHERE payhero_reference = ${payheroRef}
    `;

        if (transactions.length === 0) {
            console.error(`❌ Transaction not found for reference: ${payheroRef}`);
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        const transaction = transactions[0];

        // Idempotency check: Don't process if already completed
        if (transaction.status === "success" || transaction.status === "failed") {
            console.log(
                `⚠️  Transaction already processed with status: ${transaction.status}`
            );
            return NextResponse.json(
                {
                    success: true,
                    message: "Transaction already processed",
                    status: transaction.status,
                },
                { status: 200 }
            );
        }

        console.log("💾 Updating transaction and balance:", {
            transactionId: transaction.id,
            userId: transaction.user_id,
            type: transaction.type,
            amount: transaction.amount,
            newStatus: transactionStatus,
        });

        try {
            // Update transaction status and callback data
            // All PayHero metadata is stored in callback_data JSON

            if (isSuccess) {
                if (transaction.type === "deposit") {
                    // Atomic update for Deposit: Update transaction AND increment balance
                    await sql`
                        WITH tx_update AS (
                            UPDATE transactions
                            SET 
                                status = 'success',
                                callback_data = ${JSON.stringify(callbackData)},
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${transaction.id}
                            RETURNING user_id, amount
                        )
                        UPDATE balances
                        SET amount = amount + (SELECT amount FROM tx_update), updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = (SELECT user_id FROM tx_update)
                    `;
                    console.log(
                        `✅ Deposit successful: Added ${transaction.amount} to user ${transaction.user_id}`
                    );
                } else if (transaction.type === "withdrawal") {
                    // Atomic update for Withdrawal: Update transaction AND decrement balance
                    await sql`
                        WITH tx_update AS (
                            UPDATE transactions
                            SET 
                                status = 'success',
                                callback_data = ${JSON.stringify(callbackData)},
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${transaction.id}
                            RETURNING user_id, amount
                        )
                        UPDATE balances
                        SET amount = amount - (SELECT amount FROM tx_update), updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = (SELECT user_id FROM tx_update)
                    `;
                    console.log(
                        `✅ Withdrawal successful: Deducted ${transaction.amount} from user ${transaction.user_id}`
                    );
                }
            } else {
                // Transaction failed - just update status
                await sql`
                    UPDATE transactions
                    SET 
                        status = 'failed',
                        callback_data = ${JSON.stringify(callbackData)},
                        result_desc = ${result_desc || "Unknown error"},
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${transaction.id}
                `;
                console.log(
                    `❌ Transaction failed: ${result_desc || "Unknown error"}`
                );
            }

            const processingTime = Date.now() - startTime;
            console.log("✅ Callback processed successfully:", {
                reference: payheroRef,
                transactionId: transaction.id,
                status: transactionStatus,
                processingTimeMs: processingTime,
            });

            return NextResponse.json({
                success: true,
                message: "Callback processed successfully",
                transactionId: transaction.id,
                status: transactionStatus,
            });
        } catch (dbError) {
            throw dbError;
        }
    } catch (error) {
        // Log the error but don't attempt rollback as transactions are not supported
        console.error("❌ Callback processing error:", {
            error: error.message,
            stack: error.stack,
            reference: payheroRef,
            callbackData: callbackData,
        });

        return NextResponse.json(
            {
                error: "Failed to process callback",
                message: error.message,
            },
            { status: 500 }
        );
    }
}
