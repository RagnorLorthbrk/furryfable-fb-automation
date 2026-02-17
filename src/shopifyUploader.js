import axios from "axios";
import fs from "fs";

async function getFreshToken() {
  // Cleans up the store name in case there's an extra .myshopify.com
  const shop = process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "");
  
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
    console.error("❌ Shopify Auth Error:", error.response?.status, error.message);
    throw error;
  }
}

export async function getShopifyImageUrl(imagePath) {
  try {
    const token = await getFreshToken();
    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "")}.myshopify.com/admin/api/2026-01/graphql.json`,
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
    console.error("🛍️ Shopify Upload Failed.");
    return null;
  }
}
