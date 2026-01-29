import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // SoundCloud API credentials
  SOUNDCLOUD_CLIENT_ID: process.env.SOUNDCLOUD_CLIENT_ID || "",
  SOUNDCLOUD_CLIENT_SECRET: process.env.SOUNDCLOUD_CLIENT_SECRET || "",
  
  // Demo mode
  DEMO_MODE: process.env.DEMO_MODE === "true",
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || "file:./prisma/dev.db",
};
