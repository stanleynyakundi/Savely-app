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
    // Get total balance
    const result =
      await sql`SELECT amount FROM balances WHERE user_id = ${userId}`;
    const totalBalance = result[0]?.amount ?? 0;

    // Get locked balance
    const lockedResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_locked
      FROM locked_savings
      WHERE user_id = ${userId} AND status = 'active'
    `;
    const lockedBalance = lockedResult[0]?.total_locked ?? 0;

    // Calculate available balance
    const availableBalance = totalBalance - lockedBalance;

    return NextResponse.json({
      balance: Number(availableBalance), // For backward compatibility
      availableBalance: Number(availableBalance),
      lockedBalance: Number(lockedBalance),
      totalBalance: Number(totalBalance),
    });
  } catch (error) {
    console.error("Balance API error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
