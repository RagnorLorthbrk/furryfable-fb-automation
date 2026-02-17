import OpenAI from "openai";
import fs from "fs";
import path from "path";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(post) {

  const prompt = `
Soft hand-drawn minimal illustration.
Light neutral background.
Calm emotional storytelling mood.
Dog breed: ${post.breed}
Fur color: ${post.furColor}
Scene: ${post.imagePrompt}
1080x1080 square.
No text.
No watermark.
`;

  const fileName = `${uuidv4()}.png`;
  const filePath = path.join("/tmp", fileName);

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  });

  const imageBase64 = response.data[0].b64_json;
  fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

  return { imagePath: filePath, provider: "OpenAI" };
}
