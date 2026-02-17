import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const usedTopics = history.slice(-30).map(row => row[1]).filter(Boolean).join(", ");
  const blogInfo = blog 
    ? `Latest blog: ${blog.title}\nURL: ${blog.link}` 
    : "No blog available today.";

  const prompt = `
Create 3 high-quality Facebook posts for FurryFable.
Tone: Calm, storytelling, premium.

Avoid repeating these topics: ${usedTopics}
${blogInfo}

Rules:
1. If blog exists, make 1 post about it with its URL.
2. Create 2 additional unique pet posts.
3. For EACH post, generate a unique "engagementComment" - a short, fun question to encourage replies.
4. Return ONLY valid JSON array.

Format:
[
  {
    "topic": "", "angle": "", "postType": "", "breed": "", "furColor": "",
    "caption": "", "hashtags": "", "altText": "", "imagePrompt": "",
    "engagementComment": ""
  }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
