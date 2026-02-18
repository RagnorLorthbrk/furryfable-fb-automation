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

  // 3️⃣ Skip blog if already posted
  if (blog && history.some(row => row.some(cell => String(cell).includes(blog.link)))) {
    console.log(`⏭️ Blog "${blog.title}" already shared. Skipping.`);
    blog = null;
  }

  // 4️⃣ Generate 3 posts
  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    try {
      console.log("--------------------------------------------------");
      console.log(`📝 Creating post about: ${post.topic}`);

      // 🖼 Generate image ONCE
      const { imagePath, provider } = await generateImage(post);
      const fullCaption = `${post.caption}\n\n${post.hashtags.join(" ")}`;

      // ☁ Upload to Shopify for IG
      const publicUrl = await getShopifyImageUrl(imagePath);

      if (!publicUrl) {
        console.error("❌ Shopify upload failed. Skipping IG.");
      }

      // 📘 Post to Facebook
      const fbPostId = await postToFacebook(fullCaption, imagePath);
      console.log(`✅ FB Live: ${fbPostId}`);

      // 📸 Post to Instagram
      let igId = null;

      if (publicUrl && process.env.IG_USER_ID) {
        try {
          console.log(`🔍 Attempting IG Post with URL: ${publicUrl}`);
          await sleep(15000); // slight delay before IG call
          igId = await postToInstagram(fullCaption, publicUrl);

          if (igId) {
            console.log(`📸 IG Live: ${igId}`);
          } else {
            console.log("❌ IG Post failed.");
          }
        } catch (err) {
          console.error("❌ IG API Error:", err.response?.data || err.message);
        }
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
      } catch (err) {
        console.warn("⚠️ FB Comment failed:", err.response?.data || err.message);
      }

      // 💬 Add Instagram Comment
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
        } catch (err) {
          console.warn("⚠️ IG Comment failed:", err.response?.data || err.message);
        }
      }

      // 📊 Log to Google Sheets
      await appendRow({
        date: new Date().toISOString(),
        topic: post.topic,
        angle: post.angle,
        postType: post.postType,
        breed: post.breed || "",
        furColor: post.furColor || "",
        caption: post.caption,
        hashtags: post.hashtags.join(" "),
        altText: "",
        imagePrompt: post.imagePrompt,
        imageProvider: provider,
        fbPostId,
        similarityScore: 0
      });

      console.log("📊 Logged to Google Sheets");

      // 🔥 IMPORTANT FIX — Increase delay between posts
      console.log("⏳ Waiting 30 seconds before next post...");
      await sleep(30000);

    } catch (err) {
      console.error("❌ Error inside post loop:", err.message);
    }
  }

  console.log("🎉 Automation completed.");
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
