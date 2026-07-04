// backend/prisma.config.ts
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  
  migrations: {
    path: "prisma/migrations",
    // 💡 UPDATED LINK: Explicitly pass the project tsconfig flag to ts-node!
    seed: "ts-node --project tsconfig.json prisma/seed.ts",
  },
  
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
