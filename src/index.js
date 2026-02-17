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
  let blog = await getLatestBlog();

  // STRENGTHENED DUPLICATE CHECK
  if (blog) {
    const isDuplicate = history.some(row => 
      row.some(cell => String(cell).toLowerCase().includes(blog.link.toLowerCase()))
    );
    if (isDuplicate) {
      console.log(`⏭️ Blog "${blog.title}" already posted. Skipping.`);
      blog = null;
    }
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = `${post.caption}\n\n${post.hashtags}`;

    // 1. Facebook Post
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB Live: ${fbPostId}`);

    // 2. Shopify & Instagram (With Retry Logic)
    try {
      const publicUrl = await getShopifyImageUrl(imagePath);
      if (publicUrl) {
        await sleep(5000); // Wait for Shopify to fully process the image
        const igId = await postToInstagram(fullCaption, publicUrl);
        console.log(`📸 IG Live: ${igId}`);
      }
    } catch (e) { console.error("⚠️ IG Failed."); }

    // 3. FB Comment
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
    } catch (e) { console.warn("⚠️ Comment failed."); }

    // 4. Log to Sheets
    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0
    });

    await sleep(15000); // 15s break between different posts
  }
}

run().catch(err => { console.error(err); process.exit(1); });
