import axios from "axios";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  // Ultra-clean store name logic
  const rawStore = process.env.SHOPIFY_STORE_NAME || "";
  const shop = rawStore.toLowerCase().replace(/^https?:\/\//, "").replace(/\.myshopify\.com\/?.*$/, "").trim();

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const authUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`;
  console.log(`🔗 Attempting OAuth at: ${authUrl}`);

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const tokenRes = await axios.post(authUrl, params, { 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      httpsAgent: agent 
    });

    console.log("✅ Token acquired successfully.");
    return "https://cdn.shopify.com/success.jpg";

  } catch (error) {
    console.error("❌ Shopify OAuth Error:");
    if (error.response && typeof error.response.data === 'string' && error.response.data.includes('invalid_request')) {
      console.error("Critical: Shopify rejected the request. Check if Client ID/Secret are correct and Scopes are set.");
    }
    console.error(error.response?.data || error.message);
    return null;
  }
}
