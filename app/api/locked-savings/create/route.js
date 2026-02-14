import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, lockDurationDays } = await request.json();

    // Validate amount
    if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Validate lock duration
    const validDurations = [30, 60, 90, 180, 365];
    if (!validDurations.includes(lockDurationDays)) {
        return NextResponse.json(
            { error: "Invalid lock duration. Choose from: 30, 60, 90, 180, or 365 days" },
            { status: 400 }
        );
    }

    const userId = session.user.id;

    try {
        // Calculate unlock date
        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + lockDurationDays);

        // ATOMIC OPERATION:
        // 1. Deduct amount from balance (if sufficient funds).
        // 2. Insert locked saving record (if deduction succeeded).
        // 3. Insert transaction record (if deduction succeeded).

        const result = await sql`
            WITH deducted_balance AS (
                UPDATE balances
                SET amount = amount - ${amount}
                WHERE user_id = ${userId} AND amount >= ${amount}
                RETURNING amount
            ),
            inserted_lock AS (
                INSERT INTO locked_savings (
                    user_id, 
                    amount, 
                    lock_duration_days, 
                    unlock_date,
                    penalty_rate
                )
                SELECT 
                    ${userId}, 
                    ${amount}, 
                    ${lockDurationDays}, 
                    ${unlockDate.toISOString()},
                    10.00
                WHERE EXISTS (SELECT 1 FROM deducted_balance)
                RETURNING id, amount, lock_duration_days, unlock_date, penalty_rate, status
            ),
            inserted_tx AS (
                INSERT INTO transactions (user_id, type, amount, status)
                SELECT ${userId}, 'lock_created', ${amount}, 'completed'
                WHERE EXISTS (SELECT 1 FROM deducted_balance)
                RETURNING id
            )
            SELECT 
                (SELECT amount FROM deducted_balance) as new_balance,
                l.id, l.amount, l.lock_duration_days, l.unlock_date, l.penalty_rate, l.status
            FROM inserted_lock l
        `;

        // Check if operation succeeded
        // If deducted_balance is null (empty), it means insufficient funds
        // If inserted_lock is null (empty), it means deduction failed (or other error)

        if (result.length === 0) {
            // Fetch current balance to show helpful error
            const balanceCheck = await sql`SELECT amount FROM balances WHERE user_id = ${userId}`;
            const current = balanceCheck[0]?.amount || 0;
            return NextResponse.json(
                { error: `Insufficient available balance. You have KES ${Number(current).toFixed(2)} available.` },
                { status: 400 }
            );
        }

        const lockedSaving = result[0];

        return NextResponse.json({
            success: true,
            lockedSaving: {
                id: lockedSaving.id,
                amount: Number(lockedSaving.amount),
                lockDurationDays: lockedSaving.lock_duration_days,
                unlockDate: lockedSaving.unlock_date,
                penaltyRate: Number(lockedSaving.penalty_rate),
                status: lockedSaving.status,
            },
            message: `Successfully locked KES ${amount} for ${lockDurationDays} days`,
        });
    } catch (error) {
        console.error("Create locked savings error:", error);
        return NextResponse.json(
            { error: "Failed to create locked savings" },
            { status: 500 }
        );
    }
}
