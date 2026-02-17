import dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import { getSheetRows, appendRow } from "./sheetsLogger.js";
import { generatePosts } from "./generateContent.js";
import { generateImage } from "./generateImage.js";
import { postToFacebook } from "./postToFacebook.js";
import { getLatestBlog } from "./blogFetcher.js";

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("🚀 Automation started");
  const history = await getSheetRows();
  let blog = await getLatestBlog();

  // Duplicate Check
  if (blog && history.some(row => row.includes(blog.link))) {
    console.log("⏭️ Blog already shared. Using general content.");
    blog = null;
  }

  const posts = await generatePosts(history, blog);

  for (const post of posts) {
    const { imagePath, provider } = await generateImage(post);
    const fullCaption = post.caption + "\n\n" + post.hashtags;

    // 1. Post to Facebook
    const fbPostId = await postToFacebook(fullCaption, imagePath);
    console.log(`✅ FB Post: ${fbPostId}`);

    // 2. Add Dynamic Comment to FB
    try {
      await axios.post(`https://graph.facebook.com/v24.0/${fbPostId}/comments`, {
        message: post.engagementComment,
        access_token: process.env.FB_PAGE_ACCESS_TOKEN
      });
      console.log("💬 FB Comment added.");
    } catch (e) { console.warn("⚠️ FB Comment failed"); }

    // 3. Optional: Instagram Logic (Requires IG_USER_ID secret)
    // Note: IG API needs a public URL for the image
    
    await wait(5000); // Wait 5 seconds between posts

    // 4. Log to Sheets (Fixed Mapping)
    await appendRow({
      date: new Date().toISOString(),
      ...post,
      imageProvider: provider,
      fbPostId: fbPostId,
      similarityScore: 0
    });
  }
}

run().catch(err => { console.error(err); process.exit(1); });
