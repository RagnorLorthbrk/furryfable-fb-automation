import dotenv from "dotenv";
dotenv.config();

import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook } from "./postToFacebook.js";
import { getLatestBlog } from "./blogFetcher.js";

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log("🚀 Automation started");

  const history = await getSheetRows();
  let blog = await getLatestBlog();

  // 🛡️ Duplicate Blog Protection
  if (blog) {
    const blogExists = history.some(row => row.includes(blog.link));
    if (blogExists) {
      console.log("⏭️ Blog already posted previously. Skipping blog-based content.");
      blog = null; // Set to null so generatePosts only makes 2 general posts
    }
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = post.caption + "\n\n" + post.hashtags;

    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ Post live: ${fbPostId}`);

    // 🕒 Rate Limit Protection (3-second delay)
    await wait(3000);

    await appendRow({
      date: new Date().toISOString(),
      topic: post.topic,
      angle: post.angle,
      postType: post.postType,
      breed: post.breed,
      furColor: post.furColor,
      caption: post.caption,
      hashtags: post.hashtags,
      altText: post.altText,
      imagePrompt: post.imagePrompt,
      imageProvider: provider,
      fbPostId,
      blogUrl: blog ? blog.link : "N/A", // Log the URL for future checks
      similarityScore: 0
    });
  }

  console.log("✅ Automation complete");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
