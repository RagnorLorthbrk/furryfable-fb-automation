import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function generateImage(post) {
  const prompt = `Professional studio pet photography of a ${post.breed}, ${post.furColor} fur. Scene: ${post.imagePrompt}. Soft bokeh, natural lighting, 1080x1080 square, no text.`;
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
