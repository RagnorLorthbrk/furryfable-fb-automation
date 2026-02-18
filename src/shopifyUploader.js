import axios from "axios";
import https from "https";
import fs from "fs";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function getShopifyImageUrl(imagePath) {
  const rawStore = process.env.SHOPIFY_STORE_NAME || "";
  const shop = rawStore.toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.myshopify\.com\/?.*$/, "")
    .trim();
  
  // Uses your verified token from the successful test
  const accessToken = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    const imageData = fs.readFileSync(imagePath, { encoding: "base64" });

    // This mutation uploads the image to Shopify Files
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
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
      { 
        headers: { 'X-Shopify-Access-Token': accessToken },
        httpsAgent: agent 
      }
    );

    const url = response.data.data.fileCreate.files[0]?.image?.url;
    
    if (url) {
      const cleanUrl = url.split('?')[0]; // Clean for Instagram
      console.log("📸 Shopify URL Ready:", cleanUrl);
      return cleanUrl;
    }
    
    console.error("❌ Shopify returned no URL. Errors:", response.data.data.fileCreate.userErrors);
    return null;

  } catch (error) {
    console.error("❌ Shopify Upload Failed.");
    return null;
  }
}
