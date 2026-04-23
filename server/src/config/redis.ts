//This file creates one shared Redis client for the entire app

import Redis from "ioredis";

//Connects using the REDIS_URL from .env
const redis = new Redis(process.env["REDIS_URL"] || "redis://localhost:6379");

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

export default redis;
