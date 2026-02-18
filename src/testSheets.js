const axios = require('axios');
require('dotenv').config();

async function runTest() {
    const shop = process.env.SHOPIFY_STORE_NAME;
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    console.log(`🔍 Starting Shopify Connection Test for: ${shop}...`);

    try {
        // STEP 1: Exchange Credentials for a Token (The 2026 Way)
        console.log("🔑 Requesting fresh Access Token...");
        const tokenResponse = await axios.post(
            `https://${shop}.myshopify.com/admin/oauth/access_token`,
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResponse.data.access_token;
        console.log("✅ Token acquired successfully.");

        // STEP 2: Test the Connection
        const shopResponse = await axios.get(
            `https://${shop}.myshopify.com/admin/api/2024-01/shop.json`,
            { headers: { 'X-Shopify-Access-Token': accessToken } }
        );

        console.log(`🎉 SUCCESS! Connected to store: ${shopResponse.data.shop.name}`);
    } catch (error) {
        console.error("❌ FAILED: The connection attempt failed.");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Error: ${error.message}`);
        }
        process.exit(1); // Force GitHub Action to show failure
    }
}

runTest();
