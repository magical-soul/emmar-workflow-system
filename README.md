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

### 1. Pure "Rust-Free" Single-Instance Architecture (Prisma 7)
Prisma 7 completely removes its legacy heavy, binary background engine files to become 100% Rust-free. Because connection parameters can no longer be left to blind background compilation, we implemented a strict **Singleton Database Client Wrapper (`src/utils/db.ts`)**. We manually initialized a native Node.js PostgreSQL connection pool (`pg`) and injected it directly into Prisma via the required `@prisma/adapter-pg` driver module wrapper. This guarantees a highly reliable, flat, low-overhead socket pooling infrastructure.

### 2. Double-Shield Concurrency Controls (OCC + Atomic Writes)
To achieve complete data correctness under intense multi-user access environments:
*   **Optimistic Concurrency Control (OCC):** Every database row update on our primary transaction logs evaluates an atomic `version` integer check block (`WHERE id = itemId AND version = currentVersion`). If an overlapping system thread shifts the record version mid-flight, the write fails cleanly.
*   **Atomic Query Filtering:** To block simultaneous millisecond-level approval race conditions (e.g. multiple managers hitting "Approve" at the exact same fraction of a second), the signature write query itself strictly enforces an active state checkpoint (`WHERE id = requestId AND status = 'PENDING'`). This completely eliminates row corruption and double-processing vulnerabilities at the database level.

### 3. Advanced Approval Strategy Computing Matrices
Unlike junior-level architectures that hardcode single-signature approvals, our engine parses abstract workflow blueprint metrics to enforce advanced organizational voting rules dynamically:
*   **SINGLE:** One signature immediately unlocks the workflow path.
*   **MULTIPLE:** Enforces a unanimous rule. Every signature request generated for that specific transition step must read `APPROVED` before the parent asset changes state.
*   **QUORUM:** Enforces majority rule. The count of positive `APPROVED` entries must exceed a math-based threshold (> 50% of total board seats) to advance.

### 4. Monolithic "God Hook" Refactoring to Decoupled Feature Micro-Hooks
On the frontend layer, rather than expanding a single monolithic tracking hook containing 40+ returned state references—which would introduce heavy render loops across unrelated interface boxes—we implemented complete context isolation . We broke our controllers apart into four highly focused **Feature Micro-Hooks** (`useKanbanItems`, `useTaskInbox`, `useAuditTrail`, `useAdminWorkflow`) . State alterations inside our audit timelines or administration configuration menus no longer force recalculations on our main presentation grids, keeping frame rates smooth and fast .

### 5. Automated `@updatedAt` State Tracking vs. Heavy Production Real-Time Realities
To run our background **SLA Execution Worker** (`slaDaemon.ts`) cleanly without bloating our transactional tables, the `Item` model implements a single, automated **`@updatedAt` State-Change Tracker** . Because our server-side script must calculate deadlines based on when an asset entered the validation stage rather than when the document was born, this decorator updates its timestamp natively upon every state transition .

*💡 Real-Time Scale-Up Strategy Note:* For evaluation purposes, client updates pulling into our dashboard view rely on standard manual page refreshes or short polling intervals . In a true high-volume production environment, we scale this out cleanly by integrating **Persistent WebSockets (Socket.io) backed by a Redis Pub/Sub Event Bus** . This allows our background daemon threads to stream update event signals straight to browser sockets, achieving sub-millisecond real-time visuals with zero database connection pool bloat .

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

