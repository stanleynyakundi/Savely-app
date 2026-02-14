import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, phone } = await request.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    // Check current balance
    const balanceResult = await sql`
      SELECT amount FROM balances WHERE user_id = ${userId}
    `;
    const currentBalance = balanceResult[0]?.amount || 0;
    if (currentBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    await sql`BEGIN`;

    // Insert withdrawal transaction
    const inserted = await sql`
      INSERT INTO transactions (user_id, type, amount, status)
      VALUES (${userId}, 'withdrawal', ${amount}, 'success')
      RETURNING id
    `;
    const transactionId = inserted[0].id;

    // Update balance
    await sql`
      UPDATE balances
      SET amount = amount - ${amount}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;

    await sql`COMMIT`;

    return NextResponse.json({ success: true, transactionId });
  } catch (error) {
    await sql`ROLLBACK`;
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Transaction failed" }, { status: 500 });
  }
}
