#!/bin/sh

SERVICE_NAME=batchshots
echo "service: $SERVICE_NAME"

BG_HOST=168.119.171.184
TAG=0.1
echo "tag: $TAG"

git branch --show-current
#git pull && echo "pulled"

docker build --progress=plain --platform linux/amd64 -f docker/$SERVICE_NAME/Dockerfile -t $BG_HOST:5000/$SERVICE_NAME:$TAG .
docker push $BG_HOST:5000/$SERVICE_NAME:$TAG

docker -H=$BG_HOST service update --force --image $BG_HOST:5000/$SERVICE_NAME:$TAG batchshots_batchshots

