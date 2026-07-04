## 🕹️ End-to-End System Testing Playbook

This monorepo project enforces automated verification controls. Follow these simple steps to spin up the local environment infrastructure and test the system engine end-to-end:

### 1. Provision Infrastructure & Hydrate Database
Open a single terminal window inside the absolute root folder directory and fire the deployment loop macros:
```bash
# Spin up the declarative Docker PostgreSQL database sandbox
npm run infra:up

# Push relational data mappings and sync schemas 
npm run db:migrate

# Hydrate the tables with active Emaar enterprise workspaces and workflow matrices
npm run db:seed
```

### 2. Launch the Application API Server
Fire our live hot-reloader to activate the multi-tenant ingestion engines:
```bash
npm run dev:backend
```

### 3. Execution Path A: Run Automated One-Click E2E Integration Tests
Open a separate terminal window at the absolute root folder and run this central macro. The script dynamically extracts valid UUID records straight from the database and runs live API network assertions against the server:
```bash
npm run test:e2e
```

### 4. Execution Path B: Manual Postman Inspection
An embedded, pre-configured collection profile is provided natively inside the codebase (`emaar-workflow-api-collection.json`). 
1. Open your Postman client app and click **Import**.
2. Select the JSON file from your project folder tree.
3. Turn on Prisma Studio via `npm run db:studio` to copy active UUID cells directly into your network header trackers to trace complete data isolation.
