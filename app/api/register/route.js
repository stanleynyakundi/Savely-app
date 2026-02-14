import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name || !phone) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    // Store password in plain text (for demo only!)
    const insertedUsers = await sql`
      INSERT INTO users (email, password_hash, name, phone)
      VALUES (${email}, ${password}, ${name}, ${phone})
      RETURNING id, email, name, phone
    `;
    const user = insertedUsers[0];

    // Create initial balance record
    await sql`INSERT INTO balances (user_id, amount) VALUES (${user.id}, 0.00)`;

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
