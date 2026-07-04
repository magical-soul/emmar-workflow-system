import { itemRepository } from "../repositories/index";

export class ItemService {
  async getTenantInventory(tenantId: string) {
    return await itemRepository.findAllByTenant(tenantId);
  }
}
