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
