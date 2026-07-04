import { ItemRepository } from '../repositories/itemRepository';

const itemRepository = new ItemRepository();

export class ItemService {
  async getTenantInventory(tenantId: string) {
    return await itemRepository.findAllByTenant(tenantId);
  }
}
