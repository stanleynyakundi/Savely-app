import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  withdrawToMobile,
  validatePhoneNumber,
  validateNetworkCode,
  getNetworkName,
} from "@/lib/payhero";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, phone, networkCode } = await request.json();

  // Validate amount
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Validate phone number
  if (!phone) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 },
    );
  }

  if (!validatePhoneNumber(phone)) {
    return NextResponse.json(
      { error: "Invalid phone number format. Use 254XXXXXXXXX" },
      { status: 400 },
    );
  }

  // Validate network code
  if (!networkCode) {
    return NextResponse.json(
      { error: "Network code is required (63902 for M-Pesa, 63903 for Airtel)" },
      { status: 400 },
    );
  }

  if (!validateNetworkCode(networkCode)) {
    return NextResponse.json(
      { error: "Invalid network code. Use 63902 for M-Pesa or 63903 for Airtel Money" },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  try {
    // Check current balance
    const balanceResult = await sql`
      SELECT amount FROM balances WHERE user_id = ${userId}
    `;
    const currentBalance = balanceResult[0]?.amount || 0;

    // Get locked balance
    const lockedResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_locked
      FROM locked_savings
      WHERE user_id = ${userId} AND status = 'active'
    `;
    const totalLocked = lockedResult[0]?.total_locked || 0;
    const availableBalance = currentBalance - totalLocked;

    if (availableBalance < amount) {
      return NextResponse.json(
        {
          error: `Insufficient available balance. You have KES ${availableBalance.toFixed(2)} available (KES ${totalLocked.toFixed(2)} is locked).`
        },
        { status: 400 },
      );
    }

    // Note: Transactions (BEGIN/COMMIT) are not supported in Neon HTTP driver
    // Create pending withdrawal transaction
    const inserted = await sql`
      INSERT INTO transactions (user_id, type, amount, status, phone_number, network_code)
      VALUES (${userId}, 'withdrawal', ${amount}, 'pending', ${phone}, ${networkCode})
      RETURNING id
    `;
    const transactionId = inserted[0].id;

    // Initiate PayHero withdrawal
    const payheroResponse = await withdrawToMobile(
      phone,
      amount,
      networkCode,
    );

    if (!payheroResponse.success) {
      // Mark transaction as failed if PayHero fails
      await sql`
        UPDATE transactions 
        SET status = 'failed', 
            result_desc = ${payheroResponse.error || "Failed to initiate withdrawal"}
        WHERE id = ${transactionId}
      `;

      return NextResponse.json(
        { error: payheroResponse.error || "Failed to initiate withdrawal" },
        { status: 500 },
      );
    }

    // Update transaction with PayHero reference
    await sql`
      UPDATE transactions
      SET payhero_reference = ${payheroResponse.reference}
      WHERE id = ${transactionId}
    `;

    return NextResponse.json({
      success: true,
      transactionId,
      status: "pending",
      message: `Withdrawal to ${getNetworkName(networkCode)} initiated. You will receive the money shortly.`,
      payheroReference: payheroResponse.reference,
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ error: "Transaction failed", details: error.message }, { status: 500 });
  }
}
