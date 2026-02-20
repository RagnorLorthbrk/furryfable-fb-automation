import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function getShopifyImageUrl(imagePath) {
  // Cleans the store name to ensure it's just the handle (e.g., "vfsn10-30")
  const rawShop = process.env.SHOPIFY_STORE_NAME || "";
  const shop = rawShop.replace(".myshopify.com", "").replace(/^https?:\/\//, "").trim();
  
  // Trimming the token is crucial; hidden spaces in GitHub Secrets often cause "Invalid API Key" errors
  const accessToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    console.error("❌ Missing SHOPIFY_ADMIN_API_ACCESS_TOKEN");
    return null;
  }

  if (!shop) {
    console.error("❌ Missing SHOPIFY_STORE_NAME");
    return null;
  }

  const shopifyUrl = `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`;

  try {
    // STEP 1 — Request staged upload
    const stagedResponse = await axios.post(
      shopifyUrl,
      {
        query: `
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters { name value }
              }
              userErrors { field message }
            }
          }
        `,
        variables: {
          input: [{
            filename: `pet-post-${Date.now()}.png`,
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

    const stagedData = stagedResponse.data?.data?.stagedUploadsCreate;
    
    if (stagedData?.userErrors?.length > 0) {
      console.error("❌ Shopify GraphQL User Errors:", stagedData.userErrors);
      return null;
    }

    const target = stagedData?.stagedTargets?.[0];

    if (!target) {
      console.error("❌ No staged upload target returned. Full Response:", JSON.stringify(stagedResponse.data));
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
      shopifyUrl,
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
      console.error("❌ fileCreate failed:", JSON.stringify(fileCreateResponse.data));
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
        shopifyUrl,
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
    if (error.response) {
      console.error("❌ Shopify API Error Status:", error.response.status);
      console.error("❌ Shopify API Error Data:", JSON.stringify(error.response.data));
    } else {
      console.error("❌ Shopify Upload Error:", error.message);
    }
    return null;
  }
}
