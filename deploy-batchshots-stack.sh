BG_HOST=168.119.171.184
IMAGE_NAME="$BG_HOST:5000/batchshots:latest"

echo "Copy files to $BG_HOST"
#traefik
scp -r docker/traefik/traefik.yml root@$BG_HOST:/etc/batchshots/traefik.yml


# Remove the existing stack
docker -H=$BG_HOST stack rm batchshots

# Wait for the stack to be completely removed
sleep 10

# Deploy the stack again
docker -H=$BG_HOST stack deploy -c docker-batchshots-core.yml batchshots --detach=false
