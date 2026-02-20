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

  const history = await getSheetRows();

  const previousTopics = history
    .map(row => (row[1] || "").toString().trim().toLowerCase())
    .filter(Boolean);

  let blog = await getLatestBlog();

  if (blog && history.some(row => row.some(cell => String(cell).includes(blog.link)))) {
    console.log(`⏭️ Blog "${blog.title}" already shared. Skipping blog.`);
    blog = null;
  }

  let post = null;
  let attempts = 0;

  while (!post && attempts < 3) {
    attempts++;
    console.log(`🔄 Generating posts (Attempt ${attempts})...`);

    const posts = await generatePosts(history, blog);

    if (!posts || posts.length === 0) continue;

    for (const candidate of posts) {
      const topicNormalized = (candidate.topic || "").trim().toLowerCase();

      if (!previousTopics.includes(topicNormalized)) {
        post = candidate;
        break;
      } else {
        console.log(`⚠️ Duplicate topic detected: ${candidate.topic}`);
      }
    }
  }

  // 🔥 If still duplicate after 3 attempts → force first generated
  if (!post) {
    console.log("⚠️ All attempts produced duplicates. Forcing publish.");
    const fallbackPosts = await generatePosts(history, blog);
    post = fallbackPosts[0];
  }

  try {
    console.log("--------------------------------------------------");
    console.log(`📝 Creating post about: ${post.topic}`);

    const { imagePath, provider } = await generateImage(post);
    const fullCaption = `${post.caption}\n\n${post.hashtags.join(" ")}`;

    const publicUrl = await getShopifyImageUrl(imagePath);

    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB Live: ${fbPostId}`);

    let igId = null;

    if (publicUrl && process.env.IG_USER_ID) {
      try {
        console.log(`🔍 Attempting IG Post with URL: ${publicUrl}`);
        await sleep(15000);
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

    // FB Comment
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

    // IG Comment
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

  } catch (err) {
    console.error("❌ Error during post creation:", err.message);
  }

  console.log("🎉 Automation completed.");
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
