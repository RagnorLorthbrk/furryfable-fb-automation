
import { google } from "googleapis";

const SHEET_NAME = "Sheet1"; // change if your sheet tab name is different

function getAuth() {
  return new google.auth.JWT(
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

export async function getSheetRows() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A2:M1000`,
  });

  return response.data.values || [];
}

export async function appendRow(data) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    data.date,
    data.topic,
    data.angle,
    data.postType,
    data.breed,
    data.furColor,
    data.caption,
    data.hashtags,
    data.altText,
    data.imagePrompt,
    data.imageProvider,
    data.fbPostId,
    data.similarityScore,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:M`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}
