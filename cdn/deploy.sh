#!/bin/bash

# Configuration
# Usage: ./deploy.sh [prefix] [image_paths...]
# If prefix is not provided, it defaults to 'v1'
# If image_paths are not provided, it defaults to all images in images/

# UI Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Firebase Asset Deployment Script ===${NC}"

# 0. Parse Arguments
PREFIX="v1"
IMAGES=()

if [ $# -gt 0 ]; then
    # Check if first arg is likely a prefix (not a file path with extension)
    if [[ ! "$1" =~ \..*$ ]]; then
        PREFIX=$1
        shift
    fi
fi

if [ $# -eq 0 ]; then
    echo -e "${BLUE}No images specified. Checking images/ directory...${NC}"
    # Use images from cdn/images/ (relative to script)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # Fallback to current directory if SCRIPT_DIR is empty
    IMG_DIR="${SCRIPT_DIR}/images"
    
    if [ -d "$IMG_DIR" ]; then
        for img in "$IMG_DIR"/*; do
            if [ -f "$img" ]; then
                IMAGES+=("$img")
            fi
        done
    fi
else
    IMAGES=("$@")
fi

if [ ${#IMAGES[@]} -eq 0 ]; then
    echo -e "${RED}Error: No images found to deploy.${NC}"
    echo "Usage: ./deploy.sh [version_prefix] [path/to/image1.png ...]"
    echo "Or place images in the 'images/' directory within the cdn folder."
    exit 1
fi

echo -e "${BLUE}Deployment Prefix:${NC} ${YELLOW}$PREFIX${NC}"

# Check Project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No GCP Project ID detected from gcloud.${NC}"
    read -p "Please enter your GCP Project ID: " INPUT_PROJECT_ID
    PROJECT_ID=$INPUT_PROJECT_ID
else
    echo -e "${BLUE}Detected Project ID:${NC} $PROJECT_ID"
    # Skip confirmation if in non-interactive environment (like CI) but here we can keep it
    # Or just use it if PROJECT_ID is already set correctly
    echo -e "${BLUE}Using project:${NC} $PROJECT_ID"
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
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/public/$PREFIX"

# Copy images and store names
IMAGE_NAMES=()
for IMG in "${IMAGES[@]}"; do
    if [ -f "$IMG" ]; then
        NAME=$(basename -- "$IMG")
        cp "$IMG" "$DEPLOY_DIR/public/$PREFIX/$NAME"
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
fi

# 3. Deploy
echo -e "${BLUE}3. Deploying to Firebase Hosting...${NC}"
cd "$DEPLOY_DIR" || exit

# Ensure the hosting site exists
$FB_CMD hosting:sites:create "$PROJECT_ID" --project "$PROJECT_ID" --non-interactive 2>/dev/null

# Try to deploy
$FB_CMD deploy --only hosting --project "$PROJECT_ID" --non-interactive

if [ $? -eq 0 ]; then
    echo -e "${GREEN}=== Deployment Successful! ===${NC}"
    echo -e "Your images are now available via CDN at:"
    for NAME in "${IMAGE_NAMES[@]}"; do
        ENCODED_NAME=$(urlencode "$NAME")
        echo -e "${BLUE}--- $NAME ---${NC}"
        echo -e "https://$PROJECT_ID.web.app/$PREFIX/$ENCODED_NAME"
        echo -e "https://$PROJECT_ID.firebaseapp.com/$PREFIX/$ENCODED_NAME"
    done
else
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
fi

# Cleanup
cd ..
rm -rf "$DEPLOY_DIR"
