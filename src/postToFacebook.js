import axios from "axios";
import fs from "fs";
import FormData from "form-data";

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
    const container = await axios.post(`https://graph.facebook.com/v24.0/${IG_ID}/media`, {
      image_url: publicImageUrl,
      caption: caption,
      access_token: TOKEN
    });

    const publish = await axios.post(`https://graph.facebook.com/v24.0/${IG_ID}/media_publish`, {
      creation_id: container.data.id,
      access_token: TOKEN
    });

    return publish.data.id;
  } catch (error) {
    console.error("📸 Instagram Error:", error.response?.data || error.message);
    return null;
  }
}
