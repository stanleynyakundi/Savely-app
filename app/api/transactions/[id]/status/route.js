import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
        return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const userId = session.user.id;

    try {
        const result = await sql`
      SELECT status, type, amount, created_at
      FROM transactions
      WHERE id = ${id} AND user_id = ${userId}
    `;

        if (result.length === 0) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        const transaction = result[0];
        return NextResponse.json({
            status: transaction.status,
            type: transaction.type,
            amount: transaction.amount,
            createdAt: transaction.created_at
        });

    } catch (error) {
        console.error("Get transaction status error:", error);
        return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
    }
}
