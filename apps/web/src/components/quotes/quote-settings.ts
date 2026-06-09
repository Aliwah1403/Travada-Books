export type QuoteSettings = {
  quoteTemplate: string;
  defaultNote: string;
  cc: string;
  bcc: string;
  validityDays: number | null;
  quoteNumberPrefix: string;
  quoteNumberDigits: 3 | 4 | 5;
};

export const defaultQuoteSettings: QuoteSettings = {
  quoteTemplate: "classic",
  defaultNote: "",
  cc: "",
  bcc: "",
  validityDays: null,
  quoteNumberPrefix: "QUO-",
  quoteNumberDigits: 4,
};
