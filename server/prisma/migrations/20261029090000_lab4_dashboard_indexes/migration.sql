CREATE INDEX "Ticket_requesterId_status_resolvedAt_idx" ON "Ticket"("requesterId", "status", "resolvedAt");
CREATE INDEX "Ticket_ownerId_status_idx" ON "Ticket"("ownerId", "status");
CREATE INDEX "Ticket_updatedAt_id_idx" ON "Ticket"("updatedAt", "id");
