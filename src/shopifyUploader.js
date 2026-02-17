import axios from "axios";
import fs from "fs";

/**
 * Fetches a fresh 24-hour token using Client Credentials (2026 Shopify Update)
 */
async function getFreshToken() {
  const shop = process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "").trim();
  
  try {
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/oauth/access_token`,
      {
        grant_type: "client_credentials",
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error(`❌ Shopify Auth Failed:`, error.response?.data || error.message);
    throw new Error("Verify your Client ID/Secret in GitHub Secrets.");
  }
}

/**
 * Uploads image to Shopify and returns a CLEAN public URL for Instagram
 */
export async function getShopifyImageUrl(imagePath) {
  const shop = process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "").trim();
  
  try {
    const token = await getFreshToken();
    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`,
      {
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } }
            userErrors { field message }
          }
        }`,
        variables: {
          files: [{
            alt: "FurryFable Social Content",
            contentType: "IMAGE",
            originalSource: `data:image/jpeg;base64,${imageData}`
          }]
        }
      },
      { headers: { "X-Shopify-Access-Token": token } }
    );

    const rawUrl = response.data.data.fileCreate.files[0]?.image?.url;
    
    // FIX: Strip URL parameters so Instagram doesn't reject it
    if (rawUrl) {
      const cleanUrl = rawUrl.split('?')[0]; 
      console.log("📸 Shopify URL Ready (Cleaned):", cleanUrl);
      return cleanUrl;
    }
    
    return null;
  } catch (error) {
    console.error("🛍️ Shopify Upload Error:", error.message);
    return null;
  }
}
