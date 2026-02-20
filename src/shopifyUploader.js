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
      `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`,
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

    // STEP 2 — Upload file to staging
    const formData = new FormData();
    target.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fs.createReadStream(imagePath));

    await axios.post(target.url, formData, {
      headers: formData.getHeaders()
    });

    console.log("✅ Staged upload complete");

    // STEP 3 — Create Shopify file (permanent)
    const fileCreateResponse = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`,
      {
        query: `
          mutation fileCreate($files: [FileCreateInput!]!) {
            fileCreate(files: $files) {
              files {
                id
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

    const fileNode = fileCreateResponse.data?.data?.fileCreate?.files?.[0];

    if (!fileNode?.id) {
      console.error("❌ fileCreate failed:", fileCreateResponse.data);
      return null;
    }

    console.log("✅ fileCreate successful, polling for CDN URL...");

    // STEP 4 — Poll until CDN URL is ready
    let attempts = 0;
    let finalUrl = fileNode.image?.url || null;

    while (!finalUrl && attempts < 10) {
      attempts++;
      console.log(`⏳ Waiting for Shopify CDN... attempt ${attempts}/10`);
      await sleep(5000);

      const pollResponse = await axios.post(
        `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`,
        {
          query: `
            query getFile {
              node(id: "${fileNode.id}") {
                ... on MediaImage {
                  image {
                    url
                  }
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

      finalUrl = pollResponse.data?.data?.node?.image?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ CDN URL not ready after polling.");
      return null;
    }

    console.log("✅ Permanent CDN URL ready:", finalUrl);

    return finalUrl.split("?")[0];

  } catch (error) {
    console.error("❌ Shopify Upload Error:", error.response?.data || error.message);
    return null;
  }
}
