import dotenv from "dotenv";
dotenv.config();
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToInstagram } from "./postToFacebook.js";
import { getShopifyImageUrl } from "./shopifyUploader.js";

async function runIGOnly() {
  console.log("📸 Starting Standalone Instagram Test...");
  
  // 1. Generate one test post (using the Expert angle)
  const posts = await generatePosts([], null);
  const post = posts[0]; 

  // 2. Generate the AI image
  const { imagePath } = await generateImage(post);
  const fullCaption = `${post.caption}\n\n${post.hashtags}`;

  // 3. Upload to Shopify
  const publicUrl = await getShopifyImageUrl(imagePath);

  if (publicUrl) {
    console.log(`✅ Shopify URL Ready: ${publicUrl}`);
    
    // 4. Attempt the Instagram Post
    try {
      console.log("⏳ Waiting 10s for Shopify CDN...");
      await new Promise(r => setTimeout(r, 10000));
      
      const igId = await postToInstagram(fullCaption, publicUrl);
      if (igId) {
        console.log(`🚀 SUCCESS! IG Post Live ID: ${igId}`);
      }
    } catch (err) {
      console.error("❌ IG Post Failed:", err.response?.data || err.message);
    }
  } else {
    console.error("❌ Shopify Upload Failed. Check your permissions (write_files).");
  }
}

runIGOnly().catch(console.error);
