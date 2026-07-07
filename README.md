# 🏢 Emaar Enterprise Multi-Tenant Workflow & Approval Engine

An enterprise-grade, high-concurrency, multi-tenant workflow orchestration engine designed to support dynamic, data-driven system blueprint modifications, multi-signature approval strategies, real-time audit trail capturing, and automated SLA escalation lifecycles.

---

## 🏛️ System Core Architecture Diagram

This diagram maps out how an incoming transaction request securely routes from the API Ingestion boundary, passes through our role-based authorization guardrails, and modifies our decoupled data repository layers under strict concurrency protections:

```mermaid
sequenceDiagram
    autonumber
    actor User as React Client (UI)
    participant TG as TenantGuard & AdminGuard
    participant CTRL as Controller Interface
    participant SRV as Workflow & Approval Service
    participant REPO as Data Repository Layer
    participant DB as PostgreSQL (Docker Container)

    User->>TG: POST /api/items/transition (x-tenant-id, x-user-id)
    Note over TG: Validates tenant boundaries & role badges (RBAC)
    TG-->>User: 403 Forbidden (If access validation fails)
    TG->>CTRL: Forward secure authenticated request
    CTRL->>SRV: Invoke business core logic (itemId, targetState)
    SRV->>REPO: Request isolated eager-load resource lookup
    REPO->>DB: SELECT * JOIN (Eliminates N+1 query loops)
    DB-->>REPO: Return database record state
    Note over SRV: Evaluates blueprint map (States & Arrows)
    Note over SRV: Checks advanced strategy (SINGLE/MULTIPLE/QUORUM)
    SRV->>REPO: Trigger atomic mutation write with OCC
    REPO->>DB: UPDATE ... WHERE version = currentVersion AND status = 'PENDING'
    Note over DB: Locks write atomicity on the disk layout
    DB-->>REPO: Return affected rows count (1 = success, 0 = conflict)
    REPO-->>SRV: Bubble transaction results state
    SRV-->>CTRL: Return clean, sanitized JSON object payload
    CTRL-->>User: 200 OK (State transition executed successfully)
```

---

## 🗂️ Monorepo Decoupled Folder Structure

The project implements a strict **Controller-Service-Repository** pattern on the backend , and an **Orchestrator-Controller Hook-Presenter Component** pattern on the frontend, enforcing a strict separation of concerns across both layers :

```text
emaar-workflow-system/
├── docker-compose.yml         # Global declarative container infrastructure layout
├── package.json               # HQ Monorepo configurations (NPM Workspace macros)
├── README.md                  # Comprehensive architectural decision record & playbook
├── backend/
│   ├── package.json           # Subsidiary branch server dependencies
│   ├── tsconfig.json          # Strict Node16 compiler configuration metrics
│   ├── prisma/
│   │   ├── schema.prisma      # Multi-tenant relational schema blueprint (OCC + updatedAt)
│   │   └── seed.ts            # Enterprise corporate static UUID sync seed script
│   └── src/
│       ├── server.ts          # Core Express API entryway & daemon initialization boot
│       ├── middlewares/
│       │   ├── tenantGuard.ts # Row-Level isolation and RBAC authorization intercepts
│       │   └── validate.ts    # Zod payload shape sanitizers & parameter validation
│       ├── repositories/
│       │   ├── itemRepository.ts  # Optimized Prisma transactions & atomic OCC queries
│       │   └── auditRepository.ts # Read-only immutable ledger pipeline operations
│       ├── controllers/
│       │   └── itemController.ts  # Ingress HTTP request parameter mapping endpoint
│       └── services/
│           ├── workflowService.ts # Pure TypeScript blueprint evaluation brain
│           └── slaDaemon.ts       # Asynchronous background temporal sweep daemon worker
└── frontend/
    ├── package.json           # React + Vite application configuration mappings
    ├── src/
    │   ├── main.tsx           # Client framework mount point entry layout
    │   ├── App.tsx            # Clean, zero-boilerplate structural view orchestrator
    │   ├── types.ts           # Shared interface data contracts matching backend models
    │   ├── context/
    │   │   └── WorkspaceContext.tsx # Simulated global workspace identity state provider
    │   ├── hooks/
    │   │   ├── useKanbanItems.ts   # Decoupled inventory matrix query channel hook
    │   │   ├── useTaskInbox.ts     # Decoupled personalized signature task inbox hook
    │   │   ├── useAuditTrail.ts    # Decoupled immutable security timeline logging hook
    │   │   └── useAdminWorkflow.ts # Decoupled administrative layout deployment hook
    │   └── components/
    │       ├── KanbanBoard.tsx              # Presentational Kanban column layout wrapper
    │       ├── ApprovalStrategyProgress.tsx # Extracted dynamic consensus indicator module
    │       └── ActionControlBar.tsx         # User action dispatcher control console
```

---

## 🛠️ Strategic Architectural Decisions & Engineering Trade-offs

### 1. Simple Database Connection Setup (Prisma 7)
Prisma 7 removes the old, heavy binary engines to become much lighter. Because of this change, we built a dedicated database file (`src/utils/db.ts`) to manage our connections safely. It sets up a standard connection pool using the native Node.js `pg` driver and passes it directly into Prisma. This keeps our database connections clean, stable, and highly efficient.

### 2. Preventing Double-Clicks and Data Errors (Concurrency Safety)
To make sure data never gets corrupted when multiple users are clicking things at the same millisecond, the backend uses two safety measures:
*   **Version Checking (OCC):** Every asset card has a `version` number. When updated, the database makes sure the version hasn't changed since the user loaded the page. If another user updated it first, the second update fails safely instead of overwriting data.
*   **Status Constraints:** When a manager approves a task, the code checks that the task status is strictly `PENDING`. If a manager double-clicks the button, the second click is ignored because the task is no longer pending, preventing duplicate processing.

### 3. Dynamic Approval Rules
Instead of hardcoding simple single-signature approvals, our engine reads the specific rules deployed by the administrator to enforce voting rules dynamically:
*   **SINGLE:** Any single manager's approval moves the card forward instantly.
*   **MULTIPLE:** Every generated signature request for that specific step must be marked as `APPROVED` before the card can move forward.
*   **QUORUM:** A majority vote (> 50% of the total seats) is required to approve and move the card.

### 4. Splitting the Frontend Into Focused Custom Hooks
Instead of creating one giant, complicated React hook to manage the entire page—which would cause the whole screen to lag and re-render constantly—we split our logic into four small, independent custom hooks (`useKanbanItems`, `useTaskInbox`, `useAuditTrail`, `useAdminWorkflow`). Now, if the history timeline updates at the bottom of the screen, the main Kanban board doesn't have to reload, keeping the app fast and smooth.

### 5. Automated Time Tracking for SLA Deadlines
To run our background **SLA Worker** (`slaDaemon.ts`) cleanly without adding a bunch of extra timestamp columns to our database, we used Prisma’s built-in `@updatedAt` feature on our main table. Because the background worker checks deadlines based on *when an asset entered the pending column* (rather than when the card was created), this column automatically updates its time code every single time a card changes columns.

* Scaling Note for Production:* For this local app, the dashboard relies on a quick manual refresh to fetch fresh data from the database. In a large production app with thousands of real users, I would upgrade this to use **WebSockets (Socket.io)**. This would keep a live connection open between the backend and frontend, sliding cards across columns automatically the exact second a database change happens without any manual page refreshes.

---

## 🕹️ End-to-End System Testing Playbook

Follow these simple steps inside your terminal to instantiate the local isolated containers and test the system engine end-to-end:

### 1. Provision Infrastructure & Hydrate Database
Open a single terminal window inside your absolute **monorepo root folder directory** and execute the control loop macros:
```bash
# A. Spin up the declarative Docker PostgreSQL database container sandbox
npm run infra:up

# B. Synchronize schema shapes, performance index maps, and generate types cleanly
npm run db:push

# C. Hydrate the tables with our synchronized multi-tenant static UUID seeds
npm run db:seed
```

### 🛡️ Local Infrastructure Connection (Alternative Direct Command)

If you prefer to bypass the script and directly run the command locally, use the following:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/emaar_workflow?schema=public" npx prisma db push --schema=backend/prisma/schema.prisma --force-reset
```

This command directly injects the required database URL, eliminating the need to manually configure a local `.env` file.

### 2. Boot the Full-Stack Environment Server Channels
Fire your live dev utilities inside separate terminal panels to boot both halves of your project simultaneously:
*   **Terminal Tab 1 (Backend Server API):** `npm run dev:backend`
*   **Terminal Tab 2 (React UI Dashboard):** `npm run dev:frontend`

---

## 🔮 Future Improvements & Known Limitations

To build this app quickly, I focused on making the core features stable and secure. While **Multi-Tenant Security**, **Automated SLA Background Workers**, and **Clean Form Resets** are fully working in the code, here are two simple improvements I would make before launching this for thousands of real-world users:

### 1. Dynamic Signature Requirements
* **Limitation:** Right now, to show the progress bars for our testing data, the app assumes a fixed number of signatures for each strategy (for example, any `MULTIPLE` strategy expects exactly 2 signatures).
* **Future Fix:** In a real production system, one tenant might need 3 signatures for a workflow while another needs 5. To fix this, I would add a `requiredSignaturesCount` column to the backend database table. The frontend progress bar could then read that number directly, making signature limits 100% dynamic.

### 2. Real-Time UI Updates without Refreshing
* **Limitation:** Right now, when the background SLA worker runs and moves an expired card to the "Escalated" column in the database, the user has to manually refresh the browser page to see that visual change happen on screen.
* **Future Fix:** For a large production app with thousands of users, constantly refreshing or having the browser bombard the server with updates can slow down performance. I would upgrade the app to use **WebSockets (Socket.io)**. This keeps a live connection open between the backend and frontend, sliding cards across the board instantly the exact second a database change happens, without any page refreshes.

