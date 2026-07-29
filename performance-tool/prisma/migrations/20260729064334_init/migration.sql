-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PerspectiveKind" AS ENUM ('DELIVERY_QUALITY', 'CLIENT_STAKEHOLDER', 'COMMERCIAL_EFFICIENCY', 'PEOPLE_GROWTH');

-- CreateEnum
CREATE TYPE "CheckInType" AS ENUM ('WEEKLY', 'PROBATION_REVIEW', 'PIP_REVIEW');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('NOT_STARTED', 'SELF_IN_PROGRESS', 'AWAITING_MANAGER', 'AWAITING_DISCUSSION', 'AWAITING_ACKNOWLEDGEMENT', 'COMPLETE', 'MISSED');

-- CreateEnum
CREATE TYPE "RaterKind" AS ENUM ('SELF', 'MANAGER');

-- CreateEnum
CREATE TYPE "BlockerStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DROPPED');

-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'DROPPED');

-- CreateEnum
CREATE TYPE "PipStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportActionType" AS ENUM ('TRAINING', 'GUIDANCE', 'COUNSELLING', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "entra_object_id" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "job_title" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecard_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorecard_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_perspectives" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "kind" "PerspectiveKind" NOT NULL,
    "weight_pct" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "template_perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_measures" (
    "id" UUID NOT NULL,
    "perspective_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "anchor_3" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "template_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "version" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecard_perspectives" (
    "id" UUID NOT NULL,
    "scorecard_id" UUID NOT NULL,
    "kind" "PerspectiveKind" NOT NULL,
    "weight_pct" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "scorecard_perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecard_measures" (
    "id" UUID NOT NULL,
    "perspective_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "anchor_3" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "scorecard_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "scorecard_id" UUID NOT NULL,
    "iso_year" INTEGER NOT NULL,
    "iso_week" INTEGER NOT NULL,
    "type" "CheckInType" NOT NULL DEFAULT 'WEEKLY',
    "status" "CheckInStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "win_of_week" TEXT,
    "focus_next_week" TEXT,
    "in_the_way" TEXT,
    "support_needed" TEXT,
    "coaching_note" TEXT,
    "agreed_priorities" TEXT,
    "self_submitted_at" TIMESTAMP(3),
    "manager_submitted_at" TIMESTAMP(3),
    "discussion_held_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "pip_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_events" (
    "id" UUID NOT NULL,
    "check_in_id" UUID NOT NULL,
    "from_status" "CheckInStatus",
    "to_status" "CheckInStatus" NOT NULL,
    "actor_id" UUID,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measure_ratings" (
    "id" UUID NOT NULL,
    "check_in_id" UUID NOT NULL,
    "measure_id" UUID NOT NULL,
    "rater" "RaterKind" NOT NULL,
    "rating" INTEGER,
    "not_applicable" BOOLEAN NOT NULL DEFAULT false,
    "na_reason" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measure_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "check_in_id" UUID,
    "description" TEXT NOT NULL,
    "owner_id" UUID,
    "target_date" DATE,
    "status" "BlockerStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_objectives" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "target_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "development_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_objective_notes" (
    "id" UUID NOT NULL,
    "objective_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "development_objective_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pips" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "status" "PipStatus" NOT NULL DEFAULT 'DRAFT',
    "standard_required" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "final_outcome" TEXT,
    "outcome_reasoning" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pip_measures" (
    "id" UUID NOT NULL,
    "pip_id" UUID NOT NULL,
    "measure_id" UUID NOT NULL,
    "shortfall" TEXT NOT NULL,

    CONSTRAINT "pip_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pip_support_actions" (
    "id" UUID NOT NULL,
    "pip_id" UUID NOT NULL,
    "type" "SupportActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "provided_at" DATE NOT NULL,

    CONSTRAINT "pip_support_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pip_reviews" (
    "id" UUID NOT NULL,
    "pip_id" UUID NOT NULL,
    "check_in_id" UUID,
    "review_date" DATE NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pip_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendments" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_log" (
    "id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "subject_user_id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" UUID,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_entra_object_id_key" ON "users"("entra_object_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_perspectives_template_id_kind_key" ON "template_perspectives"("template_id", "kind");

-- CreateIndex
CREATE INDEX "scorecards_user_id_effective_from_idx" ON "scorecards"("user_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "scorecards_user_id_version_key" ON "scorecards"("user_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "scorecard_perspectives_scorecard_id_kind_key" ON "scorecard_perspectives"("scorecard_id", "kind");

-- CreateIndex
CREATE INDEX "check_ins_manager_id_status_idx" ON "check_ins"("manager_id", "status");

-- CreateIndex
CREATE INDEX "check_ins_iso_year_iso_week_idx" ON "check_ins"("iso_year", "iso_week");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_user_id_iso_year_iso_week_type_key" ON "check_ins"("user_id", "iso_year", "iso_week", "type");

-- CreateIndex
CREATE INDEX "check_in_events_check_in_id_idx" ON "check_in_events"("check_in_id");

-- CreateIndex
CREATE UNIQUE INDEX "measure_ratings_check_in_id_measure_id_rater_key" ON "measure_ratings"("check_in_id", "measure_id", "rater");

-- CreateIndex
CREATE INDEX "blockers_owner_id_status_idx" ON "blockers"("owner_id", "status");

-- CreateIndex
CREATE INDEX "blockers_user_id_idx" ON "blockers"("user_id");

-- CreateIndex
CREATE INDEX "development_objectives_user_id_status_idx" ON "development_objectives"("user_id", "status");

-- CreateIndex
CREATE INDEX "pips_user_id_idx" ON "pips"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pip_measures_pip_id_measure_id_key" ON "pip_measures"("pip_id", "measure_id");

-- CreateIndex
CREATE INDEX "amendments_entity_type_entity_id_idx" ON "amendments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "access_log_subject_user_id_at_idx" ON "access_log"("subject_user_id", "at");

-- CreateIndex
CREATE INDEX "access_log_viewer_id_at_idx" ON "access_log"("viewer_id", "at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_perspectives" ADD CONSTRAINT "template_perspectives_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "scorecard_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_measures" ADD CONSTRAINT "template_measures_perspective_id_fkey" FOREIGN KEY ("perspective_id") REFERENCES "template_perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "scorecard_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecard_perspectives" ADD CONSTRAINT "scorecard_perspectives_scorecard_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecard_measures" ADD CONSTRAINT "scorecard_measures_perspective_id_fkey" FOREIGN KEY ("perspective_id") REFERENCES "scorecard_perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_scorecard_id_fkey" FOREIGN KEY ("scorecard_id") REFERENCES "scorecards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_pip_id_fkey" FOREIGN KEY ("pip_id") REFERENCES "pips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_events" ADD CONSTRAINT "check_in_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measure_ratings" ADD CONSTRAINT "measure_ratings_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measure_ratings" ADD CONSTRAINT "measure_ratings_measure_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "scorecard_measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_objectives" ADD CONSTRAINT "development_objectives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_objective_notes" ADD CONSTRAINT "development_objective_notes_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "development_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_objective_notes" ADD CONSTRAINT "development_objective_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pips" ADD CONSTRAINT "pips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pips" ADD CONSTRAINT "pips_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pip_measures" ADD CONSTRAINT "pip_measures_pip_id_fkey" FOREIGN KEY ("pip_id") REFERENCES "pips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pip_measures" ADD CONSTRAINT "pip_measures_measure_id_fkey" FOREIGN KEY ("measure_id") REFERENCES "scorecard_measures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pip_support_actions" ADD CONSTRAINT "pip_support_actions_pip_id_fkey" FOREIGN KEY ("pip_id") REFERENCES "pips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pip_reviews" ADD CONSTRAINT "pip_reviews_pip_id_fkey" FOREIGN KEY ("pip_id") REFERENCES "pips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pip_reviews" ADD CONSTRAINT "pip_reviews_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
