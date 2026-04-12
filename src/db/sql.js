import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

export const sqlDB = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("SQL ENV:", process.env.DB_USER); // debug
console.log("✅ MySQL pool created 🚀");