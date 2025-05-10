#!/bin/bash

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/server.key -out ssl/server.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set permissions
chmod 600 ssl/server.key
chmod 600 ssl/server.crt

echo "Self-signed SSL certificates generated successfully!"
echo "To use HTTPS locally, run the server with:"
echo "USE_HTTPS=true npm run start:dev" 