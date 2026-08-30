export const TIER_MULTIPLIERS = Object.freeze({
  gold: 1,
  platinum: 1.15,
  diamond: 1.25,
});

export function getTierPriceFromGold(goldPrice, tierId) {
  const basePrice = Number(goldPrice);
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0;

  return Math.round(basePrice * (TIER_MULTIPLIERS[tierId] ?? TIER_MULTIPLIERS.gold));
}
