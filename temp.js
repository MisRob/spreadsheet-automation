const axios = require("axios");
const { google } = require("googleapis");
const path = require("path");
require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const CREDENTIALS_PATH = path.resolve(__dirname, process.env.CREDENTIALS_PATH);

// Fetch details of a specific pull request using its API link
async function fetchPullRequestDetails(prUrl) {
  const response = await axios.get(prUrl, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  return response.data;
}

// Set up GoogleAuth for Google Sheets API
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
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
    pullRequest.user.login || "",
    pullRequest.title || "",
    pullRequest.base.repo.name || "",
    pullRequest.updated_at ? pullRequest.updated_at.split("T")[0] : "",
    pullRequest.requested_reviewers.map((r) => r.login).join(",") || "",
    pullRequest.assignees.map((a) => a.login).join(",") || "",
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
async function handlePullRequestChange(prUrl) {
  console.log(`Fetching pull request details from ${prUrl}...`);
  const pullRequest = await fetchPullRequestDetails(prUrl);

  // Filter out PRs from members of the organization
  if (
    !pullRequest.user.site_admin &&
    pullRequest.user.type === "User" &&
    !pullRequest.author_association.includes("MEMBER")
  ) {
    await updateSpreadsheet(pullRequest);
  } else {
    console.log(
      "PR skipped: Author is a member of the organization or a site admin."
    );
  }
}

// Example usage
async function run() {
  console.log("Starting script...");

  // This is an example pull request URL from the GitHub API
  const prUrl =
    "https://api.github.com/repos/learningequality/kolibri-design-system/pulls/736";
  try {
    await handlePullRequestChange(prUrl);
    console.log("Script completed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

run();
