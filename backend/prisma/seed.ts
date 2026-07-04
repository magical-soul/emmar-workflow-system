import 'dotenv/config';
import { prisma } from '../src/utils/db'; 

async function main() {
  console.log('Initiating Emaar Enterprise Database Seeding Script...');

  // Purge any historical data safely to prevent unique constraint collisions
  await prisma.auditLog.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.workflowTransition.deleteMany({});
  await prisma.workflowState.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.tenantMembership.deleteMany({});
  await prisma.tenant.deleteMany({});

  // Create Three Core Emaar Enterprise Tenant Workspaces
  const properties = await prisma.tenant.create({ data: { name: 'Emaar Properties' } });
  const malls = await prisma.tenant.create({ data: { name: 'Emaar Malls' } });
  const entertainment = await prisma.tenant.create({ data: { name: 'Emaar Entertainment' } });

  console.log(`Seeded Tenants: \n - ${properties.name} (${properties.id})\n - ${malls.name} (${malls.id})\n - ${entertainment.name} (${entertainment.id})`);

  // Map Cross-Tenant User Identities & Access Rights
  // Jyoti is an ADMIN for Emaar Properties, but an APPROVER for Emaar Malls!
  await prisma.tenantMembership.createMany({
    data: [
      { userId: 'user-jyoti', tenantId: properties.id, role: 'ADMIN' },
      { userId: 'user-jyoti', tenantId: malls.id, role: 'APPROVER' },
      { userId: 'user-bob', tenantId: properties.id, role: 'APPROVER' },
      { userId: 'user-alice', tenantId: properties.id, role: 'USER' }
    ]
  });

  // Deploy an Immutable Workflow Blueprint for Emaar Properties
  const propertiesWorkflow = await prisma.workflow.create({
    data: {
      tenantId: properties.id,
      title: 'Luxury Property Sales Contract',
      version: 1
    }
  });

  // Configure Blueprint States (The Board Columns)
  const draftState = await prisma.workflowState.create({
    data: { workflowId: propertiesWorkflow.id, tenantId: properties.id, name: 'DRAFT' }
  });
  const pendingState = await prisma.workflowState.create({
    data: { workflowId: propertiesWorkflow.id, tenantId: properties.id, name: 'PENDING_APPROVAL' }
  });
  const confirmedState = await prisma.workflowState.create({
    data: { workflowId: propertiesWorkflow.id, tenantId: properties.id, name: 'CONFIRMED' }
  });

  // Configure Blueprint Transitions (The Safety Arrows)
  // Transition A: DRAFT -> PENDING_APPROVAL (Automated progression, no signature required)
  await prisma.workflowTransition.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      fromStateName: draftState.name,
      toStateName: pendingState.name,
      requiresApproval: false
    }
  });

  // Transition B: PENDING_APPROVAL -> CONFIRMED (Locked path. Requires a SINGLE approval signature)
  await prisma.workflowTransition.create({
    data: {
      workflowId: propertiesWorkflow.id,
      tenantId: properties.id,
      fromStateName: pendingState.name,
      toStateName: confirmedState.name,
      requiresApproval: true,
      approvalStrategy: 'SINGLE'
    }
  });

  // Seed a Live Transactional Item for Alice under Emaar Properties
  await prisma.item.create({
    data: {
      tenantId: properties.id,
      workflowId: propertiesWorkflow.id,
      currentState: 'DRAFT',
      title: 'Burj Khalifa Penthouse 102 Reservation Order',
      createdBy: 'user-alice',
      version: 1,
      slaHours: 48
    }
  });

  console.log('Emaar Corporate Database Environment successfully seeded!');
}

main()
  .catch((e:any) => {
    console.error('Database seeding failed with exception:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
