/**
 * Database Migration Script
 * Adds PayHero fields to transactions table
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
    console.log("Starting database migration...");

    try {
        // Add new columns to transactions table
        await sql`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS payhero_reference VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS network_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS callback_data JSONB
    `;
        console.log("✅ Added columns to transactions table");

        // Create index on payhero_reference for faster lookups
        await sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_payhero_reference 
      ON transactions(payhero_reference)
    `;
        console.log("✅ Created index on payhero_reference");

        console.log("\n🎉 Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
