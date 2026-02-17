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
  console.log("🚀 Automation started");
  const history = await getSheetRows();
  let blog = await getLatestBlog();

  if (blog && history.some(row => row.includes(blog.link))) {
    console.log("⏭️ Blog already shared. Switching to general content.");
    blog = null;
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = post.caption + "\n\n" + post.hashtags;

    // 1. Get Public URL via Shopify
    const publicUrl = await getShopifyImageUrl(imagePath);

    // 2. Post to Facebook
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB: ${fbPostId}`);

    // 3. Post to Instagram
    if (publicUrl && process.env.IG_USER_ID) {
      const igId = await postToInstagram(fullCaption, publicUrl);
      console.log(`📸 IG: ${igId}`);
    }

    // 4. Post Dynamic Comment to FB
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
    } catch (e) { console.warn("⚠️ FB Comment failed"); }

    // 5. Log to Sheets (13 Columns)
    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0
    });

    await new Promise(r => setTimeout(r, 5000)); // Delay between posts
  }
  console.log("✅ Automation finished");
}

run().catch(err => { console.error(err); process.exit(1); });
