#!/bin/bash
cp .env.local.example .env
npm install
npm run build
node server.js
