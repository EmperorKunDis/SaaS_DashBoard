#!/bin/bash
cd "$(dirname "$0")"
# Ensure we have the build
if [ ! -d "dist" ]; then
  npm run build
fi
npm run electron:start
