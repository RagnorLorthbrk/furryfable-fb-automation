import axios from "axios";
import fs from "fs";

export async function getShopifyImageUrl(imagePath) {
  const shop = process.env.SHOPIFY_STORE_NAME.replace(".myshopify.com", "").trim();
  const accessToken = process.env.SHOPIFY_CLIENT_SECRET;

  try {
    // STEP 1: Request a staged upload target
    const stagedResponse = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
      {
        query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
          }
        }`,
        variables: {
          input: [{
            filename: "pet-post.jpg",
            mimeType: "image/jpeg",
            resource: "IMAGE",
            httpMethod: "POST"
          }]
        }
      },
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const target = stagedResponse.data.data.stagedUploadsCreate.stagedTargets[0];

    // STEP 2: Push the actual file to the target URL
    const formData = new FormData();
    target.parameters.forEach(p => formData.append(p.name, p.value));
    formData.append("file", fs.createReadStream(imagePath));

    await axios.post(target.url, formData);

    // STEP 3: Finalize the file in Shopify
    const fileResponse = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
      {
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } }
          }
        }`,
        variables: {
          files: [{ contentType: "IMAGE", originalSource: target.resourceUrl }]
        }
      },
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );

    const finalUrl = fileResponse.data.data.fileCreate.files[0]?.image?.url;
    return finalUrl ? finalUrl.split('?')[0] : null;

  } catch (error) {
    console.error("❌ Shopify Staged Upload Failed:", error.message);
    return null;
  }
}
