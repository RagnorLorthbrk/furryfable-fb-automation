import dotenv from "dotenv";
dotenv.config();

import { appendRow, getSheetRows } from "./sheetsLogger.js";

async function test() {
  console.log("Reading existing rows...");
  const rows = await getSheetRows();
  console.log("Rows found:", rows.length);

  console.log("Writing test row...");

  await appendRow({
    date: new Date().toISOString(),
    topic: "Test Topic",
    angle: "Test Angle",
    postType: "Test Type",
    breed: "Labrador",
    furColor: "Golden",
    caption: "This is a test caption",
    hashtags: "#test",
    altText: "Test alt text",
    imagePrompt: "Test image prompt",
    imageProvider: "OpenAI",
    fbPostId: "123456",
    similarityScore: 0.1,
  });

  console.log("Test row added successfully.");
}

test();
