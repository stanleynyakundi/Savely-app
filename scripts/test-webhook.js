const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env" });

// Database connection
const sql = neon(process.env.DATABASE_URL);

async function simulateWebhook() {
    try {
        console.log("🔍 Finding latest pending transaction...");

        // Get the latest pending deposit transaction
        const transactions = await sql`
      SELECT * FROM transactions 
      WHERE status = 'pending' AND type = 'deposit'
      ORDER BY created_at DESC 
      LIMIT 1
    `;

        if (transactions.length === 0) {
            console.log("⚠️ No pending deposit transactions found.");
            return;
        }

        const transaction = transactions[0];
        console.log(`✅ Found pending transaction:`, {
            id: transaction.id,
            amount: transaction.amount,
            phone: transaction.phone_number,
            payhero_reference: transaction.payhero_reference
        });

        if (!transaction.payhero_reference) {
            console.error("❌ Transaction has no PayHero reference. Cannot simulate callback.");
            return;
        }

        // Prepare webhook payload matching the update format
        const payload = {
            success: true,
            status: "SUCCESS",
            reference: transaction.payhero_reference, // CRITICAL: This links to the transaction
            transaction_id: transaction.payhero_reference,
            amount: transaction.amount,
            currency: "KES",
            provider: "m-pesa",
            merchant: "Savely Test",
            payment_reference: "TEST_PAYMENT_REF",
            third_party_reference: "TEST_MPESA_CODE",
            transaction_date: new Date().toISOString(),
            result_code: 0,
            result_desc: "Success (Simulated)",
            checkout_request_id: "TEST_CHECKOUT_ID"
        };

        console.log("🚀 Sending webhook payload to localhost...", payload);

        // Send POST request to local API
        const response = await fetch("http://localhost:3000/api/payhero-callback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }

        console.log(`📡 Response Status: ${response.status}`);
        console.log("📄 Response Data:", responseData);

        if (response.ok) {
            console.log("✅ Webhook simulation SUCCESSFUL! Check the dashboard.");
        } else {
            console.error("❌ Webhook simulation FAILED.");
        }

    } catch (error) {
        console.error("❌ Error running simulation:", error);
    }
}

simulateWebhook();
