import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeShopName(raw) {
  if (!raw) throw new Error("Missing SHOPIFY_STORE_NAME");
  return raw
    .replace("https://", "")
    .replace("http://", "")
    .replace(".myshopify.com", "")
    .trim();
}

async function getFreshShopifyToken(shop) {
  if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET) {
    throw new Error("Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET");
  }

  const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`;
  console.log("🔑 Token URL:", tokenUrl);

  const response = await axios.post(tokenUrl, {
    client_id: process.env.SHOPIFY_CLIENT_ID,
    client_secret: process.env.SHOPIFY_CLIENT_SECRET,
    grant_type: "client_credentials"
  });

  if (!response.data?.access_token) {
    throw new Error("Failed to retrieve Shopify access token");
  }

  console.log("🔑 Fresh Shopify token acquired");
  return response.data.access_token;
}

export async function getShopifyImageUrl(imagePath) {
  const shop = normalizeShopName(process.env.SHOPIFY_STORE_NAME);
  const graphqlUrl = `https://${shop}.myshopify.com/admin/api/2026-01/graphql.json`;

  console.log("🌍 Shop:", shop);
  console.log("🌍 GraphQL URL:", graphqlUrl);

  try {
    const accessToken = await getFreshShopifyToken(shop);
    console.log("🔎 Token prefix:", accessToken.substring(0, 15));

    // STEP 1 — Request staged upload
    const stagedResponse = await axios.post(
      graphqlUrl,
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

    // STEP 2 — Upload to staging
    const formData = new FormData();
    target.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fs.createReadStream(imagePath));

    await axios.post(target.url, formData, {
      headers: formData.getHeaders()
    });

    console.log("✅ Staged upload complete");

    // STEP 3 — Create permanent file
    const fileCreateResponse = await axios.post(
      graphqlUrl,
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

    // STEP 4 — Poll for CDN URL
    let attempts = 0;
    let finalUrl = fileNode.image?.url || null;

    while (!finalUrl && attempts < 10) {
      attempts++;
      console.log(`⏳ Waiting for CDN... ${attempts}/10`);
      await sleep(5000);

      const pollResponse = await axios.post(
        graphqlUrl,
        {
          query: `
            query {
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
    console.error("❌ FULL SHOPIFY ERROR:");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("URL:", error.config?.url);
    console.error("Response:", error.response?.data);
    return null;
  }
}
