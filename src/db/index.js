import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

let cachedConnection = null;
let pendingConnection = null;

const connectDB = async () => {
  if (cachedConnection) return cachedConnection;
  if (pendingConnection) return pendingConnection;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  try {
    const parsedUri = new URL(process.env.MONGODB_URI);
    const databaseName = parsedUri.pathname?.replace(/^\//, "");

    if (!databaseName) {
      console.warn(
        "MONGODB_URI does not include a database name. MongoDB will use the default database, which can make existing users appear missing."
      );
    }
  } catch {
    console.warn("Unable to parse MONGODB_URI for database-name validation.");
  }

  pendingConnection = mongoose
.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      bufferCommands: false,
      bufferTimeoutMS: 600000,
    })
    .then((connectionInstance) => {
      cachedConnection = connectionInstance;
      console.log(
        `MongoDB connected. DB HOST: ${connectionInstance.connection.host}, DB NAME: ${connectionInstance.connection.name}`
      );
      return connectionInstance;
    })
    .catch((error) => {
      pendingConnection = null;

      if (error?.name === "MongooseServerSelectionError") {
        console.error(
          "MongoDB Atlas connection failed. Check Network Access IP whitelist, cluster status, and DB credentials."
        );
      }

      throw error;
    });

  return pendingConnection;
};

export default connectDB;
