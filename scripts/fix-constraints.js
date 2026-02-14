const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL);

async function fixConstraints() {
    try {
        console.log("🛠️ Dropping restrictive constraints on transactions table...");

        // Attempt to drop type check
        try {
            await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check`;
            console.log("✅ Dropped transactions_type_check");
        } catch (e) {
            console.log("⚠️ Could not drop type check (might not exist):", e.message);
        }

        // Attempt to drop status check (optional, but good for flexibility)
        try {
            await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check`;
            console.log("✅ Dropped transactions_status_check");
        } catch (e) {
            console.log("⚠️ Could not drop status check (might not exist):", e.message);
        }

        console.log("🎉 Constraints update completed.");
    } catch (e) {
        console.error("❌ Constraint Fix Failed:", e);
    }
}

fixConstraints();
