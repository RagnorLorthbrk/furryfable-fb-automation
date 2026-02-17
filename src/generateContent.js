import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const usedTopics = history.slice(-30).map(row => row[1]).join(", ");

  const blogInfo = blog
    ? `Latest blog: ${blog.title} (${blog.link})`
    : "No new blog today.";

  const prompt = `
Create 3 Facebook posts for pet brand FurryFable.

Brand tone:
- Calm
- Emotional storytelling
- Minimal
- Premium

Avoid repeating topics: ${usedTopics}

${blogInfo}

Rules:
- If blog exists, make 1 post based on it.
- Create 2 additional unique pet-related posts.
- Avoid generic quotes.
- No medical claims.
- No exaggerated promises.

Return ONLY valid JSON array:

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
  const cleaned = text.replace(/```json|```/g, "").trim();

  return JSON.parse(cleaned);
}
