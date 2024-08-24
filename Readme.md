# Project Setup Instructions

Follow these steps to set up and run the project.

1. Clone the Repository
```bash
git clone <repository-url>
```
2. Navigate to the Project Directory

```bash
cd test
```

3. Install Dependencies

```bash
npm install
```

4. Get the Required Google sheet Credentials

Watch this YouTube video: https://www.youtube.com/watch?v=PFJNJQCU_lo to learn how to obtain the credentials.json file. Also, ensure that the email provided for your service account is added to sheet with the required permissions so it can make changes.

5. Create an .env File

Create a .env file in the project root and add the following keys:
```bash
GITHUB_TOKEN=
SPREADSHEET_ID=
SHEET_NAME=
CREDENTIALS_PATH=
```
Make sure to fill in the appropriate values for each key.

6. Run the JavaScript Script

After setting up the .env file, you can run the JavaScript script.

If needed, change the const prUrl = "https://api.github.com/repos/learningequality/kolibri-design-system/pulls/736"; with the required one to test it.

## Conclusion

You are now ready to run the project. If you encounter any issues, make sure all the credentials are correctly set up and the .env file is properly configured.
