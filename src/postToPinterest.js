import axios from "axios";

/**
 * Post a pin to Pinterest using the Pinterest API v5
 * Requires: PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID
 */
export async function postToPinterest(title, description, imageUrl, link) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;

  if (!token || !boardId) {
    console.log("⏭️ Pinterest: Missing PINTEREST_ACCESS_TOKEN or PINTEREST_BOARD_ID. Skipping.");
    return null;
  }

  try {
    const response = await axios.post(
      "https://api.pinterest.com/v5/pins",
      {
        board_id: boardId,
        title: title.slice(0, 100),
        description: description.slice(0, 500),
        link: link,
        media_source: {
          source_type: "image_url",
          url: imageUrl
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`📌 Pinterest Pin created: ${response.data.id}`);
    return response.data.id;
  } catch (err) {
    console.error("❌ Pinterest Error:", err.response?.data || err.message);
    return null;
  }
}

/**
 * Generate Pinterest-optimized content from a social post
 */
export function formatForPinterest(post, blogLink) {
  // Pinterest titles should be descriptive and keyword-rich
  const title = post.topic || post.caption.split("\n")[0].slice(0, 100);

  // Pinterest descriptions should include keywords and a CTA
  let description = post.caption
    .replace(/#\w+/g, "") // Remove hashtags from main text
    .trim()
    .slice(0, 400);

  // Add hashtags back at the end (Pinterest uses them for discovery)
  const pinterestHashtags = (post.hashtags || [])
    .slice(0, 5) // Pinterest shows first 5 hashtags
    .join(" ");

  description += `\n\n${pinterestHashtags}`;

  const link = blogLink || "https://www.furryfable.com";

  return { title, description, link };
}
