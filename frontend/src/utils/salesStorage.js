export const SALES_STORAGE_KEY = 'lionbingo-sales';

export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial', 'Unpaid'];

export function createSaleRecord(input) {
  const numberOfCards = Number(input.numberOfCards) || 0;
  const pricePerCard = Number(input.pricePerCard) || 0;
  const totalAmount = Number(input.totalAmount) || numberOfCards * pricePerCard;
  const now = new Date().toISOString();

  return {
    id: input.id || crypto.randomUUID(),
    playerName: input.playerName.trim(),
    phone: input.phone.trim(),
    cardNumber: input.cardNumber.trim(),
    numberOfCards,
    pricePerCard,
    totalAmount,
    paymentStatus: input.paymentStatus || 'Paid',
    notes: input.notes?.trim() || '',
    startedTime: input.startedTime || now,
    endedTime: input.endedTime || now,
    shopName: input.shopName || input.playerName.trim(),
    onCall: input.onCall || input.cardNumber.trim(),
    collected: totalAmount,
    commission: Number((totalAmount * 0.1).toFixed(2)),
    by: input.by || 'Abraham',
  };
}

export function loadSalesRecords() {
  try {
    const raw = localStorage.getItem(SALES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSalesRecords(records) {
  localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(records));
}
