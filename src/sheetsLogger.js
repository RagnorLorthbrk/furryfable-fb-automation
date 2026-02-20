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
    range: `${SHEET_NAME}!A2:O1000`, // extended to column O
  });
  return response.data.values || [];
}

export async function appendRow(rowData) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const hashtagsString = Array.isArray(rowData.hashtags)
    ? rowData.hashtags.join(" ")
    : rowData.hashtags || "";

  const row = [
    rowData.date || new Date().toISOString(), // A
    rowData.topic || "",                     // B
    rowData.angle || "",                     // C
    rowData.postType || "",                  // D
    rowData.breed || "",                     // E
    rowData.furColor || "",                  // F
    rowData.caption || "",                   // G
    hashtagsString,                          // H
    rowData.altText || "",                   // I
    rowData.imagePrompt || "",               // J
    rowData.imageProvider || "",             // K
    rowData.fbPostId || "",                  // L
    rowData.similarityScore || 0,            // M
    rowData.facebookStatus || "",            // N (NEW)
    rowData.instagramStatus || "",           // O (NEW)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:O`,
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });
}
