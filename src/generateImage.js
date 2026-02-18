import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
- Realistic home or outdoor environment details.
- Natural lighting.
- Clean composition.

Avoid:
- Product placements.
- Brand logos.
- Medical procedures unless explicitly required.
- Unrealistic pet behavior.
- Multiple actions happening at once.

Scene description:
${post.imagePrompt}

Keep it believable, grounded, and emotionally natural.
`;

  // 🔥 TRY OPENAI IMAGE FIRST
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
    console.warn("⚠️ OpenAI image failed. Switching to Gemini...");

    // 🔥 FALLBACK TO GEMINI IMAGE
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
      generationConfig: {
        responseMimeType: "image/png"
      }
    });

    const imageBase64 = result.response.candidates[0].content.parts[0].inlineData.data;
    const buffer = Buffer.from(imageBase64, "base64");
    fs.writeFileSync(imagePath, buffer);

    return { imagePath, provider: "Gemini" };
  }
}
