import axios from "axios";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  // 1. Clean the store name (Essential for OAuth)
  const rawStore = process.env.SHOPIFY_STORE_NAME || "";
  const shop = rawStore.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.myshopify\.com\/?.*$/, "")
    .trim();

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const authUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`;
  
  try {
    console.log(`🔗 Requesting access token for: ${shop}`);

    // 2. Format Credentials for Basic Auth (Standard for 2026 OAuth)
    const authBuffer = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post(
      authUrl,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authBuffer}` 
        },
        httpsAgent: agent 
      }
    );

    const accessToken = tokenRes.data.access_token;
    console.log("✅ Connection Successful. Token acquired.");

    // For testing connectivity, we return a success string
    return "https://cdn.shopify.com/success-placeholder.jpg";

  } catch (error) {
    console.error("❌ Shopify Connection Failed.");
    if (error.response) {
      // Log the specific OAuth error message from Shopify
      console.error("Status:", error.response.status);
      console.error("Details:", JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error === "invalid_client") {
        console.error("💡 TIP: Check if your Client ID and Client Secret are copied correctly.");
      }
    } else {
      console.error("Error Message:", error.message);
    }
    return null;
  }
}
