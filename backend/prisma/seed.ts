import "dotenv/config";
import { prisma } from "../src/utils/db";

async function main() {
  console.log("Initiating Emaar Enterprise Database Seeding Script...");

  // Purge historical data to ensure a clean sandbox run
  await prisma.auditLog.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.workflowTransition.deleteMany({});
  await prisma.workflowState.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.tenantMembership.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log("Database sandboxes successfully cleared.");

  // FORCE STATICS — Must match frontend SEEDED_TENANTS array exactly!
  const properties = await prisma.tenant.create({
    data: {
      id: "4186f5eb-ffc4-482d-b57b-98200fa2e5b4",
      name: "Emaar Properties",
    },
  });
  const malls = await prisma.tenant.create({
    data: { id: "9dafb475-bb40-45fc-8a04-6d80e0d7624f", name: "Emaar Malls" },
  });
  const entertainment = await prisma.tenant.create({
    data: {
      id: "fba217ae-6d70-4d38-aa42-b1548da6377a",
      name: "Emaar Entertainment",
    },
  });

  console.log(
    `Seeded Tenants: \n - ${properties.name} (${properties.id})\n - ${malls.name} (${malls.id})\n - ${entertainment.name} (${entertainment.id})`,
  );

  // Jyoti is an ADMIN for Emaar Properties, but an APPROVER for Emaar Malls!
  await prisma.tenantMembership.createMany({
    data: [
      { userId: "user-jyoti", tenantId: properties.id, role: "ADMIN" },
      { userId: "user-jyoti", tenantId: malls.id, role: "APPROVER" },
      { userId: "user-bob", tenantId: properties.id, role: "APPROVER" },
      { userId: "user-alice", tenantId: properties.id, role: "USER" },
    ],
  });

  // Deploy a baseline Version 1 Workflow Blueprint for Emaar Properties 
  const propertiesWorkflow = await prisma.workflow.create({
    data: {
      tenantId: properties.id,
      title: "Luxury Property Sales Contract",
      version: 1,
    },
  });

  // Configure Blueprint States (The Board Columns) 
  const draftState = await prisma.workflowState.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      name: "DRAFT",
    },
  });
  const pendingState = await prisma.workflowState.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      name: "PENDING_APPROVAL",
    },
  });
  const confirmedState = await prisma.workflowState.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      name: "CONFIRMED",
    },
  });

  // Configure Blueprint Transitions 
  await prisma.workflowTransition.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      fromStateName: draftState.name,
      toStateName: pendingState.name,
      requiresApproval: false,
    },
  });

  // Save reference to this arrow so we can hook it directly to Bob's signature queue 
  const approvalTransition = await prisma.workflowTransition.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      fromStateName: pendingState.name,
      toStateName: confirmedState.name,
      requiresApproval: true,
      approvalStrategy: "SINGLE",
    },
  });

  // Create a live pre-loaded transactional asset card item 
  const seedItem = await prisma.item.create({
    data: {
      tenantId: properties.id,
      workflowId: propertiesWorkflow.id,
      currentState: "PENDING_APPROVAL", // Start it waiting inside the verification column 
      title: "Burj Khalifa Penthouse 102 Reservation Order",
      createdBy: "user-alice",
      version: 1,
      slaHours: 48,
      updatedAt: new Date() 
    },
  });

  // Bind a matching active ticket token directly to Bob's signature queue! 
  await prisma.approvalRequest.create({
    data: {
      tenantId: properties.id,
      itemId: seedItem.id,
      transitionId: approvalTransition.id,
      assignedApproverId: "user-bob",
      status: "PENDING", // Populates his inbox on screen instantly on first refresh! 
    },
  });

  // Pre-populate the audit history ledger trail with historical creation logs 
  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: properties.id,
        itemId: seedItem.id,
        action: "ITEM_CREATED",
        performedBy: "user-alice",
        payload: JSON.stringify({ title: seedItem.title, workflowVersion: 1 }),
      },
      {
        tenantId: properties.id,
        itemId: seedItem.id,
        action: "TRANSITION_HOLD_TRIGGERED",
        performedBy: "user-alice",
        payload: JSON.stringify({
          previousState: "DRAFT",
          requestedState: "CONFIRMED",
          requiredApprover: "user-bob",
        }),
      },
    ],
  });

  console.log("Emaar Corporate Database Environment successfully seeded!");
}

main()
  .catch((e: any) => {
    console.error("🚨 Database seeding failed with exception:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
