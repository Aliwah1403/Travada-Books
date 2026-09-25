export type QuoteSettings = {
  quoteTemplate: string;
  defaultNote: string;
  cc: string;
  bcc: string;
  includePdf: boolean;
  validityDays: number | null;
  quoteNumberPrefix: string;
  quoteNumberDigits: 3 | 4 | 5;
  customFieldLabels: string[];
};

export const defaultQuoteSettings: QuoteSettings = {
  quoteTemplate: "classic",
  defaultNote: "",
  cc: "",
  bcc: "",
  includePdf: true,
  validityDays: null,
  quoteNumberPrefix: "QUO-",
  quoteNumberDigits: 4,
  customFieldLabels: [],
};
