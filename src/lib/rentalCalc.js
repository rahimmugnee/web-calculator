const ceilNonNeg = (value) => Math.max(0, Math.ceil(Number(value) || 0));

export const RENTAL_VAT_RATE = 0.15;

export function calculateRentalQuotation(snapshot = {}) {
  const duration = Math.max(1, ceilNonNeg(snapshot.duration || 1));
  const vatEnabled = Boolean(snapshot.vatEnabled);

  const rows = (snapshot.items || [])
    .filter((item) => item.enabled !== false)
	    .map((item, index) => {
	      const qty = Math.max(1, Number(item.qty) || 1);
	      const included = Boolean(item.included);
	      const itemDuration = item.duration === "fixed-1" ? 1 : duration;
	      const rate = included ? 0 : ceilNonNeg(item.rate);
	      const amount = included ? 0 : ceilNonNeg(qty * rate * itemDuration);

      return {
        ...item,
        sl: index + 1,
	        qty,
	        rate,
	        duration: itemDuration,
	        amount,
	        included,
	      };
	    });

  const subTotal = rows.reduce((sum, item) => sum + item.amount, 0);
  const vatAmount = vatEnabled ? ceilNonNeg(subTotal * RENTAL_VAT_RATE) : 0;
  const grandTotal = ceilNonNeg(subTotal + vatAmount);

  return {
    rows,
    totals: {
      subTotal,
      totalBeforeVat: subTotal,
      vatEnabled,
      vatRate: RENTAL_VAT_RATE,
      vatAmount,
      grandTotal,
      payable: grandTotal,
    },
    unitPrices: {},
  };
}
