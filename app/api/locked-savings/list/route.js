import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const lockedSavings = await sql`
      SELECT 
        id,
        amount,
        lock_duration_days,
        locked_at,
        unlock_date,
        penalty_rate,
        status,
        unlocked_at,
        penalty_paid
      FROM locked_savings
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

        // Add calculated fields
        const now = new Date();
        const enrichedSavings = lockedSavings.map((saving) => {
            const unlockDate = new Date(saving.unlock_date);
            const daysRemaining = Math.max(
                0,
                Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24))
            );
            const isMature = now >= unlockDate;
            const canUnlock = saving.status === "active";

            return {
                id: saving.id,
                amount: Number(saving.amount),
                lockDurationDays: saving.lock_duration_days,
                lockedAt: saving.locked_at,
                unlockDate: saving.unlock_date,
                penaltyRate: Number(saving.penalty_rate),
                status: saving.status,
                unlockedAt: saving.unlocked_at,
                penaltyPaid: Number(saving.penalty_paid || 0),
                daysRemaining,
                isMature,
                canUnlock,
            };
        });

        // Calculate totals
        const totalLocked = enrichedSavings
            .filter((s) => s.status === "active")
            .reduce((sum, s) => sum + s.amount, 0);

        const totalUnlocked = enrichedSavings
            .filter((s) => s.status === "unlocked")
            .reduce((sum, s) => sum + s.amount, 0);

        return NextResponse.json({
            lockedSavings: enrichedSavings,
            summary: {
                totalLocked,
                totalUnlocked,
                activeCount: enrichedSavings.filter((s) => s.status === "active").length,
            },
        });
    } catch (error) {
        console.error("List locked savings error:", error);
        return NextResponse.json(
            { error: "Failed to fetch locked savings" },
            { status: 500 }
        );
    }
}
