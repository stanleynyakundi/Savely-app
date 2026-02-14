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
    // ✅ Direct array result – no .rows
    const result =
      await sql`SELECT amount FROM balances WHERE user_id = ${userId}`;
    const balance = result[0]?.amount ?? 0; // safe access
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Balance API error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
