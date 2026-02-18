import dotenv from "dotenv";
dotenv.config();
import { getShopifyImageUrl } from "./shopifyUploader.js";

async function test() {
  console.log("🔍 Starting Shopify Connection Test...");
  const testImage = "./test-pet.jpg"; 

  try {
    const url = await getShopifyImageUrl(testImage);
    if (url) {
      console.log("✅ SUCCESS! Generated URL:", url);
    } else {
      console.log("❌ FAILED: The uploader returned null. Check shopifyUploader.js logic.");
      process.exit(1); 
    }
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err.message);
    process.exit(1);
  }
}

test();
