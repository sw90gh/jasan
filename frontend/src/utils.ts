export function formatKRW(amount: number): string {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  real_estate: '부동산',
  deposit: '예적금',
  stock: '주식',
  fund: '펀드/ETF',
  crypto: '암호화폐',
  insurance: '보험',
  pension: '연금',
  cash: '현금',
  other: '기타',
};

export const DEBT_CATEGORY_LABELS: Record<string, string> = {
  mortgage: '주택담보대출',
  credit: '신용대출',
  student: '학자금대출',
  car: '자동차대출',
  other: '기타',
};

export const PENSION_TYPE_LABELS: Record<string, string> = {
  national: '국민연금',
  retirement: '퇴직연금',
  personal: '개인연금',
};

export const CATEGORY_COLORS: Record<string, string> = {
  real_estate: '#3b82f6',
  deposit: '#10b981',
  stock: '#f59e0b',
  fund: '#8b5cf6',
  crypto: '#ef4444',
  insurance: '#06b6d4',
  pension: '#ec4899',
  cash: '#6b7280',
  other: '#a3a3a3',
};
