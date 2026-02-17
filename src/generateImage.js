import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

  // 1️⃣ TRY OPENAI FIRST
  try {
    console.log("🖼 Trying OpenAI image generation...");

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    const imageBase64 = response.data[0].b64_json;
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

    return { imagePath: filePath, provider: "OpenAI" };

  } catch (openaiError) {

    console.log("⚠️ OpenAI failed. Switching to Gemini...");

    try {
      // 🔥 IMPORTANT: Use -exp model
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp"
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE"]
        }
      });

      const imagePart = result.response.candidates[0].content.parts.find(
        part => part.inlineData
      );

      const imageBase64 = imagePart.inlineData.data;
      fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

      return { imagePath: filePath, provider: "Gemini" };

    } catch (geminiError) {
      console.error("❌ Gemini image generation failed:", geminiError.message);
      throw geminiError;
    }
  }
}
