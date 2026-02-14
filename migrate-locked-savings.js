/**
 * Database Migration Script
 * Creates locked_savings table for the locking savings feature
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.POSTGRES_URL);

async function runMigration() {
  console.log("Starting locked savings migration...");

  try {
    // Create locked_savings table
    await sql`
      CREATE TABLE IF NOT EXISTS locked_savings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        lock_duration_days INTEGER NOT NULL,
        locked_at TIMESTAMP DEFAULT NOW(),
        unlock_date TIMESTAMP NOT NULL,
        penalty_rate DECIMAL(5, 2) DEFAULT 10.00,
        status VARCHAR(20) DEFAULT 'active',
        unlocked_at TIMESTAMP,
        penalty_paid DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ Created locked_savings table");

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_locked_savings_user_id 
      ON locked_savings(user_id)
    `;
    console.log("✅ Created index on user_id");

    await sql`
      CREATE INDEX IF NOT EXISTS idx_locked_savings_status 
      ON locked_savings(status)
    `;
    console.log("✅ Created index on status");

    console.log("\n🎉 Locked savings migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
