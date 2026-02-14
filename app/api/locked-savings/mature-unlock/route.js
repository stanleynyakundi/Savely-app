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
        // Optimistic check (read-only)
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

        // Check if unlock date has passed
        const unlockDate = new Date(lockedSaving.unlock_date);
        const now = new Date();

        if (now < unlockDate) {
            return NextResponse.json(
                { error: "Lock period has not expired yet. Use early unlock if you need funds now." },
                { status: 400 }
            );
        }

        const amount = Number(lockedSaving.amount);

        // ATOMIC UPDATE via CTEs
        // 1. Update status to unlocked (idempotency key: status='active')
        // 2. Add full amount to balance atomically
        // 3. Log transaction

        const result = await sql`
            WITH updated_saving AS (
                UPDATE locked_savings 
                SET 
                    status = 'unlocked',
                    unlocked_at = NOW(),
                    penalty_paid = 0
                WHERE id = ${lockedSavingId} AND user_id = ${userId} AND status = 'active'
                RETURNING id, user_id, amount
            ),
            updated_balance AS (
                UPDATE balances
                SET amount = amount + (SELECT amount FROM updated_saving)
                WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM updated_saving)
                RETURNING amount
            ),
            inserted_tx AS (
                INSERT INTO transactions (user_id, type, amount, status)
                SELECT user_id, 'unlock_mature', amount, 'completed'
                FROM updated_saving
                RETURNING id
            )
            SELECT 
                (SELECT id FROM updated_saving) as saving_id,
                (SELECT amount FROM updated_balance) as new_balance
        `;

        // If no rows updated, it means preventing double unlock
        if (!result[0] || !result[0].saving_id) {
            return NextResponse.json(
                { error: "Failed to unlock. Saving may have been already unlocked." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Successfully unlocked matured savings",
            details: {
                amount,
                penalty: 0,
                amountReturned: amount,
            },
        });
    } catch (error) {
        console.error("Mature unlock error:", error);
        return NextResponse.json(
            { error: "Failed to unlock savings", details: error.message },
            { status: 500 }
        );
    }
}
