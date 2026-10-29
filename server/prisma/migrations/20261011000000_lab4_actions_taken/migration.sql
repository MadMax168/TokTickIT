CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionDateTime" TIMESTAMP(3) NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "performedById" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActionTaken_ticketId_actionDateTime_id_idx" ON "ActionTaken"("ticketId", "actionDateTime", "id");
CREATE INDEX "ActionTaken_assigneeId_actionDateTime_id_idx" ON "ActionTaken"("assigneeId", "actionDateTime", "id");
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
