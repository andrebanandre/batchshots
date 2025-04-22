#!/bin/bash
set -e

CONFIG_DIR="/opt/stalwart-mail/etc"
CONFIG_FILE="${CONFIG_DIR}/config.toml"
INIT_CONFIG="/config-init.toml"

# Function to generate a random password
generate_password() {
  < /dev/urandom tr -dc 'A-Za-z0-9@#$%^&*()' | head -c 20
}

echo "Initializing Stalwart Mail Server..."

# Wait for the server to initialize its config file
while [ ! -f "${CONFIG_FILE}" ]; do
  echo "Waiting for configuration file to be created..."
  sleep 2
done

echo "Configuration file found. Proceeding with customization..."

# Get administrator credentials from the logs
ADMIN_USER=$(grep -o "Your administrator account is '[^']*'" /var/log/stalwart-mail/server.log | cut -d "'" -f 2)
ADMIN_PASSWORD=$(grep -o "with password '[^']*'" /var/log/stalwart-mail/server.log | cut -d "'" -f 2)

if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Could not obtain administrator credentials. Check the logs."
  exit 1
fi

echo "Retrieved admin credentials successfully."

# Generate a random password for contact@batchshots.com
CONTACT_PASSWORD=$(generate_password)

# Wait a moment for the server to fully initialize
sleep 5

# Use the management API to create the account
echo "Creating contact@batchshots.com account..."
curl -s -X POST "http://localhost:8080/api/v1/accounts" \
  -H "Authorization: Basic $(echo -n "${ADMIN_USER}:${ADMIN_PASSWORD}" | base64)" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"contact@batchshots.com\",
    \"password\": \"${CONTACT_PASSWORD}\",
    \"quota\": 1073741824
  }"

if [ $? -eq 0 ]; then
  echo "Successfully created contact@batchshots.com account"
  echo "Email: contact@batchshots.com"
  echo "Password: ${CONTACT_PASSWORD}"
  
  # Save credentials to a file for reference
  echo "Email: contact@batchshots.com" > /opt/stalwart-mail/contact_credentials.txt
  echo "Password: ${CONTACT_PASSWORD}" >> /opt/stalwart-mail/contact_credentials.txt
  chmod 600 /opt/stalwart-mail/contact_credentials.txt
  
  echo "Credentials saved to /opt/stalwart-mail/contact_credentials.txt"
else
  echo "Failed to create contact@batchshots.com account. Please check the logs."
fi

# Create DKIM keys for the domain
echo "Creating DKIM keys for batchshots.com..."
curl -s -X POST "http://localhost:8080/api/v1/domains/batchshots.com/dkim/rsa" \
  -H "Authorization: Basic $(echo -n "${ADMIN_USER}:${ADMIN_PASSWORD}" | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "selector": "mail",
    "bits": 2048
  }'

# Fetch DKIM records to display
echo "Retrieving DNS records for configuration..."
DNS_RECORDS=$(curl -s -X GET "http://localhost:8080/api/v1/domains/batchshots.com/dns" \
  -H "Authorization: Basic $(echo -n "${ADMIN_USER}:${ADMIN_PASSWORD}" | base64)")

echo "DNS Records for batchshots.com:"
echo "${DNS_RECORDS}" | grep -v "^\s*$"
echo "Please configure these DNS records in your DNS provider (Cloudflare)"

echo "Stalwart Mail Server initialization complete!" 