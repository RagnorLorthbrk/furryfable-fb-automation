import axios from "axios";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  const rawStore = process.env.SHOPIFY_STORE_NAME || "";
  const shop = rawStore.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.myshopify\.com\/?.*$/, "")
    .trim();
  
  // Use the shpat_ token directly
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || process.env.SHOPIFY_CLIENT_SECRET;

  try {
    console.log(`🔍 Testing direct connection to: ${shop}.myshopify.com`);

    // Direct test call to Shopify Admin API
    const response = await axios.get(
      `https://${shop}.myshopify.com/admin/api/2024-01/shop.json`,
      { 
        headers: { 'X-Shopify-Access-Token': accessToken },
        httpsAgent: agent 
      }
    );

    console.log(`✅ SUCCESS! Connected to store: ${response.data.shop.name}`);
    return "https://cdn.shopify.com/success-placeholder.jpg";

  } catch (error) {
    console.error("❌ Shopify Connection Failed.");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Details:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error Message:", error.message);
    }
    return null;
  }
}
