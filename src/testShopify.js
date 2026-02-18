import dotenv from "dotenv";
dotenv.config();
import { getShopifyImageUrl } from "./shopifyUploader.js";

async function test() {
  console.log("🔍 Starting Shopify Upload Test...");
  // Use any small image file you have in your directory for testing
  const testImage = "./test-pet.jpg"; 

  try {
    const url = await getShopifyImageUrl(testImage);
    if (url) {
      console.log("✅ SUCCESS! Generated URL:", url);
      console.log("Check if this opens in a private window. If yes, IG can see it.");
    } else {
      console.log("❌ FAILED: The function returned null.");
    }
  } catch (err) {
    console.error("❌ ERROR during test:", err.message);
  }
}

test();
