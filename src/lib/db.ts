import { PrismaClient } from "../generated/client";
import fs from "fs";
import path from "path";

// Adaptador Serverless para SQLite en Vercel
if (process.env.VERCEL) {
  try {
    const tmpDbPath = "/tmp/dev.db";
    const srcDbPath = path.join(process.cwd(), "prisma", "dev.db");
    
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(srcDbPath)) {
      fs.copyFileSync(srcDbPath, tmpDbPath);
    }
    if (fs.existsSync(tmpDbPath)) {
      process.env.DATABASE_URL = `file:${tmpDbPath}`;
    }
  } catch (err) {
    console.warn("Serverless DB Copy Notice:", err);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
