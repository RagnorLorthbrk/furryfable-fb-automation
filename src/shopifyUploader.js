import axios from "axios";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  // Clean the store name
  const shop = process.env.SHOPIFY_STORE_NAME
    .replace("https://", "")
    .replace(".myshopify.com", "")
    .split("/")[0]; // Removes any trailing slashes

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    console.log(`🔑 Requesting token for: ${shop}`);

    // FIX: Using URLSearchParams is REQUIRED for the 2026 OAuth update
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const tokenRes = await axios.post(
      `https://${shop}.myshopify.com/admin/oauth/access_token`,
      params, // Sent as x-www-form-urlencoded
      { 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: agent 
      }
    );

    const token = tokenRes.data.access_token;
    console.log("✅ Shopify Token acquired.");
    
    // For testing purposes, we return a placeholder once authenticated
    return "https://cdn.shopify.com/success-placeholder.jpg";

  } catch (error) {
    // This will now print the EXACT reason Shopify is mad
    console.error("❌ Shopify API Error:");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return null;
  }
}
