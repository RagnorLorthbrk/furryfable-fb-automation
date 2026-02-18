import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function generateImage(post) {
  const fileName = `pet-post_${uuidv4()}.png`;
  const imagePath = path.join("/tmp", fileName);

  const imagePrompt = `
Create a natural, candid lifestyle photograph.

The scene should feel like a real moment a pet owner might capture — not a staged advertisement.

Focus on:
- One clear focal action.
- Authentic body language.
- Subtle emotional cues.
- Realistic environment details.
- Natural lighting.
- Clean composition.

Avoid:
- Split-screen layouts.
- Collage.
- Product placements.
- Brand logos.
- Unrealistic actions.
- Multiple actions happening at once.

Scene description:
${post.imagePrompt}

Keep it believable and emotionally grounded.
`;

  try {
    console.log("🖼 Trying OpenAI image generation...");

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      size: "1024x1024"
    });

    const base64Image = result.data[0].b64_json;
    const buffer = Buffer.from(base64Image, "base64");

    fs.writeFileSync(imagePath, buffer);

    return { imagePath, provider: "OpenAI" };

  } catch (error) {
    console.warn("⚠️ OpenAI image failed. Retrying once...");

    await sleep(3000);

    try {
      const result = await openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: "1024x1024"
      });

      const base64Image = result.data[0].b64_json;
      const buffer = Buffer.from(base64Image, "base64");

      fs.writeFileSync(imagePath, buffer);

      return { imagePath, provider: "OpenAI-Retry" };

    } catch (retryError) {
      console.error("❌ Image generation failed completely.");
      throw retryError;
    }
  }
}
