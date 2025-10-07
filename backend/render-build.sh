#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
npx puppeteer browsers install chrome