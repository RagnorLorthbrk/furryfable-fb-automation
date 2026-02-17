import axios from "axios";
import fs from "fs";

/**
 * Automatically fetches a fresh 24-hour token using Client Credentials
 */
async function getFreshToken() {
  const shop = process.env.SHOPIFY_STORE_NAME;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/oauth/access_token`,
      {
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Token Refresh Failed:", error.response?.data || error.message);
    throw new Error("Could not authenticate with Shopify");
  }
}

/**
 * Uploads local image to Shopify to get a public URL for Instagram
 */
export async function getShopifyImageUrl(imagePath) {
  const imageData = fs.readFileSync(imagePath, { encoding: "base64" });
  const token = await getFreshToken();

  try {
    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2025-01/graphql.json`,
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

    const url = response.data.data.fileCreate.files[0]?.image?.url;
    console.log("🛍️ Shopify Public URL:", url);
    return url;
  } catch (error) {
    console.error("🛍️ Shopify Upload Error:", error.message);
    return null;
  }
}
