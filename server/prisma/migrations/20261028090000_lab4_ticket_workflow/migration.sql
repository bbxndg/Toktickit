ALTER TABLE "Ticket"
ADD COLUMN "requesterResolvedIndication" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requesterResolvedAt" TIMESTAMP(3),
ADD COLUMN "resolutionSummary" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "closedAt" TIMESTAMP(3);

CREATE TABLE "TicketStatusEvent" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "fromStatus" "TicketStatus" NOT NULL,
    "toStatus" "TicketStatus" NOT NULL,
    "actorId" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketStatusEvent_ticketId_createdAt_id_idx" ON "TicketStatusEvent"("ticketId", "createdAt", "id");
CREATE INDEX "TicketStatusEvent_actorId_idx" ON "TicketStatusEvent"("actorId");
ALTER TABLE "TicketStatusEvent" ADD CONSTRAINT "TicketStatusEvent_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketStatusEvent" ADD CONSTRAINT "TicketStatusEvent_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
