-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "total_estimated_cost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "estimated_cost" DOUBLE PRECISION;
