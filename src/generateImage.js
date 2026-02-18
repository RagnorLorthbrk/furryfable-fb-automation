import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function generateImage(post) {
  const prompt = `Create a natural, candid lifestyle photograph.

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
  const fileName = `${uuidv4()}.png`;
  const filePath = path.join("/tmp", fileName);

  try {
    console.log("🖼 Trying OpenAI (DALL-E 3)...");
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      response_format: "b64_json"
    });
    fs.writeFileSync(filePath, Buffer.from(response.data[0].b64_json, "base64"));
    return { imagePath: filePath, provider: "OpenAI" };

  } catch (err) {
    console.log("⚠️ OpenAI failed. Switching to Gemini REST (Nano Banana)...");
    try {
      // Use the stable 2.5 Flash Image model from your blog automation
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
      const res = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] }
      });

      const imageData = res.data.candidates[0].content.parts.find(p => p.inlineData)?.inlineData.data;
      if (!imageData) throw new Error("No image data returned.");

      fs.writeFileSync(filePath, Buffer.from(imageData, "base64"));
      return { imagePath: filePath, provider: "Gemini" };
    } catch (fallbackErr) {
      console.error("❌ Both Image APIs failed:", fallbackErr.message);
      throw fallbackErr;
    }
  }
}
