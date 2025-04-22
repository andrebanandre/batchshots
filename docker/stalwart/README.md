# Stalwart Mail Server Configuration

## Overview

This directory contains configuration files for the Stalwart Mail Server deployment in Docker Swarm with Traefik as a reverse proxy. Stalwart is a modern, fast, and secure mail server that provides JMAP, IMAP, SMTP, and POP3 capabilities.

## Files

- `config-init.toml`: Initial configuration template for Stalwart
- `init-stalwart.sh`: Initialization script that creates the contact@batchshots.com account with a random password

## Accessing the Mail Server

- Admin interface: https://mail.batchshots.com
- Admin credentials will be automatically generated and displayed in the logs when you first start the server
- The contact@batchshots.com email address is automatically created with a random password
- The credentials for the contact email can be found in the logs or in the file `/opt/stalwart-mail/contact_credentials.txt` inside the container

## Required DNS Records

After initial deployment, you need to configure the following DNS records for batchshots.com in your DNS provider (Cloudflare):

1. **MX Record**:
   - Name: `batchshots.com`
   - Value: `mail.batchshots.com`
   - Priority: `10`

2. **SPF Record**:
   - Name: `batchshots.com`
   - Type: `TXT`
   - Value: `v=spf1 mx -all ra=postmaster`

3. **DMARC Record**:
   - Name: `_dmarc.batchshots.com`
   - Type: `TXT`
   - Value: `v=DMARC1; p=reject; rua=mailto:postmaster@batchshots.com; ruf=mailto:postmaster@batchshots.com`

4. **DKIM Record**: 
   The DKIM record will be automatically generated and displayed in the logs after the server starts. 
   The format will be:
   - Name: `mail._domainkey.batchshots.com`
   - Type: `TXT`
   - Value: `v=DKIM1; k=rsa; h=sha256; p=<long_public_key>`

5. **Autoconfig/Autodiscover**:
   - Name: `autoconfig.batchshots.com`
   - Type: `A`
   - Value: `<your_server_ip>`

## Accessing Email

Users can access their email using:

- IMAP: mail.batchshots.com on ports 143 (STARTTLS) or 993 (SSL/TLS)
- SMTP: mail.batchshots.com on ports 25 (STARTTLS), 587 (STARTTLS), or 465 (SSL/TLS)
- Web interface: https://mail.batchshots.com

## Troubleshooting

If you encounter issues, check:

1. The Stalwart container logs:
   ```
   docker service logs batchshots_stalwart
   ```

2. Verify DNS records are correctly configured and propagated
3. Ensure all ports (25, 465, 587, 143, 993, 4190) are open in your firewall
4. Check Traefik logs for any proxy-related issues

For more information, refer to the [Stalwart Mail Server documentation](https://stalw.art/docs/). 