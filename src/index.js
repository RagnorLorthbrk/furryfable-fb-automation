import dotenv from "dotenv";
dotenv.config();

import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook } from "./postToFacebook.js";
import { getLatestBlog } from "./blogFetcher.js";

async function run() {
  console.log("🚀 Automation started");

  const history = await getSheetRows();
  console.log("Existing rows:", history.length);

  const blog = await getLatestBlog();
  console.log("Latest blog:", blog?.title || "None found");

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);

    const fullCaption = post.caption + "\n\n" + post.hashtags;

    const fbPostId = await postToFacebook(fullCaption, imagePath);

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
      similarityScore: 0
    });
  }

  console.log("✅ Automation complete");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
