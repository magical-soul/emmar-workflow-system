import { prisma } from "../utils/db";

export class ItemRepository {

  async findAllByTenant(tenantId: string) {
    return await prisma.item.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' }
    });
  }
}
