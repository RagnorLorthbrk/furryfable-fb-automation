
import dotenv from "dotenv";
dotenv.config();

import { appendRow, getSheetRows } from "./sheetsLogger.js";

async function run() {
  console.log("Reading sheet...");

  const rows = await getSheetRows();
  console.log("Existing rows:", rows.length);

  console.log("Adding test row...");

  await appendRow({
    date: new Date().toISOString(),
    topic: "Automation Test",
    angle: "Initial Setup",
    postType: "System Test",
    breed: "Test Breed",
    furColor: "Test Color",
    caption: "This is a test post from GitHub Actions.",
    hashtags: "#test",
    altText: "Test alt text",
    imagePrompt: "Test prompt",
    imageProvider: "System",
    fbPostId: "N/A",
    similarityScore: 0
  });

  console.log("Row added successfully.");
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
