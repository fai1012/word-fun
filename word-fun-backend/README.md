# Word Fun Backend

This is the Node.js backend for Word Fun, built with Express and TypeScript. It handles authentication using Google OAuth2 and JWTs.

## Local Development

You have two options to run this project locally, even if your global Node.js version is older.

### Option 1: Use `nvm` (Recommended)
This project includes an `.nvmrc` file to pin the Node.js version to v20.

1.  **Install/Use Node 20**:
    ```bash
    nvm use
    ```
    (If you don't have Node 20 installed, `nvm` will prompt you or you can run `nvm install 20`).

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run in Development Mode**:
    ```bash
    npm run dev
    ```
    The server will start on port `8080`.

### Option 2: Use Docker Compose
If you prefer not to install Node.js locally, you can run the entire app in a container.

1.  **Start the Container**:
    ```bash
    docker-compose up
    ```
    
2.  The server will be available at `http://localhost:8080`. Source code changes will automatically reload the server.

## Deployment to Cloud Run

This project is set up to be deployed directly to Google Cloud Run using the `gcloud` CLI.

1.  **Deploy**:
    Run the following command (replace the placeholders with your actual values):
    ```bash
    gcloud run deploy word-fun-backend \
      --source . \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID",JWT_SECRET="YOUR_SECURE_SECRET"
    ```

2.  **Verify**:
    Cloud Run will output a URL. You can check the health status at:
    `https://YOUR-SERVICE-URL.run.app/health`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Port to listen on (default: 8080). |
| `GOOGLE_CLIENT_ID` | Your Google OAuth2 Client ID for token verification. |
| `JWT_SECRET` | Secret key used to sign and verify app tokens. |
