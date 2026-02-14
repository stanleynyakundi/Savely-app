import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit"))
    : null;

  const userId = session.user.id;

  try {
    let transactions;
    if (limit) {
      transactions = await sql`
        SELECT id, type, amount, status, created_at
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      transactions = await sql`
        SELECT id, type, amount, status, created_at
        FROM transactions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Transactions API error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
