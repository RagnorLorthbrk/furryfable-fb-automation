import dotenv from "dotenv";
dotenv.config();

import { postToInstagram } from "./postToFacebook.js";

async function run() {
  console.log("🚀 Testing Instagram Only...");

  const testCaption = "IG Automation Test Post 🚀\n\n#FurryFable #TestPost";

  const testImageUrl = "https://www.furryfable.com/cdn/shop/articles/c30877b940e0db8a45bd03b1dce20881.png?v=1771415971";

  if (!process.env.IG_USER_ID) {
    console.error("❌ IG_USER_ID missing in secrets.");
    process.exit(1);
  }

  const igId = await postToInstagram(testCaption, testImageUrl);

  if (igId) {
    console.log(`✅ IG Post Successful: ${igId}`);
  } else {
    console.log("❌ IG Post Failed.");
    process.exit(1);
  }
}

run();
