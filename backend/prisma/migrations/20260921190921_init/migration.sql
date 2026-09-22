-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Host', 'Security');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'CheckedIn', 'CheckedOut', 'Overstay');

-- CreateEnum
CREATE TYPE "VisitDecision" AS ENUM ('Approved', 'Rejected');

-- CreateTable
CREATE TABLE "Office" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "role" "Role" NOT NULL DEFAULT 'Host',
    "office_id" UUID NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" UUID NOT NULL,
    "event_title" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL,
    "visit_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "host_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "note" TEXT,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" UUID NOT NULL,
    "visitor_name" TEXT NOT NULL,
    "visitor_email" TEXT NOT NULL,
    "visitor_phone" TEXT,
    "company" TEXT,
    "purpose" TEXT,
    "photo_url" TEXT,
    "host_id" UUID NOT NULL,
    "office_id" UUID NOT NULL,
    "invite_id" UUID,
    "status" "VisitStatus" NOT NULL DEFAULT 'Pending',
    "expected_arrival" TIMESTAMP(3) NOT NULL,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "checked_out_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "decision" "VisitDecision" NOT NULL,
    "decided_by" UUID NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" TEXT NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Invite_host_id_visit_date_idx" ON "Invite"("host_id", "visit_date");

-- CreateIndex
CREATE INDEX "Visit_office_id_expected_arrival_status_idx" ON "Visit"("office_id", "expected_arrival", "status");

-- CreateIndex
CREATE INDEX "Visit_visitor_email_idx" ON "Visit"("visitor_email");

-- CreateIndex
CREATE INDEX "Visit_visitor_phone_idx" ON "Visit"("visitor_phone");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_idempotency_key_key" ON "Approval"("idempotency_key");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "Invite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
