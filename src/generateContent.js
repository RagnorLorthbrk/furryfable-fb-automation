import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const blogContext = blog 
    ? `NEW BLOG: "${blog.title}". Link: ${blog.link}. One post MUST be a deep-dive into this topic and include the link.`
    : "No new blog today. Focus on general pet tips.";

  const prompt = `
Generate 3 unique social media posts for FurryFable.
${blogContext}

STRICT INSTRUCTIONS:
- Post 1: Informative Expert (Start with a surprising fact).
- Post 2: Heartfelt Story (Focus on the human-pet bond).
- Post 3: Short Engagement (Ask a direct question).
- NEVER use the same opening phrase. 
- If a link is provided, put it in the caption. DO NOT say "link in bio".

Return ONLY JSON array: [{topic, angle, postType, breed, furColor, caption, hashtags, altText, imagePrompt, engagementComment}]
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}
