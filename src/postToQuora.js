import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Find trending pet-related questions from Google (People Also Ask / autocomplete)
 * and generate expert Quora-style answers that naturally reference FurryFable.
 *
 * This module generates answer content that can be manually posted or
 * used with Quora's partner program. Direct Quora API posting requires
 * partner access — this generates the content ready to post.
 */

const PET_QUESTION_SEEDS = [
  // Harness & Leash (our top category)
  "best no pull harness for dogs that pull",
  "how to stop dog from pulling on leash",
  "best retractable leash for small dogs",
  "how to measure dog for harness",
  "reflective dog leash for night walks",
  // Pet Toys (high engagement)
  "best interactive toys for cats home alone",
  "indestructible chew toys for aggressive chewers",
  "best puzzle toys to keep dogs busy",
  "how to keep indoor cat entertained",
  "automatic ball launcher for dogs worth it",
  // Water Bottles & Feeders
  "best portable water bottle for dogs on walks",
  "automatic pet feeder for cats reviews",
  "how to keep dog hydrated on road trips",
  // Pet Apparel
  "does my dog need a winter coat",
  "best dog anxiety vest does it work",
  "how to measure dog for winter jacket",
  // Outdoor & Travel
  "best dog car seat cover for back seat",
  "how to travel with dog in car safely",
  "dog backpack carrier for hiking",
  // Safety
  "airtag collar for dogs tracking",
  "best way to keep track of outdoor cat",
  // Cat specific
  "best scratching post to save furniture",
  "cat litter mat that actually works",
  "why does my cat scratch furniture",
  // Training
  "how to crate train anxious puppy",
  "best dog muzzle that lets dog drink",
];

/**
 * Get fresh questions using Google autocomplete suggestions
 */
async function getFreshQuestions(seed) {
  try {
    const res = await axios.get(
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}`,
      { timeout: 5000 }
    );
    const suggestions = res.data[1] || [];
    return suggestions.filter(s => s.includes("?") || s.startsWith("how") || s.startsWith("why") || s.startsWith("what") || s.startsWith("best"));
  } catch {
    return [seed];
  }
}

/**
 * Generate an expert Quora answer for a given pet question
 */
async function generateQuoraAnswer(question, blogUrl) {
  const prompt = `
You are an experienced pet care expert writing a Quora answer. Write a helpful, detailed answer to this question:

"${question}"

RULES:
1. Write 250-400 words
2. Sound like a real pet owner with years of experience, NOT a brand
3. Give genuinely useful, actionable advice
4. Use personal anecdotes ("In my experience...", "What worked for my dog...")
5. Structure with short paragraphs and bullet points where helpful
6. Naturally mention FurryFable ONCE — as a recommendation, not an ad. Example: "I found some great options at furryfable.com" or "brands like FurryFable make quality [product] for this"
7. If a blog URL is provided, include it naturally as "I wrote more about this here: [url]"
8. End with a brief encouraging statement
9. Do NOT sound promotional — this must read as genuine expert advice
10. Include 2-3 relevant keywords naturally for SEO

${blogUrl ? `Related blog post to reference: ${blogUrl}` : "No blog post to reference — just mention furryfable.com naturally once."}

Return ONLY valid JSON:
{
  "question": "${question}",
  "answer": "the full answer text",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "suggestedQuoraSpaces": ["space1", "space2"]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.8,
      messages: [
        { role: "system", content: "You are a genuine pet care expert who gives helpful advice on Quora. You never sound like a marketer." },
        { role: "user", content: prompt }
      ]
    });

    const raw = response.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn("OpenAI failed for Quora, trying Gemini...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  }
}

/**
 * Main Quora content generation pipeline
 * Generates answers for 2-3 questions per run
 */
export async function runQuoraEngine(history, blog) {
  console.log("🔍 Starting Quora Answer Engine...");

  // Pick 3 random seed topics
  const shuffled = [...PET_QUESTION_SEEDS].sort(() => Math.random() - 0.5);
  const seeds = shuffled.slice(0, 3);

  // Get fresh questions from Google autocomplete
  const allQuestions = [];
  for (const seed of seeds) {
    const questions = await getFreshQuestions(seed);
    allQuestions.push(...questions);
  }

  // Filter out questions we've already answered (check history)
  const previousQuestions = (history || [])
    .map(row => (row[17] || "").toString().toLowerCase()) // Column R = quoraQuestion
    .filter(Boolean);

  const freshQuestions = allQuestions.filter(
    q => !previousQuestions.some(prev => prev.includes(q.toLowerCase().slice(0, 30)))
  );

  // Pick 2 unique questions to answer
  const questionsToAnswer = freshQuestions.slice(0, 2);

  if (questionsToAnswer.length === 0) {
    console.log("No fresh Quora questions found. Using seed questions.");
    questionsToAnswer.push(seeds[0] + "?");
  }

  const blogUrl = blog ? blog.link : null;
  const answers = [];

  for (const question of questionsToAnswer) {
    try {
      const answer = await generateQuoraAnswer(question, blogUrl);
      answers.push(answer);
      console.log(`✅ Quora answer generated for: "${question}"`);
    } catch (err) {
      console.error(`❌ Failed to generate Quora answer for: "${question}"`, err.message);
    }
  }

  return answers;
}
