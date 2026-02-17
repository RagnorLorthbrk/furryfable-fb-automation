export async function appendRow(rowData) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    rowData.date,
    rowData.topic,
    rowData.angle,
    rowData.postType,
    rowData.breed,
    rowData.furColor,
    rowData.caption,
    rowData.hashtags,
    rowData.altText,
    rowData.imagePrompt,
    rowData.imageProvider,
    rowData.fbPostId,
    rowData.blogUrl || "", // Added this to match the new column
    rowData.similarityScore,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_NAME}!A:N`, // Extended range to N
    valueInputOption: "USER_ENTERED",
    resource: { values: [row] },
  });
}
