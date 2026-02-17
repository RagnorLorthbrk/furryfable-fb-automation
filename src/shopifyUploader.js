import axios from "axios";
import fs from "fs";

async function getFreshToken() {
  try {
    // Correct 2026 POST request for token exchange
    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/oauth/access_token`,
      {
        grant_type: "client_credentials",
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Shopify Auth Failed. Check your Client ID/Secret in GitHub Secrets.");
    throw error;
  }
}

export async function getShopifyImageUrl(imagePath) {
  try {
    const token = await getFreshToken();
    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2025-01/graphql.json`,
      {
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } }
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

    return response.data.data.fileCreate.files[0]?.image?.url;
  } catch (error) {
    console.error("🛍️ Shopify Upload Failed:", error.message);
    return null;
  }
}
