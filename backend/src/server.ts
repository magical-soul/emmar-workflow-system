import express from "express";
import cors from "cors";
import { tenantGuard } from "./middlewares/tenantGuard";
import { adminGuard } from "./middlewares/adminGuard";
import {
  getTenantItems,
  triggerItemTransition,
} from "./controllers/itemController";
import { SlaDaemon } from "./services/slaDaemon";
import { processApprovalAction } from "./controllers/approvalController";
import { getItemAuditTimeline } from "./controllers/auditController";
import { createNewTenantWorkflow } from "./controllers/adminWorkflowController";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Base Server Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "online", engine: "Emaar Enterprise Integration Hub" });
});

app.get("/api/items", tenantGuard, getTenantItems);
app.post("/api/items/transition", tenantGuard, triggerItemTransition);
app.post("/api/approvals/resolve", tenantGuard, processApprovalAction);
app.get("/api/audit-logs/:itemId", tenantGuard, getItemAuditTimeline);

// adminGuard-protected route for workflow configuration changes
app.post('/api/workflows/configure', tenantGuard, adminGuard, createNewTenantWorkflow);

app.listen(PORT, () => {
  console.log(
    `Core Server running smoothly on network register: http://localhost:${PORT}`,
  );
  const slaEngine = new SlaDaemon();
  slaEngine.start(60000);
});
