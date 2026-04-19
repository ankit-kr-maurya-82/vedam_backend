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

export default connectDB;
