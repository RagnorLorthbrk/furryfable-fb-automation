import axios from "axios";
import https from "https";
import fs from "fs";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  const shop = process.env.SHOPIFY_STORE_NAME.replace("https://", "").replace(".myshopify.com", "");
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // 1. Get Fresh Token
    const tokenRes = await axios.post(
      `https://${shop}.myshopify.com/admin/oauth/access_token`,
      { client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" },
      { httpsAgent: agent }
    );
    const token = tokenRes.data.access_token;

    // 2. Upload Logic (Simplified for connectivity test)
    // Replace this with your actual GraphQL upload logic
    console.log("✅ Authenticated successfully with Shopify.");
    return "https://cdn.shopify.com/placeholder-success-url.jpg";

  } catch (error) {
    console.error("❌ Shopify Uploader Error:", error.response?.data || error.message);
    return null;
  }
}
