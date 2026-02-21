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

  // 🌎 US + Canada Seasonal Awareness
  const month = new Date().getUTCMonth() + 1;
  let seasonContext = "";

  if ([12, 1, 2].includes(month)) {
    seasonContext = "It is currently winter in the United States and Canada.";
  } else if ([3, 4, 5].includes(month)) {
    seasonContext = "It is currently spring in the United States and Canada.";
  } else if ([6, 7, 8].includes(month)) {
    seasonContext = "It is currently summer in the United States and Canada.";
  } else {
    seasonContext = "It is currently autumn in the United States and Canada.";
  }

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

${seasonContext}
All seasonal references MUST match this season.
Do NOT reference any other season.

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
    imagePrompt,
    altText
  }
]

altText must:
- Clearly describe the image for accessibility
- Be objective and descriptive
- Avoid hashtags
- Avoid emojis
- Be under 200 characters
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

    if (typeof post.caption !== "string") {
      post.caption = "";
    }

    if (typeof post.engagementComment !== "string") {
      post.engagementComment = "";
    }

    if (typeof post.imagePrompt !== "string") {
      post.imagePrompt = "";
    }

    if (typeof post.altText !== "string") {
      post.altText = "";
    }

    return post;
  });
}
