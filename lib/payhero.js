/**
 * PayHero API Integration Library
 * Handles deposits (STK Push) and withdrawals to M-Pesa/Airtel Money
 */

const PAYHERO_API_BASE_URL =
    process.env.PAYHERO_API_BASE_URL || "https://backend.payhero.co.ke/api/v2";
const PAYHERO_USERNAME = process.env.PAYHERO_USERNAME;
const PAYHERO_PASSWORD = process.env.PAYHERO_PASSWORD;

// Create Basic Auth token
const getAuthToken = () => {
    const credentials = `${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

/**
 * Initiate M-Pesa STK Push for deposits
 * @param {string} phoneNumber - Phone number in international format (254XXXXXXXXX)
 * @param {number} amount - Amount to deposit
 * @param {string} accountReference - Reference for the transaction
 * @returns {Promise<Object>} PayHero response
 */
export async function initiateSTKPush(phoneNumber, amount, accountReference) {
    try {
        const authToken = getAuthToken();
        const requestBody = {
            phone_number: phoneNumber,
            amount: amount,
            channel_id: parseInt(process.env.PAYHERO_CHANNEL_ID),
            provider: "m-pesa",
            external_reference: accountReference,
            callback_url: process.env.PAYHERO_CALLBACK_URL,
        };

        console.log("Initiating STK Push:", {
            phoneNumber,
            amount,
            accountReference,
            channelId: process.env.PAYHERO_CHANNEL_ID,
            apiUrl: `${PAYHERO_API_BASE_URL}/payments`,
            authToken: authToken.substring(0, 20) + "...", // Show first 20 chars only
            requestBody,
        });

        const response = await fetch(`${PAYHERO_API_BASE_URL}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authToken,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("PayHero STK Push response:", {
            status: response.status,
            ok: response.ok,
            data: data,
        });

        if (!response.ok) {
            throw new Error(
                data.message || data.error_message || `PayHero API error: ${response.status}`,
            );
        }

        return {
            success: true,
            reference: data.reference || data.transaction_id || data.id,
            message: data.message || "STK Push initiated successfully",
            data: data,
        };
    } catch (error) {
        console.error("PayHero STK Push error:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
        });
        return {
            success: false,
            error: error.message,
        };
    }
}


/**
 * Withdraw funds to M-Pesa or Airtel Money
 * @param {string} phoneNumber - Phone number in international format (254XXXXXXXXX)
 * @param {number} amount - Amount to withdraw
 * @param {string} networkCode - Network code (63902 for M-Pesa, 63903 for Airtel Money)
 * @returns {Promise<Object>} PayHero response
 */
export async function withdrawToMobile(phoneNumber, amount, networkCode) {
    try {
        console.log("Initiating withdrawal:", {
            phoneNumber,
            amount,
            networkCode,
            apiUrl: `${PAYHERO_API_BASE_URL}/wallet/withdraw-mobile`,
        });

        const response = await fetch(
            `${PAYHERO_API_BASE_URL}/wallet/withdraw-mobile`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getAuthToken(),
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    amount: amount,
                    network_code: networkCode,
                    callback_url: process.env.PAYHERO_CALLBACK_URL,
                }),
            },
        );

        const data = await response.json();
        console.log("PayHero withdrawal response:", {
            status: response.status,
            ok: response.ok,
            data: data,
        });

        if (!response.ok) {
            throw new Error(
                data.message || `PayHero API error: ${response.status}`,
            );
        }

        return {
            success: true,
            reference: data.reference || data.transaction_id,
            message: data.message || "Withdrawal initiated successfully",
            data: data,
        };
    } catch (error) {
        console.error("PayHero withdrawal error:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
        });
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
export function validatePhoneNumber(phoneNumber) {
    // Must be in format 254XXXXXXXXX (Kenya)
    const phoneRegex = /^254\d{9}$/;
    return phoneRegex.test(phoneNumber);
}

/**
 * Validate network code
 * @param {string} networkCode - Network code to validate
 * @returns {boolean} True if valid
 */
export function validateNetworkCode(networkCode) {
    return networkCode === "63902" || networkCode === "63903";
}

/**
 * Get network name from code
 * @param {string} networkCode - Network code
 * @returns {string} Network name
 */
export function getNetworkName(networkCode) {
    return networkCode === "63902" ? "M-Pesa" : "Airtel Money";
}
