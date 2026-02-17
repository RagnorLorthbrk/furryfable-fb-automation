import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function generatePosts(history, blog) {

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
Create 3 high-quality Facebook posts for premium pet brand FurryFable.

Brand tone:
- Calm
- Emotional storytelling
- Minimal
- Premium
- No hype
- No medical claims

Avoid repeating topics:
${usedTopics}

${blogInfo}

Rules:
1. If blog exists, create 1 post based on it and include its URL in caption.
2. Create 2 additional unique pet-related posts.
3. Each must include hashtags.
4. Return ONLY valid JSON array.
5. No markdown. No explanation.

Format:

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await axios.post(url, {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  });

  const text = response.data.candidates[0].content.parts[0].text;

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
