import dotenv from "dotenv";
dotenv.config();

import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { getShopifyImageUrl } from "./shopifyUploader.js";
import { getSheetRows } from "./sheetsLogger.js";
import { postToInstagram } from "./postToFacebook.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

    console.log("⏳ Waiting 15s for Shopify CDN...");
    await sleep(15000);

    console.log("📸 Posting to Instagram...");
    const igId = await postToInstagram(fullCaption, publicUrl);

    if (igId) {
      console.log("✅ IG SUCCESS:", igId);
    } else {
      console.error("❌ IG FAILED");
      process.exit(1);
    }

  } catch (error) {
    console.error("❌ PIPELINE ERROR:", error.response?.data || error.message);
    process.exit(1);
  }
}

run();
