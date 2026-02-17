import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Use the entire history to check for duplicates, not just the last row
  const allUsedCaptions = history.map(row => row[6]).join(" ");
  const blogContext = blog 
    ? `NEW BLOG DETECTED: "${blog.title}". URL: ${blog.link}. One post MUST be about this and include the full URL.` 
    : "No new blog today. Focus on general pet care and storytelling.";

  const prompt = `
Create 3 distinct social media posts for FurryFable.
${blogContext}

STRICT VARIETY RULES:
1. Post 1: Educational/Informative (Expert tone).
2. Post 2: Emotional Storytelling (Warm, personal tone).
3. Post 3: Short & Punchy (High energy).
4. Do NOT use the same opening hook twice.
5. If a blog is provided, include the URL "${blog ? blog.link : ''}" naturally in the caption.

Return ONLY a JSON array: [{topic, angle, postType, breed, furColor, caption, hashtags, altText, imagePrompt, engagementComment}]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
