import prisma from "../config/db";

export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findUserById = (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const findUserByGoogleId = (googleId: string) => {
  return prisma.user.findUnique({ where: { google_id: googleId } });
};

export const createUser = (data: {
  name: string;
  email: string;
  password?: string;
  google_id?: string;
}) => {
  return prisma.user.create({ data });
};
