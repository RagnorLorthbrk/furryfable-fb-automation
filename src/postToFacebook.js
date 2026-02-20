import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function postToFacebook(caption, imagePath) {
  const form = new FormData();
  form.append("access_token", process.env.FB_PAGE_ACCESS_TOKEN);
  form.append("caption", caption);
  form.append("source", fs.createReadStream(imagePath));

  const response = await axios.post(
    `https://graph.facebook.com/v24.0/${process.env.FB_PAGE_ID}/photos`,
    form,
    { headers: form.getHeaders() }
  );
  return response.data.id;
}

export async function postToInstagram(caption, publicImageUrl) {
  const IG_ID = process.env.IG_USER_ID;
  const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  try {
    // STEP 1 — Create media container
    const container = await axios.post(
      `https://graph.facebook.com/v24.0/${IG_ID}/media`,
      {
        image_url: publicImageUrl,
        caption: caption,
        access_token: TOKEN
      }
    );

    const containerId = container.data.id;

    // STEP 2 — Poll until media is ready
    let attempts = 0;
    let status = "IN_PROGRESS";

    while (status !== "FINISHED" && attempts < 10) {
      attempts++;
      await sleep(5000);

      const statusCheck = await axios.get(
        `https://graph.facebook.com/v24.0/${containerId}`,
        {
          params: {
            fields: "status_code",
            access_token: TOKEN
          }
        }
      );

      status = statusCheck.data.status_code;
      console.log(`📸 IG Processing Status: ${status} (${attempts}/10)`);

      if (status === "ERROR") {
        console.error("❌ Instagram processing error.");
        return null;
      }
    }

    if (status !== "FINISHED") {
      console.error("❌ Instagram media not ready after polling.");
      return null;
    }

    // STEP 3 — Publish only when ready
    const publish = await axios.post(
      `https://graph.facebook.com/v24.0/${IG_ID}/media_publish`,
      {
        creation_id: containerId,
        access_token: TOKEN
      }
    );

    return publish.data.id;

  } catch (error) {
    console.error("📸 Instagram Error:", error.response?.data || error.message);
    return null;
  }
}
