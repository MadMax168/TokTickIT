# TokTickIT

IT Service Desk — CPE334 Individual Sprint

## Prerequisites
- Node.js 20+
- PostgreSQL

## Setup

### 1. Clone
git clone https://github.com/MadMax168/TokTickIT.git
cd toktickit

### 2. Server
cd server
cp .env.example .env
# Fill in DATABASE_URL in .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev

### 3. Client
cd client
npm install
npm run dev

## Run Tests
cd server && npm test
cd client && npm test