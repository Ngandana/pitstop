/**
 * §5: "Driver notification is manual by design in v1." No messaging API —
 * every reminder that concerns a driver gets a "Send to driver" button
 * that opens wa.me with a pre-written message, sent by tapping through
 * the owner's own WhatsApp.
 */
export function buildWhatsAppLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/^\+/, "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
