import crypto from "crypto";

export interface SignedInvoicePayload {
  saleId: string;
  shopId: string;
  exp: number; // Unix timestamp in seconds
}

function getSecret(): string {
  return (
    process.env.INVOICE_SHARE_SECRET ||
    process.env.AUTH_SECRET ||
    "baki_secure_invoice_signing_secret_do_not_leak"
  );
}

/**
 * Generate a cryptographically signed, expiring token for public invoice sharing.
 * @param saleId The ID of the sale
 * @param shopId The shop ID
 * @param expiresInHours Token validity period (default 7 days / 168 hours)
 */
export function generateInvoiceShareToken(
  saleId: string,
  shopId: string,
  expiresInHours: number = 168
): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;

  const payload: SignedInvoicePayload = { saleId, shopId, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify a signed invoice share token and check its expiry.
 */
export function verifyInvoiceShareToken(token: string): {
  valid: boolean;
  payload?: SignedInvoicePayload;
  error?: string;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "অবৈধ লিঙ্ক ফরম্যাট (Invalid token format)" };
    }

    const [payloadBase64, signature] = parts;
    const secret = getSecret();

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url");

    // Timing-safe signature check
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: "অবৈধ বা পরিবর্তিত লিঙ্ক / স্বাক্ষর মেলেনি (Invalid signature)" };
    }

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload: SignedInvoicePayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: "লিংকের মেয়াদ শেষ হয়ে গেছে (Link expired)" };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `যাচাইকরণ ব্যর্থ হয়েছে: ${message}` };
  }
}

/**
 * Generate full public share URL for an invoice
 */
export function getInvoiceShareUrl(
  saleId: string,
  shopId: string,
  origin: string = "http://localhost:3000",
  expiresInHours: number = 168
): string {
  const token = generateInvoiceShareToken(saleId, shopId, expiresInHours);
  return `${origin}/invoice/share/${token}`;
}

/**
 * Format a WhatsApp direct message URL with encoded message
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  let cleanPhone = phone.replace(/[\s\-\+]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "88" + cleanPhone;
  }
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
}
