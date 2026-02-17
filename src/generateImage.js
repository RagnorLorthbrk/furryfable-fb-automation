import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI } from "@google/genai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateImage(post) {
  const prompt = `Soft hand-drawn minimal illustration of a ${post.breed}, ${post.furColor} fur color. Scene: ${post.imagePrompt}. 1080x1080 square, no text.`;
  const fileName = `${uuidv4()}.png`;
  const filePath = path.join("/tmp", fileName);

  // 1️⃣ TRY OPENAI (DALL-E 3)
  try {
    console.log("🖼 Trying OpenAI...");
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      response_format: "b64_json"
    });
    fs.writeFileSync(filePath, Buffer.from(response.data[0].b64_json, "base64"));
    return { imagePath: filePath, provider: "OpenAI" };
  } catch (err) {
    console.log(`⚠️ OpenAI failed. Switching to Google Imagen...`);

    // 2️⃣ FALLBACK TO GOOGLE IMAGEN 3
    try {
      const response = await client.models.generateImages({
        model: "imagen-3.0-generate-001",
        prompt: prompt,
        config: { numberOfImages: 1, aspectRatio: "1:1" }
      });

      const imageBytes = response.generatedImages[0].image.imageBytes;
      fs.writeFileSync(filePath, Buffer.from(imageBytes, "base64"));
      return { imagePath: filePath, provider: "Google" };
    } catch (fallbackErr) {
      console.error("❌ All Image APIs failed:", fallbackErr.message);
      throw fallbackErr;
    }
  }
}
