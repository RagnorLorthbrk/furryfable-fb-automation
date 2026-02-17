import axios from "axios";
import xml2js from "xml2js";

export async function getLatestBlog() {
  try {
    const response = await axios.get("https://www.furryfable.com/blogs/blog.atom");

    const parsed = await xml2js.parseStringPromise(response.data);

    const entry = parsed.feed.entry[0];

    const title = entry.title[0];
    const link = entry.link.find(l => l.$.rel === "alternate").$.href;
    const summary = entry.summary ? entry.summary[0]._ || entry.summary[0] : "";

    return {
      title,
      link,
      description: summary
    };

  } catch (error) {
    console.log("Blog fetch error:", error.message);
    return null;
  }
}
