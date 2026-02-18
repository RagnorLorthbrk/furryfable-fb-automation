import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePosts(history, blog) {
  const recentTopics = history
    .map(r => r[1])
    .slice(-15)
    .join(", ");

  const blogContext = blog
    ? `
There is a new blog post available:
Title: ${blog.title}
Link: ${blog.link}
Summary: ${blog.summary}

One of the three posts MUST meaningfully reference this blog.
Do NOT fabricate additional links.
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

Topic Diversity & Rotation Rules:
- Do NOT repeat topics from the recent list.
- Avoid clustering medical topics (dental, illness, vet visits, hydration).
- At least 2 of the 3 posts must NOT be health-related.
- Rotate between:
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
      - Sounds like the brand (not a follower)
      - Never says “I’ll try this” or reacts like a user
  imagePrompt: short scene description for image generation
}

Return ONLY valid JSON array with exactly 3 posts.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.85,
    messages: [
      { role: "system", content: "You are a professional social media strategist." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0].message.content.trim();

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("❌ JSON Parse Error:", content);
    throw err;
  }
}
