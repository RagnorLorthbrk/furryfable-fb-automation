import dotenv from "dotenv";
dotenv.config();

import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { getShopifyImageUrl } from "./shopifyUploader.js";
import { getSheetRows } from "./sheetsLogger.js";
import { postToInstagram } from "./postToFacebook.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log("🚀 IG FULL PIPELINE TEST STARTED");

  try {
    // 1️⃣ Load history (prevents repetitive AI content)
    const history = await getSheetRows();

    // 2️⃣ Generate only ONE post
    const posts = await generatePosts(history, null);
    const post = posts[0];

    const fullCaption = `${post.caption}\n\n${post.hashtags}`;

    console.log("🖼 Generating AI image...");
    const { imagePath } = await generateImage(post);

    console.log("☁ Uploading to Shopify...");
    const publicUrl = await getShopifyImageUrl(imagePath);

    if (!publicUrl) {
      console.error("❌ Shopify upload failed.");
      process.exit(1);
    }

    console.log("✅ Shopify URL ready:", publicUrl);

    // IMPORTANT: Wait before first IG attempt
    console.log("⏳ Waiting 60 seconds before first Instagram attempt...");
    await sleep(60000);

    console.log("📸 Starting Instagram publish attempts (1 min spacing)...");

    let igId = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
      console.log(`⏳ IG Attempt ${attempt}/5`);

      igId = await postToInstagram(fullCaption, publicUrl);

      if (igId) {
        console.log("✅ IG SUCCESS:", igId);
        break;
      }

      if (attempt < 5) {
        console.log("⏳ Waiting 60 seconds before next attempt...");
        await sleep(60000);
      }
    }

    if (!igId) {
      console.error("❌ IG FAILED after 5 attempts (~5 minutes total)");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ PIPELINE ERROR:", error.response?.data || error.message);
    process.exit(1);
  }
}

run();
