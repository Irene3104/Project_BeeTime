k #!/bin/bash

# Shell script to start the server directly
# This can be used as the start command in Render

# Set environment variables
export NODE_ENV=production
export NODE_NO_WARNINGS=1

echo "Starting server via start.sh..."
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"

# Run the server using tsx
npx tsx src/server/index.ts 