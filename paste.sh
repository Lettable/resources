#!/bin/bash
# paste.sh - Automatically downloads paste.js from REMOTE_URL and runs it.
# Usage: ./paste.sh -c "Hello World" -p true -s "password" -e "2025-02-12T11:22:33Z" -h "https://cipher.ix.tc/"

REMOTE_URL="https://raw.githubusercontent.com/Lettable/resources/refs/heads/main/cipher.js"

# Create a temporary file for paste.js
TEMP_FILE=$(mktemp /tmp/paste.XXXXXX.js)

# Attempt to download paste.js using wget or curl
if command -v wget >/dev/null 2>&1; then
    wget -q -O "$TEMP_FILE" "$REMOTE_URL"
elif command -v curl >/dev/null 2>&1; then
    curl -s -o "$TEMP_FILE" "$REMOTE_URL"
else
    echo "Error: Neither wget nor curl is installed."
    exit 1
fi

# Check if the file was downloaded successfully
if [ ! -s "$TEMP_FILE" ]; then
    echo "Error: Failed to download paste.js from $REMOTE_URL."
    exit 1
fi

# Run the downloaded paste.js with Node.js and pass all arguments
node "$TEMP_FILE" "$@"

# Remove the temporary file
rm "$TEMP_FILE"
