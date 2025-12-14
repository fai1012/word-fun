#!/bin/sh

# Create env-config.js from environment variables
# We only pick variables starting with VITE_ or API_KEY to avoid leaking system info
echo "window._env_ = {" > /usr/share/nginx/html/env-config.js
env | grep -E "^(VITE_|API_KEY|GEMINI_API_KEY)" | awk -F = '{ print "  \"" $1 "\": \"" $2 "\"," }' >> /usr/share/nginx/html/env-config.js
echo "}" >> /usr/share/nginx/html/env-config.js

# Execute the CMD from Dockerfile (which is typically "nginx -g 'daemon off;'")
exec "$@"
