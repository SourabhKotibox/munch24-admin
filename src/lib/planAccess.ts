export type PlanKey = "free" | "basic" | "standard" | "premium";

export const PLAN_LEVELS: Record<PlanKey, number> = {
  free: 1,
  basic: 2,
  standard: 3,
  premium: 4,
};

export function normalizePlanKey(value?: string | null, level?: number): PlanKey {
  const name = String(value || "").toLowerCase();
  if (name.includes("premium") || name.includes("vip")) return "premium";
  if (name.includes("standard")) return "standard";
  if (name.includes("basic")) return "basic";
  if (name.includes("free")) return "free";
  if ((level || 0) >= 4) return "premium";
  if (level === 3) return "standard";
  if (level === 2) return "basic";
  return "free";
}

export function getPlanLevel(value?: string | null, level?: number): number {
  return PLAN_LEVELS[normalizePlanKey(value, level)];
}

export function isUserSubscriptionActive(user?: {
  subscriptionStatus?: string | null;
  subscriptionExpiry?: string | Date | null;
} | null): boolean {
  if (!user || user.subscriptionStatus !== "active") return false;
  if (!user.subscriptionExpiry) return true;
  return new Date(user.subscriptionExpiry) > new Date();
}

export function getEffectiveUserPlan(user?: {
  subscriptionStatus?: string | null;
  subscriptionExpiry?: string | Date | null;
  subscriptionPlan?: string | null;
} | null): PlanKey {
  if (!isUserSubscriptionActive(user)) return "free";
  return normalizePlanKey(user?.subscriptionPlan);
}

export function isContentLockedForUser(
  user: {
    subscriptionStatus?: string | null;
    subscriptionExpiry?: string | Date | null;
    subscriptionPlan?: string | null;
  } | null | undefined,
  planRequired?: string | null
): boolean {
  if (!planRequired || normalizePlanKey(planRequired) === "free") return false;
  return getPlanLevel(getEffectiveUserPlan(user)) < getPlanLevel(planRequired);
}
