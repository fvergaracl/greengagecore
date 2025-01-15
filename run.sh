#!/bin/bash

if ! docker network ls | grep -q "greencrowd"; then
  echo "[INFO] The network 'greencrowd' does not exist. Creating network..."
  docker network create greencrowd
else
  echo "[INFO] The network 'greencrowd' already exists." 
fi

docker-compose -f docker-compose-dev.yml up --build
