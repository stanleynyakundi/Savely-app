import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  initiateSTKPush,
  validatePhoneNumber,
} from "@/lib/payhero";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, phone } = await request.json();

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

  const userId = session.user.id;

  try {
    // Create pending deposit transaction
    // Note: Transactions (BEGIN/COMMIT) are not supported in Neon HTTP driver
    const inserted = await sql`
      INSERT INTO transactions (user_id, type, amount, status, phone_number)
      VALUES (${userId}, 'deposit', ${amount}, 'pending', ${phone})
      RETURNING id
    `;
    const transactionId = inserted[0].id;

    // Initiate PayHero STK Push
    const payheroResponse = await initiateSTKPush(
      phone,
      amount,
      `DEPOSIT-${transactionId}`,
    );

    if (!payheroResponse.success) {
      // Mark transaction as failed if PayHero fails
      await sql`
        UPDATE transactions 
        SET status = 'failed', 
            result_desc = ${payheroResponse.error || "Failed to initiate payment"}
        WHERE id = ${transactionId}
      `;

      return NextResponse.json(
        { error: payheroResponse.error || "Failed to initiate payment" },
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
      message: "STK Push sent to your phone. Please complete the payment.",
      payheroReference: payheroResponse.reference,
    });
  } catch (error) {
    console.error("Deposit error:", error);
    // Attempt to record failure if transactionId existed, but we might not have it in scope easily here
    // unless we restructure. usage of transactionId in catch would require invalidating scope.
    // For now, just return error.
    return NextResponse.json({ error: "Transaction failed", details: error.message }, { status: 500 });
  }
}
