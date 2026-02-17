import dotenv from "dotenv";
dotenv.config();

import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook } from "./postToFacebook.js";
import { getLatestBlog } from "./blogFetcher.js";
import axios from "axios";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log("🚀 Automation started");

  const history = await getSheetRows();
  let blog = await getLatestBlog();

  // 🛡️ Duplicate Blog Protection
  if (blog) {
    const blogExists = history.some(row => row.includes(blog.link));
    if (blogExists) {
      console.log("⏭️ Blog already posted previously. Skipping blog content.");
      blog = null; 
    }
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = post.caption + "\n\n" + post.hashtags;

    // 1. Post to Facebook
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ Post live: ${fbPostId}`);

    // 2. Add Engagement Comment
    try {
      const commentUrl = `https://graph.facebook.com/v24.0/${fbPostId}/comments`;
      await axios.post(commentUrl, {
        message: "Be honest… Who was the last one you said goodbye to before leaving home today? Your pet’s name + emoji. Let’s fill this with them. (Example: “Leo 🐶”)",
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
      console.log("💬 Engagement comment added.");
    } catch (e) {
      console.warn("⚠️ Comment failed, but post is live.");
    }

    // 🕒 Rate Limit Protection
    await wait(3000);

    // 3. Log to Sheets
    await appendRow({
      date: new Date().toISOString(),
      topic: post.topic,
      caption: post.caption,
      fbPostId,
      blogUrl: blog ? blog.link : "N/A"
    });
  }
}

run().catch(console.error);
