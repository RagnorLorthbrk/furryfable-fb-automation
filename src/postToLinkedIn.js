import axios from "axios";
import fs from "fs";

/**
 * Post to LinkedIn Organization Page using LinkedIn Marketing API
 * Requires: LINKEDIN_ACCESS_TOKEN, LINKEDIN_ORG_ID
 */
export async function postToLinkedIn(text, imageUrl) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORG_ID;

  if (!token || !orgId) {
    console.log("⏭️ LinkedIn: Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORG_ID. Skipping.");
    return null;
  }

  try {
    let shareContent;

    if (imageUrl) {
      // Step 1: Register image upload
      const registerRes = await axios.post(
        "https://api.linkedin.com/v2/images?action=initializeUpload",
        {
          initializeUploadRequest: {
            owner: `urn:li:organization:${orgId}`
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const uploadUrl = registerRes.data.value.uploadUrl;
      const imageUrn = registerRes.data.value.image;

      // Step 2: Upload image from URL
      const imageData = await axios.get(imageUrl, { responseType: "arraybuffer" });
      await axios.put(uploadUrl, imageData.data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "image/png"
        }
      });

      shareContent = {
        author: `urn:li:organization:${orgId}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED"
        },
        content: {
          media: {
            title: "FurryFable - Premium Pet Care",
            id: imageUrn
          }
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };
    } else {
      shareContent = {
        author: `urn:li:organization:${orgId}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED"
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };
    }

    const response = await axios.post(
      "https://api.linkedin.com/rest/posts",
      shareContent,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202401"
        }
      }
    );

    const postId = response.headers["x-restli-id"] || response.data?.id || "posted";
    console.log(`💼 LinkedIn post created: ${postId}`);
    return postId;
  } catch (err) {
    console.error("❌ LinkedIn Error:", err.response?.data || err.message);
    return null;
  }
}

/**
 * Format social media post for LinkedIn's professional audience
 */
export function formatForLinkedIn(post, blogLink) {
  // LinkedIn content should be more professional and insight-driven
  let text = post.caption
    .replace(/#\w+/g, "") // Remove Instagram-style hashtags
    .trim();

  // Add blog link if available
  if (blogLink) {
    text += `\n\nRead more: ${blogLink}`;
  }

  // Add LinkedIn-appropriate hashtags (fewer, more professional)
  const linkedInTags = (post.hashtags || [])
    .slice(0, 3)
    .map(tag => tag.replace("#", "#")) // Keep # prefix
    .join(" ");

  text += `\n\n${linkedInTags} #PetCare #FurryFable`;

  return text.slice(0, 3000); // LinkedIn limit
}
