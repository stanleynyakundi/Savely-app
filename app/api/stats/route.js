import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // Get total deposits (successful only)
        const depositStats = await sql`
      SELECT 
        COUNT(*) as total_deposits,
        COALESCE(SUM(amount), 0) as total_deposited
      FROM transactions
      WHERE user_id = ${userId} 
        AND type = 'deposit' 
        AND status = 'success'
    `;

        // Get total withdrawals (successful only)
        const withdrawalStats = await sql`
      SELECT 
        COUNT(*) as total_withdrawals,
        COALESCE(SUM(amount), 0) as total_withdrawn
      FROM transactions
      WHERE user_id = ${userId} 
        AND type = 'withdrawal' 
        AND status = 'success'
    `;

        return NextResponse.json({
            deposits: {
                count: Number(depositStats[0].total_deposits) || 0,
                total: Number(depositStats[0].total_deposited) || 0,
            },
            withdrawals: {
                count: Number(withdrawalStats[0].total_withdrawals) || 0,
                total: Number(withdrawalStats[0].total_withdrawn) || 0,
            },
        });
    } catch (error) {
        console.error("Stats fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 },
        );
    }
}
