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

  if (blog && history.some(row => row.some(cell => String(cell).includes(blog.link)))) {
    console.log(`⏭️ Blog "${blog.title}" already shared. Skipping.`);
    blog = null;
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = `${post.caption}\n\n${post.hashtags}`;

    // 1. Get Public URL via Shopify
    const publicUrl = await getShopifyImageUrl(imagePath);

    // 2. Post to Facebook
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB Live: ${fbPostId}`);

    // 3. Post to Instagram (With Debugging)
    if (publicUrl && process.env.IG_USER_ID) {
      console.log(`🔍 DEBUG: Attempting IG Post with URL: ${publicUrl}`);
      try {
        await sleep(10000); // 10s wait for Shopify to finish processing
        const igId = await postToInstagram(fullCaption, publicUrl);
        if (igId) {
          console.log(`📸 IG Live: ${igId}`);
        } else {
          console.log(`❌ IG Post failed silently.`);
        }
      } catch (err) {
        console.error(`❌ IG API Error:`, err.response?.data || err.message);
      }
    } else {
      console.log(`⚠️ IG SKIP: ${!publicUrl ? 'Shopify URL missing' : 'IG_USER_ID missing'}`);
    }

    // 4. Facebook Comment
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
    } catch (e) { console.warn("⚠️ FB Comment failed"); }

    // 5. Log to Sheets
    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0
    });

    await sleep(5000);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
