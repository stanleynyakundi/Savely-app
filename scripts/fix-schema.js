const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL);

async function fixSchema() {
    try {
        console.log("🛠️ Fixing transactions table schema...");
        await sql`
            ALTER TABLE transactions 
            ALTER COLUMN type TYPE VARCHAR(50)
        `;
        console.log("✅ Successfully altered 'type' column to VARCHAR(50)");
    } catch (e) {
        console.error("❌ Schema Fix Failed:", e);
    }
}

fixSchema();
