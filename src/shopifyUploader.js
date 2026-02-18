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
    // STEP 1: Request staged upload target
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
            filename: "pet-post.jpg",
            mimeType: "image/jpeg",
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

    const target = stagedResponse.data.data.stagedUploadsCreate.stagedTargets[0];

    if (!target) {
      console.error("❌ No staged upload target returned");
      return null;
    }

    // STEP 2: Upload file to staged target
    const formData = new FormData();
    target.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fs.createReadStream(imagePath));

    await axios.post(target.url, formData, {
      headers: formData.getHeaders()
    });

    // STEP 3: Finalize file creation in Shopify
    const fileResponse = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
      {
        query: `
          mutation fileCreate($files: [FileCreateInput!]!) {
            fileCreate(files: $files) {
              files {
                ... on MediaImage {
                  image { url }
                }
              }
            }
          }
        `,
        variables: {
          files: [{
            contentType: "IMAGE",
            originalSource: target.resourceUrl
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

    const finalUrl = fileResponse.data.data.fileCreate.files[0]?.image?.url;

    if (!finalUrl) {
      console.error("❌ Shopify did not return final image URL");
      return null;
    }

    return finalUrl.split("?")[0];

  } catch (error) {
    console.error("❌ Shopify Upload Error:", error.response?.data || error.message);
    return null;
  }
}
