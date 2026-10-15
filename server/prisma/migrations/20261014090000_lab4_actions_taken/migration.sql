-- CreateEnum
CREATE TYPE "ActionTakenStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "updatedById" INTEGER NOT NULL,
    "performedById" INTEGER,
    "actionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "cancelReason" TEXT,
    "status" "ActionTakenStatus" NOT NULL DEFAULT 'PLANNED',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientRequestId" UUID NOT NULL,
    "requestFingerprint" TEXT NOT NULL,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActionTaken_ticketId_actionAt_id_idx" ON "ActionTaken"("ticketId", "actionAt", "id");

-- CreateIndex
CREATE INDEX "ActionTaken_assigneeId_status_actionAt_id_idx" ON "ActionTaken"("assigneeId", "status", "actionAt", "id");

-- CreateIndex
CREATE INDEX "ActionTaken_createdById_idx" ON "ActionTaken"("createdById");

-- CreateIndex
CREATE INDEX "ActionTaken_updatedById_idx" ON "ActionTaken"("updatedById");

-- CreateIndex
CREATE INDEX "ActionTaken_performedById_idx" ON "ActionTaken"("performedById");

-- CreateIndex
CREATE UNIQUE INDEX "ActionTaken_ticketId_createdById_clientRequestId_key" ON "ActionTaken"("ticketId", "createdById", "clientRequestId");

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

