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
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Please provide at least one image path.${NC}"
    echo "Usage: ./deploy_images_to_cdn.sh path/to/image1.png [path/to/image2.jpg ...]"
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

# Copy images and store names
IMAGE_NAMES=()
for IMG in "$@"; do
    if [ -f "$IMG" ]; then
        NAME=$(basename -- "$IMG")
        cp "$IMG" "$DEPLOY_DIR/public/$NAME"
        IMAGE_NAMES+=("$NAME")
        echo -e "${GREEN}Added:${NC} $NAME"
    else
        echo -e "${YELLOW}Warning: File not found, skipping:${NC} $IMG"
    fi
done

if [ ${#IMAGE_NAMES[@]} -eq 0 ]; then
    echo -e "${RED}Error: No valid images to deploy.${NC}"
    rm -rf "$DEPLOY_DIR"
    exit 1
fi

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

# 2.5 Detection and Auth Check
echo -e "${BLUE}Detecting Firebase environment...${NC}"
FB_CMD="npx firebase-tools"
if command -v firebase &> /dev/null; then
    FB_CMD="firebase"
    echo -e "${GREEN}Using global firebase command: $(firebase --version)${NC}"
else
    echo -e "${YELLOW}Global 'firebase' command not found. Falling back to npx...${NC}"
    echo -e "${YELLOW}Note: This may hang if you have network issues or haven't installed firebase-tools globally.${NC}"
fi

echo -e "${BLUE}Checking authentication...${NC}"
if ! $FB_CMD login:list --non-interactive > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: You might not be logged in to Firebase.${NC}"
    echo -e "If deployment hangs or fails, try: ${GREEN}npx firebase-tools login${NC} or ${GREEN}firebase login${NC}"
fi

# 3. Deploy
echo -e "${BLUE}3. Deploying to Firebase Hosting...${NC}"
cd "$DEPLOY_DIR" || exit

# Ensure the hosting site exists (ignoring error if it already exists)
echo -e "${BLUE}Ensuring Hosting site exists...${NC}"
$FB_CMD hosting:sites:create "$PROJECT_ID" --project "$PROJECT_ID" --non-interactive 2>/dev/null

# Try to deploy with explicit project flag
$FB_CMD deploy --only hosting --project "$PROJECT_ID" --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo -e "Your images are now available via CDN at:"
    for NAME in "${IMAGE_NAMES[@]}"; do
        ENCODED_NAME=$(urlencode "$NAME")
        echo -e "${BLUE}--- $NAME ---${NC}"
        echo -e "https://$PROJECT_ID.web.app/$ENCODED_NAME"
        echo -e "https://$PROJECT_ID.firebaseapp.com/$ENCODED_NAME"
    done
else
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
fi

# Cleanup
cd ..
rm -rf "$DEPLOY_DIR"
