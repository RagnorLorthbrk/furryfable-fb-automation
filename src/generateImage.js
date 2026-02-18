import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(post) {
  const fileName = `pet-post_${uuidv4()}.png`;
  const imagePath = path.join("/tmp", fileName);

  const imagePrompt = `
Create ONE realistic, single-scene lifestyle photo.

Strict rules:
- Only ONE main action.
- No split-screen.
- No collage.
- No multiple scenes.
- No brand logos.
- No product packaging.
- No medical procedures unless explicitly required.
- No unrealistic handling of pets.
- No exaggerated expressions.
- Natural lighting.
- Warm emotional tone.
- Realistic pet proportions.
- Clean composition.

Scene description:
${post.imagePrompt}

The image must logically match the caption.
Do not introduce additional actions not described.
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
    console.error("⚠️ OpenAI image failed:", error.message);
    throw error;
  }
}
