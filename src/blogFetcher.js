import axios from "axios";
import xml2js from "xml2js";

export async function getLatestBlog() {
  try {
    const response = await axios.get("https://furryfable.com/feed");
    const parsed = await xml2js.parseStringPromise(response.data);

    const item = parsed.rss.channel[0].item[0];

    return {
      title: item.title[0],
      link: item.link[0],
      description: item.description[0]
    };

  } catch (error) {
    console.log("No blog found or RSS error.");
    return null;
  }
}
