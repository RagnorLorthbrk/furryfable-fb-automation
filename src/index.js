import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook, postToInstagram } from "./postToFacebook.js";
import { getShopifyImageUrl } from "./shopifyUploader.js";
import { getLatestBlog } from "./blogFetcher.js";

async function run() {
  console.log("🚀 Starting FurryFable Automation");
  
  // 1. Get complete history from Google Sheets
  const history = await getSheetRows();
  let blog = await getLatestBlog();

  // 2. CHECK ENTIRE HISTORY FOR BLOG URL
  if (blog) {
    const alreadyPosted = history.some(row => row.some(cell => String(cell).includes(blog.link)));
    if (alreadyPosted) {
      console.log(`⏭️ Blog "${blog.title}" already exists in history. Skipping.`);
      blog = null; // Forces AI to generate 3 unique general posts instead
    }
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = `${post.caption}\n\n${post.hashtags}`;

    // A. Shopify Upload (Public URL for Instagram)
    const publicUrl = await getShopifyImageUrl(imagePath);

    // B. Facebook Post
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB Live: ${fbPostId}`);

    // C. Instagram Post (Using verified ID: 17841473502150668)
    if (publicUrl) {
      const igId = await postToInstagram(fullCaption, publicUrl);
      console.log(`📸 IG Live: ${igId}`);
    }

    // D. Facebook Engagement Comment
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
    } catch (e) { console.warn("⚠️ Comment failed"); }

    // E. Log 13 Columns to Sheets
    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0
    });

    await new Promise(r => setTimeout(r, 10000)); // 10s delay to prevent spam flags
  }
  console.log("✅ All tasks complete!");
}

run().catch(err => { console.error(err); process.exit(1); });
