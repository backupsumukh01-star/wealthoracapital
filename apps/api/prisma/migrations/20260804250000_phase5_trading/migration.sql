-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'RUNNING', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeOutcome" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');

-- CreateEnum
CREATE TYPE "TradeRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AllocationMode" AS ENUM ('EQUAL', 'PERCENTAGE', 'CAPITAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "DailyReturnRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReturnBasis" AS ENUM ('BALANCE', 'INVESTED');

-- CreateEnum
CREATE TYPE "TradingDayStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISTRIBUTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "TradeHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'OPENED', 'CLOSED', 'CANCELLED', 'DUPLICATED', 'ARCHIVED', 'PUBLISHED', 'HIDDEN', 'ALLOCATED', 'NOTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityKind" ADD VALUE 'TRADE_OPENED';
ALTER TYPE "ActivityKind" ADD VALUE 'TRADE_CLOSED';
ALTER TYPE "ActivityKind" ADD VALUE 'TRADE_PUBLISHED';
ALTER TYPE "ActivityKind" ADD VALUE 'DAILY_RETURN_APPLIED';
ALTER TYPE "ActivityKind" ADD VALUE 'DISTRIBUTION_COMPLETE';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'TRADING';

-- CreateTable
CREATE TABLE "trading_sessions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "pair" VARCHAR(20) NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "strategy" VARCHAR(80),
    "risk" "TradeRisk" NOT NULL DEFAULT 'MEDIUM',
    "leverage" DECIMAL(10,2),
    "lot_size" DECIMAL(20,8),
    "entry_price" DECIMAL(20,8) NOT NULL,
    "exit_price" DECIMAL(20,8),
    "stop_loss" DECIMAL(20,8),
    "take_profit" DECIMAL(20,8),
    "open_time" TIMESTAMP(3),
    "close_time" TIMESTAMP(3),
    "trade_date" DATE NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'DRAFT',
    "outcome" "TradeOutcome",
    "profit_amount" DECIMAL(20,8),
    "loss_amount" DECIMAL(20,8),
    "return_pct" DECIMAL(12,6),
    "pips" DECIMAL(20,8),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "admin_notes" VARCHAR(2000),
    "session_id" UUID,
    "created_by_id" UUID,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_allocations" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mode" "AllocationMode" NOT NULL DEFAULT 'CAPITAL',
    "allocated_amount" DECIMAL(20,8) NOT NULL,
    "allocation_pct" DECIMAL(12,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_results" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "outcome" "TradeOutcome" NOT NULL,
    "return_pct" DECIMAL(12,6) NOT NULL,
    "profit_amount" DECIMAL(20,8) NOT NULL,
    "notes" VARCHAR(1000),
    "settled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_histories" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "TradeHistoryAction" NOT NULL,
    "message" VARCHAR(1000),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_returns" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "TradingDayStatus" NOT NULL DEFAULT 'DRAFT',
    "computed_return_pct" DECIMAL(12,6),
    "net_return_pct" DECIMAL(12,6),
    "trade_count" INTEGER NOT NULL DEFAULT 0,
    "win_count" INTEGER NOT NULL DEFAULT 0,
    "loss_count" INTEGER NOT NULL DEFAULT 0,
    "summary" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_return_runs" (
    "id" UUID NOT NULL,
    "daily_return_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "return_pct" DECIMAL(12,6) NOT NULL,
    "return_basis" "ReturnBasis" NOT NULL DEFAULT 'BALANCE',
    "status" "DailyReturnRunStatus" NOT NULL DEFAULT 'PENDING',
    "eligible_wallets" INTEGER NOT NULL DEFAULT 0,
    "processed_wallets" INTEGER NOT NULL DEFAULT 0,
    "total_base_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_distributed" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "rounding_delta" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "created_by_id" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_return_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_distributions" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "eligible_balance" DECIMAL(20,8) NOT NULL,
    "return_pct" DECIMAL(12,6) NOT NULL,
    "gross_amount" DECIMAL(20,8) NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "balance_after" DECIMAL(20,8) NOT NULL,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "ledger_txn_id" UUID,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL,
    "available" DECIMAL(20,8) NOT NULL,
    "invested" DECIMAL(20,8) NOT NULL,
    "profit" DECIMAL(20,8) NOT NULL,
    "daily_profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "portfolio_value" DECIMAL(20,8) NOT NULL,
    "roi_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" UUID NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "period_key" VARCHAR(32) NOT NULL,
    "user_id" UUID,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_performances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_roi_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "win_rate_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "active_days" INTEGER NOT NULL DEFAULT 0,
    "best_day_profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "worst_day_profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "avg_daily_return_pct" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investor_performances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trading_sessions_is_active_starts_at_idx" ON "trading_sessions"("is_active", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "trades_reference_key" ON "trades"("reference");

-- CreateIndex
CREATE INDEX "trades_status_trade_date_idx" ON "trades"("status", "trade_date");

-- CreateIndex
CREATE INDEX "trades_pair_idx" ON "trades"("pair");

-- CreateIndex
CREATE INDEX "trades_strategy_idx" ON "trades"("strategy");

-- CreateIndex
CREATE INDEX "trades_is_public_idx" ON "trades"("is_public");

-- CreateIndex
CREATE INDEX "trades_reference_idx" ON "trades"("reference");

-- CreateIndex
CREATE INDEX "trade_allocations_user_id_idx" ON "trade_allocations"("user_id");

-- CreateIndex
CREATE INDEX "trade_allocations_trade_id_idx" ON "trade_allocations"("trade_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_allocations_trade_id_user_id_key" ON "trade_allocations"("trade_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_results_trade_id_key" ON "trade_results"("trade_id");

-- CreateIndex
CREATE INDEX "trade_histories_trade_id_created_at_idx" ON "trade_histories"("trade_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_returns_date_key" ON "daily_returns"("date");

-- CreateIndex
CREATE INDEX "daily_returns_status_date_idx" ON "daily_returns"("status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_return_runs_idempotency_key_key" ON "daily_return_runs"("idempotency_key");

-- CreateIndex
CREATE INDEX "daily_return_runs_date_status_idx" ON "daily_return_runs"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "profit_distributions_idempotency_key_key" ON "profit_distributions"("idempotency_key");

-- CreateIndex
CREATE INDEX "profit_distributions_user_id_date_idx" ON "profit_distributions"("user_id", "date");

-- CreateIndex
CREATE INDEX "profit_distributions_date_idx" ON "profit_distributions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "profit_distributions_run_id_user_id_key" ON "profit_distributions"("run_id", "user_id");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_date_idx" ON "portfolio_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_snapshots_user_id_date_key" ON "portfolio_snapshots"("user_id", "date");

-- CreateIndex
CREATE INDEX "performance_metrics_scope_period_period_key_idx" ON "performance_metrics"("scope", "period", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "performance_metrics_scope_period_period_key_user_id_key" ON "performance_metrics"("scope", "period", "period_key", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "investor_performances_user_id_key" ON "investor_performances"("user_id");

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "trading_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_allocations" ADD CONSTRAINT "trade_allocations_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_allocations" ADD CONSTRAINT "trade_allocations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_results" ADD CONSTRAINT "trade_results_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_histories" ADD CONSTRAINT "trade_histories_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_return_runs" ADD CONSTRAINT "daily_return_runs_daily_return_id_fkey" FOREIGN KEY ("daily_return_id") REFERENCES "daily_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "daily_return_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_performances" ADD CONSTRAINT "investor_performances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

