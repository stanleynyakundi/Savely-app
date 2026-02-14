import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lockedSavingId } = await request.json();

    if (!lockedSavingId) {
        return NextResponse.json(
            { error: "Locked saving ID is required" },
            { status: 400 }
        );
    }

    const userId = session.user.id;

    try {
        const lockedSavingResult = await sql`
            SELECT * FROM locked_savings
            WHERE id = ${lockedSavingId} AND user_id = ${userId}
        `;

        if (lockedSavingResult.length === 0) {
            return NextResponse.json(
                { error: "Locked saving not found" },
                { status: 404 }
            );
        }

        const lockedSaving = lockedSavingResult[0];

        if (lockedSaving.status !== "active") {
            return NextResponse.json(
                { error: "This locked saving has already been unlocked" },
                { status: 400 }
            );
        }

        const amount = Number(lockedSaving.amount);
        const penaltyRate = Number(lockedSaving.penalty_rate);
        const penalty = (amount * penaltyRate) / 100;
        const amountToReturn = amount - penalty;

        // ATOMIC UPDATE:
        // 1. Update locked_savings status to 'unlocked' ONLY IF it is currently 'active'.
        // 2. If valid update, update balances.
        // 3. If valid update, insert transaction.
        // Note: Neon HTTP driver doesn't support multi-statement transactions, but CTEs are single statement.

        const result = await sql`
            WITH updated_saving AS (
                UPDATE locked_savings
                SET 
                    status = 'unlocked',
                    unlocked_at = NOW(),
                    penalty_paid = ${penalty}
                WHERE id = ${lockedSavingId} AND user_id = ${userId} AND status = 'active'
                RETURNING id, user_id, amount
            ),
            updated_balance AS (
                UPDATE balances
                SET amount = amount + ${amountToReturn}
                WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM updated_saving)
                RETURNING amount
            ),
            inserted_transaction AS (
                INSERT INTO transactions (user_id, type, amount, status)
                SELECT user_id, 'unlock_early', ${amountToReturn}, 'completed'
                FROM updated_saving
                RETURNING id
            )
            SELECT 
                (SELECT id FROM updated_saving) as saving_id,
                (SELECT amount FROM updated_balance) as new_balance
        `;

        // If saving_id is null, it means the WHERE clause failed (likely status changed concurrently)
        if (!result[0] || !result[0].saving_id) {
            return NextResponse.json(
                { error: "Failed to unlock. Saving may have been already unlocked." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Unlocked early with ${penaltyRate}% penalty`,
            details: {
                originalAmount: amount,
                penalty,
                amountReturned: amountToReturn,
            },
        });
    } catch (error) {
        console.error("Early unlock error:", error);
        return NextResponse.json(
            { error: "Failed to unlock savings", details: error.message },
            { status: 500 }
        );
    }
}
