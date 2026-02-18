import axios from "axios";
import fs from "fs";

export async function getShopifyImageUrl(imagePath) {
  const storeName = process.env.SHOPIFY_STORE_NAME;
  // Use the Access Token if you have it, otherwise this script expects the Admin API Token
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || process.env.SHOPIFY_CLIENT_SECRET;

  const url = `https://${storeName}.myshopify.com/admin/api/2024-01/graphql.json`;

  const query = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          ... on GenericFile {
            url
          }
          ... on MediaImage {
            image {
              url
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    // Note: This simplified example assumes a public URL or base64. 
    // For a real file upload, Shopify requires a staged upload process.
    // This test checks if your AUTHENTICATION is valid.
    const response = await axios({
      url,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query,
        variables: {
          files: [{ alt: "test", contentType: "IMAGE", originalSource: "https://placedog.net/500" }]
        },
      },
    });

    if (response.data.errors) {
      console.error("❌ Shopify GraphQL Error:", JSON.stringify(response.data.errors, null, 2));
      return null;
    }

    const file = response.data.data.fileCreate.files[0];
    return file?.image?.url || file?.url || null;

  } catch (error) {
    if (error.response) {
      console.error("❌ Shopify Auth Failed. Status:", error.response.status);
      console.error("Check if your SHOPIFY_STORE_NAME and ACCESS_TOKEN are correct.");
    } else {
      console.error("❌ Network Error:", error.message);
    }
    return null;
  }
}
