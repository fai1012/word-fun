#!/bin/bash

# Configuration
IMAGE1=$1
IMAGE2=$2
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

# UI Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Firebase Asset Deployment Script ===${NC}"

# Check arguments
if [ -z "$IMAGE1" ] || [ -z "$IMAGE2" ]; then
    echo -e "${RED}Error: Please provide two image paths.${NC}"
    echo "Usage: ./deploy_images_to_cdn.sh path/to/image1.png path/to/image2.jpg"
    exit 1
fi

# Check Project ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No GCP Project ID detected from gcloud.${NC}"
    read -p "Please enter your GCP Project ID: " INPUT_PROJECT_ID
    PROJECT_ID=$INPUT_PROJECT_ID
else
    echo -e "${BLUE}Detected Project ID:${NC} $PROJECT_ID"
    read -p "Use this project? [Y/n] (or enter new ID): " CONFIRM
    
    if [[ -z "$CONFIRM" || "$CONFIRM" =~ ^[Yy]$ ]]; then
        # Keep detected ID
        :
    else
        # If it doesn't look like a simple 'n', assume it might be a new ID
        if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
            read -p "Enter new Project ID: " NEW_ID
            PROJECT_ID=$NEW_ID
        else
            PROJECT_ID=$CONFIRM
        fi
    fi
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID is required.${NC}"
    exit 1
fi

function urlencode() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))" <<< "$1"
}

# 1. Prepare Deployment Directory
DEPLOY_DIR="deploy_cdn_temp"
echo -e "${BLUE}1. Preparing static directory...${NC}"
mkdir -p "$DEPLOY_DIR/public"

# Copy images (Preserving original names)
NAME1=$(basename -- "$IMAGE1")
NAME2=$(basename -- "$IMAGE2")

cp "$IMAGE1" "$DEPLOY_DIR/public/$NAME1"
cp "$IMAGE2" "$DEPLOY_DIR/public/$NAME2"

# 2. Create Firebase Config
echo -e "${BLUE}2. Creating Firebase configuration...${NC}"
cat <<EOF > "$DEPLOY_DIR/firebase.json"
{
  "hosting": {
    "site": "$PROJECT_ID",
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
EOF

cat <<EOF > "$DEPLOY_DIR/.firebaserc"
{
  "projects": {
    "default": "$PROJECT_ID"
  }
}
EOF

# 2.5 Verify Firebase Project
echo -e "${BLUE}Verifying Firebase project access...${NC}"
if ! npx firebase-tools projects:list --non-interactive | grep -q "$PROJECT_ID"; then
    echo -e "${RED}Error: Project '$PROJECT_ID' is not a Firebase project or you don't have access.${NC}"
    echo -e "${YELLOW}Please ensure you have \"Added Firebase\" to this GCP project at:${NC}"
    echo -e "https://console.firebase.google.com/"
    exit 1
fi

# 3. Deploy
echo -e "${BLUE}3. Deploying to Firebase Hosting...${NC}"
cd "$DEPLOY_DIR" || exit

# Ensure the hosting site exists (ignoring error if it already exists)
echo -e "${BLUE}Ensuring Hosting site exists...${NC}"
npx firebase-tools hosting:sites:create "$PROJECT_ID" --project "$PROJECT_ID" --non-interactive 2>/dev/null

# Try to deploy with explicit project flag
npx firebase-tools deploy --only hosting --project "$PROJECT_ID" --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo -e "Your images are now available via CDN at:"
    echo -e "https://$PROJECT_ID.web.app/$(urlencode "$NAME1")"
    echo -e "https://$PROJECT_ID.web.app/$(urlencode "$NAME2")"
    echo -e "https://$PROJECT_ID.firebaseapp.com/$(urlencode "$NAME1")"
    echo -e "https://$PROJECT_ID.firebaseapp.com/$(urlencode "$NAME2")"
else
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
fi

# Cleanup
cd ..
rm -rf "$DEPLOY_DIR"
