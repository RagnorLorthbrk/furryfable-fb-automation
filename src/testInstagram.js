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
    // 1️⃣ Load history so AI avoids repetition
    const history = await getSheetRows();

    // 2️⃣ Generate only 1 post
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

    console.log("✅ Shopify CDN URL:", publicUrl);

    console.log("📸 Attempting Instagram publish with retry logic...");

    let igId = null;
    let attempts = 0;

    while (!igId && attempts < 5) {
      attempts++;
      console.log(`⏳ IG Attempt ${attempts}/5`);

      igId = await postToInstagram(fullCaption, publicUrl);

      if (!igId) {
        console.log("⏳ IG not ready, waiting 30 seconds...");
        await sleep(30000);
      }
    }

    if (igId) {
      console.log("✅ IG SUCCESS:", igId);
    } else {
      console.error("❌ IG FAILED after 5 attempts");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ PIPELINE ERROR:", error.response?.data || error.message);
    process.exit(1);
  }
}

run();
