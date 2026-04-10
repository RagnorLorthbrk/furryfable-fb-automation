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

  const month = new Date().getUTCMonth() + 1;
  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });
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
You are a senior social media strategist for FurryFable — a premium pet brand selling dog & cat accessories at furryfable.com.

${seasonContext}
Today is ${dayOfWeek}.

═══════════════════════════════════════
BRAND VOICE & PERSONALITY
═══════════════════════════════════════
- Warm, intelligent, trustworthy
- Sounds like a knowledgeable pet-parent friend, NOT a brand
- Community-focused, never salesy
- Uses conversational language with authority
- Occasionally witty but always genuine

═══════════════════════════════════════
CONTENT STRATEGY (CONVERSION-FOCUSED)
═══════════════════════════════════════
Each post must serve ONE of these goals:
1. AWARENESS — Teach something valuable about pet care (builds trust)
2. ENGAGEMENT — Ask a relatable question or share a moment (builds community)
3. TRAFFIC — Reference a blog post or subtly mention visiting furryfable.com (drives clicks)

Of the 3 posts you generate:
- 1 must be AWARENESS (educational, shareable)
- 1 must be ENGAGEMENT (relatable, comment-driving)
- 1 must be TRAFFIC (blog link or website mention)

═══════════════════════════════════════
WRITING RULES FOR MAXIMUM REACH
═══════════════════════════════════════
1. HOOK: First line must stop the scroll. Use a bold statement, surprising fact, or relatable moment.
   BAD: "Did you know dogs need exercise?"
   GOOD: "My dog stopped destroying shoes the week I added this to our routine."

2. FORMAT: Use short paragraphs (2-3 lines max). Add line breaks between thoughts. Use "→" for tips.

3. CTA: Every post must end with a clear call-to-action:
   - Awareness: "Save this for later" or "Share with a pet parent who needs this"
   - Engagement: A specific, easy-to-answer question
   - Traffic: "Link in bio" or direct blog link

4. HASHTAG STRATEGY:
   - 15-20 hashtags total
   - Mix: 5 broad (500K+ posts), 5 medium (50K-500K), 5-10 niche (under 50K)
   - Include: #FurryFable #PetParent #DogMom #CatMom
   - Season-specific hashtags

5. LENGTH: 150-300 words per caption (Instagram sweet spot for engagement)

═══════════════════════════════════════
MULTI-PLATFORM OPTIMIZATION
═══════════════════════════════════════
Write captions that work across:
- Instagram (visual storytelling, hashtags matter)
- Facebook (slightly longer, more conversational)
- Pinterest (descriptive, keyword-rich, how-to focused)
- LinkedIn (professional angle — pet industry insights, pet-friendly workplace tips)

${blogContext}

Recent topics already used:
${recentTopics}

CRITICAL: Do NOT repeat any recent topic. Each post must be unique.

Topic Categories (rotate through these):
1. Pet-owner bonding moments
2. Training tips & tricks
3. Mental enrichment & puzzle toys
4. Seasonal care (match current season)
5. Behavior decoded (why pets do X)
6. Surprising pet facts
7. Lifestyle & travel with pets
8. Safety tips & warnings
9. Emotional storytelling (adoption, rescue, milestones)
10. Light nutrition (non-medical)
11. Product use cases (subtle — how a harness improved walks)
12. Community spotlights (ask followers to share)

Hard Restrictions:
- No fake statistics or invented data
- No fake links
- No mentioning competitor brands
- No medical claims or veterinary advice
- No overly clinical tone

Return ONLY valid JSON array with exactly 3 posts:

[
  {
    "topic": "specific topic name",
    "angle": "awareness|engagement|traffic",
    "postType": "educational|story|question|tip|listicle",
    "breed": "specific breed mentioned or empty",
    "furColor": "for image generation",
    "caption": "full caption with line breaks",
    "hashtags": ["#tag1", "#tag2", "..."],
    "engagementComment": "first comment to boost engagement",
    "imagePrompt": "detailed image description for AI generation",
    "altText": "accessibility description under 200 chars",
    "pinterestTitle": "keyword-rich Pinterest pin title (max 100 chars)",
    "linkedinAngle": "professional reframe of this post for LinkedIn"
  }
]
`;

  // PRIMARY: OpenAI
  try {
    console.log("📝 Trying OpenAI content generation...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.85,
      messages: [
        { role: "system", content: "You are an expert social media strategist who writes viral pet content. Every post you write is optimized for engagement, saves, and shares." },
        { role: "user", content: prompt }
      ]
    });

    const raw = response.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const posts = JSON.parse(cleaned);
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

    if (typeof post.caption !== "string") post.caption = "";
    if (typeof post.engagementComment !== "string") post.engagementComment = "";
    if (typeof post.imagePrompt !== "string") post.imagePrompt = "";
    if (typeof post.altText !== "string") post.altText = "";
    if (typeof post.pinterestTitle !== "string") post.pinterestTitle = post.topic || "";
    if (typeof post.linkedinAngle !== "string") post.linkedinAngle = "";

    return post;
  });
}
