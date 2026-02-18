import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook, postToInstagram } from "./postToFacebook.js";
import { getShopifyImageUrl } from "./shopifyUploader.js";
import { getLatestBlog } from "./blogFetcher.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("🚀 Starting FurryFable Automation");

  // 1️⃣ Load Google Sheets history
  const history = await getSheetRows();

  // 2️⃣ Fetch latest blog
  let blog = await getLatestBlog();

  // 3️⃣ Check if blog already posted
  if (blog && history.some(row => row.some(cell => String(cell).includes(blog.link)))) {
    console.log(`⏭️ Blog "${blog.title}" already shared. Skipping.`);
    blog = null;
  }

  // 4️⃣ Generate 3 posts
  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    try {
      // 🖼 Generate image (only once)
      const { imagePath, provider } = await generateImage(post);
      const fullCaption = `${post.caption}\n\n${post.hashtags}`;

      // ☁ Upload to Shopify (for IG use)
      const publicUrl = await getShopifyImageUrl(imagePath);

      // 📘 Post to Facebook (uses local image)
      const fbPostId = await postToFacebook(fullCaption, imagePath);
      console.log(`✅ FB Live: ${fbPostId}`);

      // 📸 Post to Instagram (uses Shopify CDN URL)
      let igId = null;

      if (publicUrl && process.env.IG_USER_ID) {
        console.log(`🔍 Attempting IG Post with URL: ${publicUrl}`);

        try {
          await sleep(10000); // small delay before IG publish
          igId = await postToInstagram(fullCaption, publicUrl);

          if (igId) {
            console.log(`📸 IG Live: ${igId}`);
          } else {
            console.log("❌ IG Post failed.");
          }

        } catch (err) {
          console.error("❌ IG API Error:", err.response?.data || err.message);
        }
      } else {
        console.log(`⚠️ IG SKIP: ${!publicUrl ? 'Shopify URL missing' : 'IG_USER_ID missing'}`);
      }

      // 💬 Add Facebook Comment
      try {
        await axios.post(
          `https://graph.facebook.com/v24.0/${fbPostId}/comments`,
          {
            message: post.engagementComment,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
          }
        );
        console.log("💬 FB Comment added");
      } catch (e) {
        console.warn("⚠️ FB Comment failed");
      }

      // 💬 Add Instagram Comment (if IG succeeded)
      if (igId) {
        try {
          await axios.post(
            `https://graph.facebook.com/v24.0/${igId}/comments`,
            {
              message: post.engagementComment,
              access_token: process.env.FB_PAGE_ACCESS_TOKEN
            }
          );
          console.log("💬 IG Comment added");
        } catch (e) {
          console.warn("⚠️ IG Comment failed:", e.response?.data || e.message);
        }
      }

      // 📊 Log to Google Sheets
      await appendRow({
        date: new Date().toISOString(),
        ...post,
        imageProvider: provider,
        fbPostId,
        similarityScore: 0
      });

      await sleep(5000); // delay between posts

    } catch (err) {
      console.error("❌ Error in post loop:", err.message);
    }
  }
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
