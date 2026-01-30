# Example Generation Cloud Functions

This folder contains the source code for the "Debounced Two-Function Architecture" used to generate example sentences for words added to the database.

## Architecture

1. **Trigger Function (`onQueueItemCreated`)**: Listens to Firestore `onCreate` events on the `example_generation_queue` collection. It waits for 10 seconds (debouncing) before calling the Generator.
2. **Generator Function (`processQueueBatch`)**: Fetches all pending words and processes them in a single batch call to Gemini 2.0 Flash. Deployed with `--max-instances=1` for API protection.

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and authenticated.
- Permission to deploy Cloud Functions and Cloud Run (for 2nd gen functions).

## Environment Variables

The following environment variables must be set in your shell before running the deployment script:

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API Key. | **Yes** |
| `SERVICE_ACCOUNT` | (Optional) The email of the Service Account to run the functions as. | No |
| `FIRESTORE_DB_NAME` | (Optional) The Firestore database ID. Defaults to `word-fun`. | No |

## How to Deploy

1. Open your terminal in this directory.
2. Set your Gemini API Key:
   ```bash
   export GEMINI_API_KEY=your_actual_key_here
   ```
3. (Optional) Set your custom Service Account:
   ```bash
   # Uncomment and set in deploy.sh if you want to persist this choice
   # export SERVICE_ACCOUNT=your-sa-name@your-project.iam.gserviceaccount.com
   ```
4. Run the deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script will:
- Build the TypeScript code.
- Deploy the **Generator** function.
- Capture the Generator's URL.
- Deploy the **Trigger** function with the Generator's URL injected as an environment variable.

## Local Development

You can run the generator locally using the functions-framework:

```bash
npm install
npm start
```

This will start the `processQueueBatch` HTTP function on localhost:8080.
