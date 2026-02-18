import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

    // STEP 3 — Finalize file
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
              userErrors {
                field
                message
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

    const fileNode = fileResponse.data?.data?.fileCreate?.files?.[0];

    if (!fileNode) {
      console.error("❌ Shopify fileCreate returned empty:", fileResponse.data);
      return null;
    }

    // STEP 4 — Retry until image URL exists
    let attempts = 0;
    let finalUrl = fileNode.image?.url || null;

    while (!finalUrl && attempts < 5) {
      console.log(`⏳ Shopify processing... retry ${attempts + 1}/5`);
      await sleep(3000);
      attempts++;

      const retryResponse = await axios.post(
        `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
        {
          query: `
            query {
              node(id: "${fileNode.id}") {
                ... on MediaImage {
                  image { url }
                }
              }
            }
          `
        },
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
          }
        }
      );

      finalUrl = retryResponse.data?.data?.node?.image?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ Shopify image URL not ready after retries.");
      return null;
    }

    console.log("✅ Shopify image ready:", finalUrl);
    return finalUrl.split("?")[0];

  } catch (error) {
    console.error("❌ Shopify Upload Error:", error.response?.data || error.message);
    return null;
  }
}
