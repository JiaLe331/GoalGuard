import { BaseUnitStringSchema } from "@/lib/contracts";

const BASIS_POINTS = 10_000n;

/**
 * Calculates proposed ETH-underlying coverage using quantities expressed in
 * the same base unit. The division intentionally rounds down.
 */
export function calculateGoalCoverageBps(candidateQuantityUnderlying: string, requiredGoalQuantityUnderlying: string): number {
  const candidate = BigInt(BaseUnitStringSchema.parse(candidateQuantityUnderlying));
  const required = BigInt(BaseUnitStringSchema.parse(requiredGoalQuantityUnderlying));
  if (required <= 0n) throw new RangeError("Required goal quantity must be positive.");

  const raw = candidate * BASIS_POINTS / required;
  return Number(raw > BASIS_POINTS ? BASIS_POINTS : raw);
}
