import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function getShopifyImageUrl(imagePath) {
  const shop = process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "").trim();
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("❌ Missing SHOPIFY_ADMIN_API_ACCESS_TOKEN");
    return null;
  }

  try {
    // STEP 1 — Request staged upload
    const stagedResponse = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
      {
        query: `
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters { name value }
              }
            }
          }
        `,
        variables: {
          input: [{
            filename: "pet-post.png",
            mimeType: "image/png",
            resource: "IMAGE",
            httpMethod: "POST"
          }]
        }
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json"
        }
      }
    );

    const target = stagedResponse.data?.data?.stagedUploadsCreate?.stagedTargets?.[0];

    if (!target) {
      console.error("❌ No staged upload target returned:", stagedResponse.data);
      return null;
    }

    // STEP 2 — Upload file
    const formData = new FormData();
    target.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fs.createReadStream(imagePath));

    await axios.post(target.url, formData, {
      headers: formData.getHeaders()
    });

    console.log("✅ Shopify upload complete:", target.resourceUrl);

    // IMPORTANT:
    // target.resourceUrl is already the final CDN URL
    return target.resourceUrl.split("?")[0];

  } catch (error) {
    console.error("❌ Shopify Upload Error:", error.response?.data || error.message);
    return null;
  }
}
