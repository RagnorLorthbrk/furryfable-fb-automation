import dotenv from "dotenv";
dotenv.config();
import { getShopifyImageUrl } from "./shopifyUploader.js";
import fs from "fs";

async function testUpload() {
  console.log("🔍 Starting Shopify Connection Test...");
  console.log("Store:", process.env.SHOPIFY_STORE_NAME);

  const testImagePath = "./test-pet.jpg";
  if (!fs.existsSync(testImagePath)) {
    fs.writeFileSync(testImagePath, "fake-image-data");
  }

  try {
    const url = await getShopifyImageUrl(testImagePath);
    if (url) {
      console.log("🔥 SUCCESS! Shopify URL:", url);
    } else {
      console.log("❌ FAILED: The uploader returned null. Check logs above.");
    }
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err.message);
  }
}

testUpload();
