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
- One clear focal action
- Authentic body language
- Natural lighting
- Realistic setting
- Clean composition

Avoid:
- Split screen
- Collage
- Brand logos
- Product packaging
- Unrealistic actions

Scene description:
${post.imagePrompt}
`;

  // 🔥 OPENAI FIRST
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

    // 🔥 GEMINI FALLBACK (WORKING VERSION)
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash"
      });

      const result = await model.generateContent(imagePrompt);

      // Gemini returns base64 image in inlineData
      const parts = result.response.candidates[0].content.parts;
      const imagePart = parts.find(p => p.inlineData);

      if (!imagePart) {
        throw new Error("Gemini did not return image data.");
      }

      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      fs.writeFileSync(imagePath, buffer);

      return { imagePath, provider: "Gemini" };

    } catch (geminiError) {
      console.error("❌ Gemini image fallback failed.");
      throw geminiError;
    }
  }
}
