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

  const previousTopics = history
    .map(row => (row[1] || "").toString().trim().toLowerCase())
    .filter(Boolean);

  let blog = await getLatestBlog();

  if (blog && history.some(row => row.some(cell => String(cell).includes(blog.link)))) {
    console.log(`⏭️ Blog "${blog.title}" already shared. Skipping blog.`);
    blog = null;
  }

  let post = null;
  let attempts = 0;

  while (!post && attempts < 3) {
    attempts++;
    console.log(`🔄 Generating posts (Attempt ${attempts})...`);

    const posts = await generatePosts(history, blog);

    if (!posts || posts.length === 0) continue;

    for (const candidate of posts) {
      const topicNormalized = (candidate.topic || "").trim().toLowerCase();

      if (!previousTopics.includes(topicNormalized)) {
        post = candidate;
        break;
      }
    }
  }

  if (!post) {
    console.log("⚠️ All attempts produced duplicates. Forcing publish.");
    const fallbackPosts = await generatePosts(history, blog);
    post = fallbackPosts[0];
  }

  try {
    console.log("--------------------------------------------------");
    console.log(`📝 Creating post about: ${post.topic}`);

    const { imagePath, provider } = await generateImage(post);

    // 🔥 Detect if this is blog-based post
    const isBlogPost = blog && post.caption.includes(blog.title);

    // 🔥 Remove blog link from caption if present
    let cleanCaption = post.caption;
    if (blog) {
      cleanCaption = cleanCaption.replace(blog.link, "").trim();
    }

    const fullCaption = `${cleanCaption}\n\n${post.hashtags.join(" ")}`;

    const publicUrl = await getShopifyImageUrl(imagePath);

    // -----------------------
    // FACEBOOK
    // -----------------------
    let fbPostId = null;
    let facebookStatus = "❌";

    try {
      fbPostId = await postToFacebook(fullCaption, imagePath);
      facebookStatus = "✅";
      console.log(`✅ FB Live: ${fbPostId}`);
    } catch (err) {
      console.error("❌ Facebook Post Failed:", err.message);
    }

    // -----------------------
    // INSTAGRAM
    // -----------------------
    let igId = null;
    let instagramStatus = "❌";

    if (publicUrl && process.env.IG_USER_ID) {
      try {
        await sleep(15000);
        igId = await postToInstagram(fullCaption, publicUrl);

        if (igId) {
          instagramStatus = "✅";
          console.log(`📸 IG Live: ${igId}`);
        }
      } catch (err) {
        console.error("❌ IG API Error:", err.response?.data || err.message);
      }
    }

    // -----------------------
    // FIRST COMMENT (Blog Link if Blog Post)
    // -----------------------
    let firstComment = post.engagementComment;

    if (isBlogPost && blog) {
      firstComment = `${post.engagementComment}\n\nRead full blog here:\n${blog.link}`;
    }

    if (fbPostId) {
      try {
        await axios.post(
          `https://graph.facebook.com/v24.0/${fbPostId}/comments`,
          {
            message: firstComment,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
          }
        );
        console.log("💬 FB Comment added");
      } catch (err) {
        console.warn("⚠️ FB Comment failed:", err.response?.data || err.message);
      }
    }

    if (igId) {
      try {
        await axios.post(
          `https://graph.facebook.com/v24.0/${igId}/comments`,
          {
            message: firstComment,
            access_token: process.env.FB_PAGE_ACCESS_TOKEN
          }
        );
        console.log("💬 IG Comment added");
      } catch (err) {
        console.warn("⚠️ IG Comment failed:", err.response?.data || err.message);
      }
    }

    // -----------------------
    // LOG TO SHEET
    // -----------------------
    await appendRow({
      date: new Date().toISOString(),
      topic: post.topic,
      angle: post.angle,
      postType: post.postType,
      breed: post.breed || "",
      furColor: post.furColor || "",
      caption: cleanCaption,
      hashtags: post.hashtags.join(" "),
      altText: "",
      imagePrompt: post.imagePrompt,
      imageProvider: provider,
      fbPostId,
      similarityScore: 0,
      facebookStatus,
      instagramStatus
    });

    console.log("📊 Logged to Google Sheets");

  } catch (err) {
    console.error("❌ Error during post creation:", err.message);
  }

  console.log("🎉 Automation completed.");
}

run().catch(err => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
