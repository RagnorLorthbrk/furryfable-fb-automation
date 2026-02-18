import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generatePosts(history, blog) {
  const recentTopics = history
    .map(r => r[1])
    .slice(-15)
    .join(", ");

  const blogContext = blog
    ? `
There is a new blog post:
Title: ${blog.title}
Link: ${blog.link}
Summary: ${blog.description}

One of the 3 posts MUST meaningfully reference this blog.
Do NOT fabricate links.
`
    : `
No new blog post today.
Do NOT reference any blog.
`;

  const prompt = `
You are creating 3 high-quality social media posts for the brand FurryFable.

Brand personality:
- Warm
- Intelligent
- Trustworthy
- Friendly but confident
- Community-focused
- Never salesy
- Never promotional of specific brands

${blogContext}

Recent topics already used:
${recentTopics}

CRITICAL RULE:
If a topic from the recent list appears again, you MUST choose a different theme.
Repetition is not allowed.

Topic Diversity & Rotation Rules:
- Do NOT repeat any health topic used in the last 10 posts.
- Only ONE post may reference health.
- At least 2 posts must be non-health categories.
- You MUST choose 3 different categories from this list:

1. Pet-owner bonding
2. Training
3. Enrichment
4. Seasonal care
5. Behavior insights
6. Fun facts
7. Lifestyle moments
8. Safety tips
9. Emotional storytelling
10. Light nutrition (non-medical)

Hard Restrictions:
- No fake statistics.
- No fake links.
- No product brands.
- No fabricated medical claims.
- No overly clinical tone.
- No repetitive themes.
- No mentioning brands we do not sell.
- No recommending specific commercial products.

For EACH post, return:

{
  topic: short theme title,
  angle: short angle summary,
  postType: "educational" | "emotional" | "engagement",
  breed: optional breed if relevant,
  furColor: optional,
  caption: full caption text,
  hashtags: 6–8 relevant hashtags as array,
  engagementComment: 1–2 sentence brand-voice comment that:
      - Encourages replies
      - Asks ONE clear open-ended question
      - Invites conversation
      - Never reacts like a follower
      - Never says “I’ll try this”
      - Never agrees with the post as if separate from it
  imagePrompt: short scene description for image generation
}

Return ONLY valid JSON array with exactly 3 posts.
`;

  // 🔥 TRY OPENAI FIRST
  try {
    console.log("📝 Trying OpenAI content generation...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.85,
      messages: [
        { role: "system", content: "You are a professional social media strategist." },
        { role: "user", content: prompt }
      ]
    });

    return JSON.parse(response.choices[0].message.content.trim());

  } catch (error) {
    console.warn("⚠️ OpenAI failed. Switching to Gemini...");

    // 🔥 FALLBACK TO GEMINI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      return JSON.parse(text.trim());
    } catch (err) {
      console.error("❌ Gemini JSON parse failed:", text);
      throw err;
    }
  }
}
