import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Get last 30 used topics to avoid repetition
  const usedTopics = history
    .slice(-30)
    .map(row => row[1])
    .filter(Boolean)
    .join(", ");

  const blogInfo = blog
    ? `Latest blog title: ${blog.title}
Blog URL: ${blog.link}
Blog summary: ${blog.description}`
    : "No blog available today.";

  const prompt = `
You are creating 3 high-quality Facebook posts for a premium pet brand called FurryFable.

Brand Tone:
- Calm
- Emotional storytelling
- Minimal
- Premium
- No hype
- No medical claims
- No exaggerated promises

Avoid repeating these past topics:
${usedTopics}

${blogInfo}

Rules:
1. If blog exists, create 1 post based on that blog and include its URL inside the caption.
2. Create 2 additional unique pet-related posts.
3. Avoid generic quotes.
4. Make content engaging but natural.
5. Each post must include hashtags.
6. Return ONLY valid JSON array.
7. No explanations. No markdown.

Format exactly like this:

[
  {
    "topic": "",
    "angle": "",
    "postType": "",
    "breed": "",
    "furColor": "",
    "caption": "",
    "hashtags": "",
    "altText": "",
    "imagePrompt": ""
  }
]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ Gemini returned invalid JSON:");
    console.error(cleaned);
    throw new Error("Invalid JSON from Gemini");
  }
}
