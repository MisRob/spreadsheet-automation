const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS;

// Set up GoogleAuth for Google Sheets API
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(GOOGLE_CREDENTIALS),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

// Update Google Sheets with pull request data
async function updateSpreadsheet(pullRequest) {
  const sheets = await authorize();
  const prData = [
    pullRequest.merged_at ? pullRequest.merged_at.split("T")[0] : "",
    pullRequest.html_url || "",
    pullRequest.user_login || "",
    pullRequest.title || "",
    pullRequest.repo_name || "",
    pullRequest.updated_at ? pullRequest.updated_at.split("T")[0] : "",
    pullRequest.requested_reviewers || "",
    pullRequest.assignees || "",
  ];

  // Check if the pull request already exists in the spreadsheet
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const existingRows = data.values || [];
  let rowToUpdate = null;

  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i][1] === pullRequest.html_url) {
      rowToUpdate = i + 1;
      break;
    }
  }

  if (rowToUpdate) {
    const existingData = existingRows[rowToUpdate - 1];
    const prDataString = JSON.stringify(prData);
    const existingDataString = JSON.stringify(existingData);

    // Compare entire row data
    if (prDataString !== existingDataString) {
      console.log(`Detected changes for row ${rowToUpdate}.`);

      const updates = [];
      const columns = ["A", "B", "C", "D", "E", "F", "G", "H"];
      for (let col = 0; col < prData.length; col++) {
        if (existingData[col] !== prData[col]) {
          updates.push({
            range: `${SHEET_NAME}!${columns[col]}${rowToUpdate}`,
            values: [[prData[col]]],
          });
        }
      }

      // Batch update the changed columns
      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            data: updates,
            valueInputOption: "RAW",
          },
        });
        console.log(`Updated row ${rowToUpdate} in Google Sheets.`);
      } else {
        console.log(`No changes detected for row ${rowToUpdate}.`);
      }
    } else {
      console.log(`No changes detected for row ${rowToUpdate}.`);
    }
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: "RAW",
      resource: { values: [prData] },
    });
    console.log(`Added new row to Google Sheets.`);
  }
}

// Main function to handle pull request changes
async function handlePullRequestChange(pullRequest) {
  // Filter out PRs from members of the organization
  if (
    !pullRequest.user_site_admin &&
    pullRequest.user_type === "User" &&
    !pullRequest.author_association.includes("MEMBER")
  ) {
    await updateSpreadsheet(pullRequest);
  } else {
    console.log(
      "PR skipped: Author is a member of the organization or a site admin."
    );
  }
}

// Parse command-line arguments
const pullRequest = JSON.parse(process.argv[2]);

// Run the script
handlePullRequestChange(pullRequest).catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
