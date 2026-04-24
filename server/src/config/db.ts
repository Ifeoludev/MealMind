import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";

// prisma-client-js reads DATABASE_URL from the environment automatically
const prisma = new PrismaClient();

export default prisma;
