interface WeightedAverageCostInput {
  currentQuantity: number;
  currentUnitCost: number;
  receivedQuantity: number;
  receivedUnitCost: number;
}

export function calculateWeightedAverageCost(input: WeightedAverageCostInput) {
  const totalQuantity = input.currentQuantity + input.receivedQuantity;
  if (totalQuantity <= 0) return 0;
  const totalCost =
    input.currentQuantity * input.currentUnitCost + input.receivedQuantity * input.receivedUnitCost;
  return Math.round((totalCost / totalQuantity) * 100) / 100;
}

export function convertQuantity(input: { quantity: number; conversionFactor: number }) {
  if (input.quantity < 0) throw new Error("Quantity cannot be negative");
  if (input.conversionFactor <= 0) throw new Error("Conversion factor must be greater than zero");
  return input.quantity * input.conversionFactor;
}
