import mongoose from "mongoose";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: "vedam",
  });

  isConnected = true;
  console.log("MongoDB connected");
}

export default async function handler(req, res) {
  try {
    await connectDB();

    return res.status(200).json({ message: "DB Connected" });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}