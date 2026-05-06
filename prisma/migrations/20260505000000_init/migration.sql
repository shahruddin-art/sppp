-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "zone" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "reference_no" TEXT NOT NULL,
    "applicant_name" TEXT NOT NULL,
    "applicant_ic" TEXT NOT NULL,
    "applicant_phone" TEXT,
    "applicant_address" TEXT,
    "application_type" TEXT NOT NULL,
    "business_type" TEXT,
    "zone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "file_number" TEXT,
    "current_step" TEXT NOT NULL,
    "pt_staff_id" TEXT,
    "ppkp_staff_id" TEXT,
    "ppl_staff_id" TEXT,
    "plb_staff_id" TEXT,
    "plb_decision" TEXT,
    "plb_decision_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sla_days" DOUBLE PRECISION NOT NULL,
    "sla_deadline" TIMESTAMP(3),
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_configs" (
    "id" TEXT NOT NULL,
    "step_name" TEXT NOT NULL,
    "sla_days" DOUBLE PRECISION NOT NULL,
    "warning_days" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "applications_reference_no_key" ON "applications"("reference_no");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_configs_step_name_key" ON "kpi_configs"("step_name");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_pt_staff_id_fkey" FOREIGN KEY ("pt_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ppkp_staff_id_fkey" FOREIGN KEY ("ppkp_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ppl_staff_id_fkey" FOREIGN KEY ("ppl_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_plb_staff_id_fkey" FOREIGN KEY ("plb_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
