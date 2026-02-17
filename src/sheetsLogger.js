import { google } from "googleapis";

const SHEET_NAME = "Sheet1";

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

export async function appendRow(rowData) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // FIX: Convert hashtags array into a space-separated string
  const hashtagsString = Array.isArray(rowData.hashtags) 
    ? rowData.hashtags.join(" ") 
    : rowData.hashtags || "";

  const row = [
    rowData.date || new Date().toISOString(),
    rowData.topic || "",
    rowData.angle || "",
    rowData.postType || "",
    rowData.breed || "",
    rowData.furColor || "",
    rowData.caption || "",
    hashtagsString, // Now sending text, not a list
    rowData.altText || "",
    rowData.imagePrompt || "",
    rowData.imageProvider || "",
    rowData.fbPostId || "",
    rowData.similarityScore || 0,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:M`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });
}
