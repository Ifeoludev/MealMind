-- AlterTable: make password nullable for Google OAuth users
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable: add google_id column
ALTER TABLE "User" ADD COLUMN "google_id" TEXT;

-- CreateIndex: google_id must be unique per user
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");
