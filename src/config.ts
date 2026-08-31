// Türkiye saati (UTC+3) -> UTC saat eşleşmesi
// TR 09:00 = UTC 06:00, TR 19:00 = UTC 16:00
export const HOUR_UTC_TO_CONTENT_TYPE: Record<number, string> = {
  6: "onthisday",       // TR 09:00
  7: "did_you_know",    // TR 10:00
  8: "apod",            // TR 11:00
  9: "did_you_know",    // TR 12:00
  10: "book_quote",     // TR 13:00
  11: "did_you_know",   // TR 14:00
  12: "wiki_image",     // TR 15:00
  13: "did_you_know",   // TR 16:00
  14: "art",            // TR 17:00
  15: "did_you_know",   // TR 18:00
  16: "philosophy_quote", // TR 19:00
};
