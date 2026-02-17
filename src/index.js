import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook } from "./postToFacebook.js";
import { getLatestBlog } from "./blogFetcher.js";

async function run() {
  console.log("🚀 Automation started");
  const history = await getSheetRows();
  const blog = await getLatestBlog();
  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fbPostId = await postToFacebook(post.caption + "\n\n" + post.hashtags, imagePath);

    // Post the dynamic AI-generated comment
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
      console.log("💬 Dynamic comment posted.");
    } catch (e) { console.warn("⚠️ Comment failed."); }

    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0
    });
    
    await new Promise(r => setTimeout(r, 3000)); // Rate limit protection
  }
  console.log("✅ Automation complete");
}

run().catch(err => { console.error(err); process.exit(1); });
