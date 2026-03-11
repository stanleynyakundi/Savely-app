import { getAccountTransactions } from "@/lib/payhero";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add Admin check here if we have roles
    // if (session.user.role !== 'admin') ...

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");

    try {
        const result = await getAccountTransactions(page, limit);

        if (!result.success) {
            return NextResponse.json({ error: result.error || "Failed to fetch transactions" }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("PayHero proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
