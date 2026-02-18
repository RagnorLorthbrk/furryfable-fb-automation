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

One of the three posts MUST meaningfully reference this blog.
Do NOT fabricate links.
`
    : `
There is no new blog post today.
Do NOT reference any blog.
`;

  const prompt = `
You are a senior social media strategist for FurryFable.

Before writing:
- Think about real daily pet-owner experiences.
- Avoid clichés like “Did you know?”
- Vary sentence rhythm naturally.
- Include subtle, realistic details.
- Avoid robotic or formulaic phrasing.

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

Engagement Comment Rules:
- Ask ONE thoughtful open-ended question.
- Invite conversation.
- Sound like the brand initiating discussion.
- Never react like a follower.
- Never say “I’ll try this”.
- Avoid generic questions like “Do you agree?”

Return ONLY valid JSON array with exactly 3 posts:

[
  {
    topic,
    angle,
    postType,
    breed,
    furColor,
    caption,
    hashtags,
    engagementComment,
    imagePrompt
  }
]
`;

  // 🔥 PRIMARY: OpenAI
  try {
    console.log("📝 Trying OpenAI content generation...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.9,
      messages: [
        { role: "system", content: "You are an experienced social media strategist." },
        { role: "user", content: prompt }
      ]
    });

    const posts = JSON.parse(response.choices[0].message.content.trim());
    return normalizePosts(posts);

  } catch (error) {
    console.warn("⚠️ OpenAI failed. Switching to Gemini...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const result = await model.generateContent(prompt);

    const text = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();

    const posts = JSON.parse(text);
    return normalizePosts(posts);
  }
}


// 🔒 Defensive Normalization Layer
function normalizePosts(posts) {
  if (!Array.isArray(posts)) return [];

  return posts.map(post => {

    // Ensure hashtags always array
    if (!Array.isArray(post.hashtags)) {
      if (typeof post.hashtags === "string") {
        post.hashtags = post.hashtags
          .split(/[, ]+/)
          .map(tag => tag.trim())
          .filter(tag => tag.startsWith("#"));
      } else {
        post.hashtags = [];
      }
    }

    // Ensure caption exists
    if (typeof post.caption !== "string") {
      post.caption = "";
    }

    // Ensure engagementComment exists
    if (typeof post.engagementComment !== "string") {
      post.engagementComment = "";
    }

    // Ensure imagePrompt exists
    if (typeof post.imagePrompt !== "string") {
      post.imagePrompt = "";
    }

    return post;
  });
}
