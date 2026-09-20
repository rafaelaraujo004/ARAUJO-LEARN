-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isBonus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxInstallments" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "pixDiscountPercent" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "unlocksWithCourseIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "EnrollmentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "payment" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentRequest_status_createdAt_idx" ON "EnrollmentRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_userId_courseId_key" ON "EnrollmentRequest"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
