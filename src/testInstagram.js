import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("🚀 Testing Instagram Only...");

  const IG_ID = process.env.IG_USER_ID;
  const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  const testCaption = "IG Automation Test Post 🚀\n\n#FurryFable #TestPost";
  const testImageUrl = "https://www.furryfable.com/cdn/shop/articles/c30877b940e0db8a45bd03b1dce20881.png?v=1771415971";

  try {
    const container = await axios.post(
      `https://graph.facebook.com/v24.0/${IG_ID}/media`,
      {
        image_url: testImageUrl,
        caption: testCaption,
        access_token: TOKEN
      }
    );

    console.log("⏳ Waiting 15s for IG processing...");
    await sleep(15000);

    const publish = await axios.post(
      `https://graph.facebook.com/v24.0/${IG_ID}/media_publish`,
      {
        creation_id: container.data.id,
        access_token: TOKEN
      }
    );

    console.log("✅ IG Post Successful:", publish.data.id);

  } catch (error) {
    console.error("📸 Instagram Error:", error.response?.data || error.message);
    process.exit(1);
  }
}

run();
