const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env" });
const fs = require("fs");

function log(msg) {
    fs.appendFileSync("debug-output.txt", msg + "\n");
}
console.log = (msg, ...args) => log(`LOG: ${msg} ${JSON.stringify(args)}`);
console.error = (msg, ...args) => log(`ERROR: ${msg} ${JSON.stringify(args)}`);

const sql = neon(process.env.DATABASE_URL);

async function debug() {
    try {
        console.log("🔍 Fetching a test user...");
        const users = await sql`SELECT id, email FROM users LIMIT 1`;
        if (users.length === 0) {
            console.log("❌ No users found.");
            return;
        }
        const userId = users[0].id;
        console.log(`✅ Using User ID: ${userId} (${users[0].email})`);

        // 1. Ensure enough balance
        console.log("💰 Adding 1000 KES to balance for testing...");
        await sql`
      INSERT INTO balances (user_id, amount) 
      VALUES (${userId}, 1000) 
      ON CONFLICT (user_id) DO UPDATE SET amount = balances.amount + 1000
    `;

        // 2. Test Lock Creation Query (Exact copy from route.js)
        console.log("🔒 Testing Lock Creation...");
        const amount = 100;
        const lockDurationDays = 30;
        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + lockDurationDays);
        const unlockDateIso = unlockDate.toISOString();

        try {
            const result = await sql`
            WITH deducted_balance AS (
                UPDATE balances
                SET amount = amount - ${amount}
                WHERE user_id = ${userId} AND amount >= ${amount}
                RETURNING amount
            ),
            inserted_lock AS (
                INSERT INTO locked_savings (
                    user_id, 
                    amount, 
                    lock_duration_days, 
                    unlock_date,
                    penalty_rate
                )
                SELECT 
                    ${userId}, 
                    ${amount}, 
                    ${lockDurationDays}, 
                    ${unlockDateIso},
                    10.00
                WHERE EXISTS (SELECT 1 FROM deducted_balance)
                RETURNING id, amount, lock_duration_days, unlock_date, penalty_rate, status
            ),
            inserted_tx AS (
                INSERT INTO transactions (user_id, type, amount, status)
                SELECT ${userId}, 'lock_created', ${amount}, 'success'
                WHERE EXISTS (SELECT 1 FROM deducted_balance)
                RETURNING id
            )
            SELECT 
                (SELECT amount FROM deducted_balance) as new_balance,
                l.id, l.amount, l.lock_duration_days, l.unlock_date, l.penalty_rate, l.status
            FROM inserted_lock l
        `;

            console.log("✅ Lock Result:", result);
        } catch (e) {
            console.error("❌ Lock Creation Failed:", e);
        }

        // 3. Test Unlock Query (Exact copy from route.js)
        // First need a valid lock ID
        const locks = await sql`SELECT id FROM locked_savings WHERE user_id = ${userId} AND status = 'active' LIMIT 1`;
        if (locks.length > 0) {
            const lockId = locks[0].id;
            console.log(`🔓 Testing Unlock for ID: ${lockId}...`);

            try {
                const amountToReturn = 90; // mock
                const penalty = 10; // mock

                const result = await sql`
                WITH updated_saving AS (
                    UPDATE locked_savings
                    SET 
                        status = 'unlocked',
                        unlocked_at = NOW(),
                        penalty_paid = ${penalty}
                    WHERE id = ${lockId} AND user_id = ${userId} AND status = 'active'
                    RETURNING id, user_id, amount
                ),
                updated_balance AS (
                    UPDATE balances
                    SET amount = amount + ${amountToReturn}
                    WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM updated_saving)
                    RETURNING amount
                ),
                inserted_transaction AS (
                    INSERT INTO transactions (user_id, type, amount, status)
                    SELECT user_id, 'unlock_early', ${amountToReturn}, 'success'
                    FROM updated_saving
                    RETURNING id
                )
                SELECT 
                    (SELECT id FROM updated_saving) as saving_id,
                    (SELECT amount FROM updated_balance) as new_balance
            `;
                console.log("✅ Unlock Result:", result);
            } catch (e) {
                console.error("❌ Unlock Failed:", e);
            }
        } else {
            console.log("⚠️ No active locks found to test unlock.");
        }

    } catch (error) {
        console.error("❌ Debug Script Error:", error);
    }
}

debug();
