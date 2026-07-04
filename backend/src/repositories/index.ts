import { AuditRepository } from "./auditRepository";
import { ItemRepository } from "./itemRepository";

export const itemRepository = new ItemRepository();
export const auditRepository = new AuditRepository();
