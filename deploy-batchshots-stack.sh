BG_HOST=5.78.107.245
IMAGE_NAME="$BG_HOST:5000/batchshots:latest"

echo "Copy files to $BG_HOST"
# Create required directories on remote host
ssh root@$BG_HOST "mkdir -p /etc/batchshots/stalwart"

# Copy traefik config
scp -r docker/traefik/traefik.yml root@$BG_HOST:/etc/batchshots/traefik.yml

# Copy stalwart configs
scp docker/stalwart/config-init.toml root@$BG_HOST:/etc/batchshots/stalwart/config-init.toml
scp docker/stalwart/init-stalwart.sh root@$BG_HOST:/etc/batchshots/stalwart/init-stalwart.sh
ssh root@$BG_HOST "chmod +x /etc/batchshots/stalwart/init-stalwart.sh"

# Remove the existing stack
docker -H=$BG_HOST stack rm batchshots

# Wait for the stack to be completely removed
sleep 10

# Deploy the stack again
docker -H=$BG_HOST stack deploy -c docker-batchshots-core.yml batchshots --detach=false
