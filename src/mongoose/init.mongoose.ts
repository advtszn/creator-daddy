
// src/db/init.ts
import mongoose from "mongoose";

export async function initDB() {
  if (mongoose.connection.readyState >= 1) return;

  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log("[db] connected");
}
