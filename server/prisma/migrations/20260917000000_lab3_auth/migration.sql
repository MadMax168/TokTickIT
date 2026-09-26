-- Issue 2: retain DevelopmentRequester for the explicitly deferred selector routes.
-- No Ticket/Attachment rows or files are removed. Run in a maintenance window.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT lower(btrim(email)) FROM "DevelopmentRequester" GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
  RAISE EXCEPTION 'Requester email normalization collision; migration aborted';
 END IF;
 IF EXISTS (SELECT 1 FROM "Ticket" t LEFT JOIN "DevelopmentRequester" d ON d.id=t."requesterId" WHERE d.id IS NULL) THEN
  RAISE EXCEPTION 'Orphan requester reference; migration aborted';
 END IF;
END $$;
CREATE TYPE "Role" AS ENUM ('REQUESTER','IT_STAFF','ADMINISTRATOR');
ALTER TYPE "TicketStatus" ADD VALUE 'OPEN';
ALTER TYPE "TicketStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE 'RESOLVED';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';
ALTER TYPE "TicketStatus" ADD VALUE 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE 'CANCELLED';
CREATE TABLE "User" (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE CHECK (email=lower(btrim(email))),
 "passwordHash" TEXT NOT NULL, role "Role" NOT NULL DEFAULT 'REQUESTER',
 active BOOLEAN NOT NULL DEFAULT true, "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
-- A non-password sentinel fails verification until the operator provisions a unique password.
-- It is neither a shared default password nor a usable password hash.
INSERT INTO "User" (id,name,email,"passwordHash",role,active,"createdAt","updatedAt")
 SELECT id,name,lower(btrim(email)),'!UNPROVISIONED','REQUESTER',active,"createdAt","updatedAt" FROM "DevelopmentRequester";
SELECT setval(pg_get_serial_sequence('"User"','id'), COALESCE((SELECT max(id) FROM "User"),1), EXISTS(SELECT 1 FROM "User"));
CREATE INDEX "User_role_active_id_idx" ON "User"(role,active,id);
CREATE TABLE "Session" (
 id TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "csrfToken" TEXT NOT NULL,
 "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastSeenAt" TIMESTAMP(3) NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3)
);
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId","revokedAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "LoginFailure" (id SERIAL PRIMARY KEY, key TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "LoginFailure_key_createdAt_idx" ON "LoginFailure"(key,"createdAt");
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_requesterId_fkey";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD COLUMN "itPriority" "RequestedPriority", ADD COLUMN "assignedToId" INTEGER REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
 ADD COLUMN "problemAppearsResolved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "statusChangedById" INTEGER REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
 ADD COLUMN "statusChangedAt" TIMESTAMP(3), ADD COLUMN "statusChangeReason" TEXT;
UPDATE "Ticket" SET "itPriority"="requestedPriority";
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;
CREATE INDEX "Ticket_currentStatus_ticketDate_id_idx" ON "Ticket"("currentStatus","ticketDate",id);
CREATE INDEX "Ticket_assignedToId_currentStatus_idx" ON "Ticket"("assignedToId","currentStatus");
CREATE TABLE "PublicComment" (
 id SERIAL PRIMARY KEY, "ticketId" INTEGER NOT NULL REFERENCES "Ticket"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "authorId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 body TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "seedKey" TEXT UNIQUE
);
CREATE INDEX "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId","createdAt",id);
CREATE TABLE "InternalNote" (
 id SERIAL PRIMARY KEY, "ticketId" INTEGER NOT NULL REFERENCES "Ticket"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 "authorId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 body TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "seedKey" TEXT UNIQUE
);
CREATE INDEX "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId","createdAt",id);
-- Prevent session revival after deactivate/reactivate or role/password changes, even via SQL.
CREATE FUNCTION revoke_user_sessions() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.active IS DISTINCT FROM OLD.active OR NEW.role IS DISTINCT FROM OLD.role OR NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash" THEN
  UPDATE "Session" SET "revokedAt"=CURRENT_TIMESTAMP WHERE "userId"=NEW.id AND "revokedAt" IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER user_session_revocation AFTER UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION revoke_user_sessions();
COMMIT;
