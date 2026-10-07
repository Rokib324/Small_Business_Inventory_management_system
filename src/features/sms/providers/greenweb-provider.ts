import { SmsProvider, SendResult } from "../types";

export class GreenwebSmsProvider implements SmsProvider {
  public readonly name = "greenweb";
  private token: string;
  private apiUrl: string;

  constructor(token?: string, apiUrl?: string) {
    this.token = token || process.env.GREENWEB_API_TOKEN || process.env.SMS_API_KEY || "";
    this.apiUrl = apiUrl || process.env.GREENWEB_API_URL || "https://api.greenweb.com.bd/api.php?json";
  }

  async sendSms(to: string, message: string): Promise<SendResult> {
    if (!this.token) {
      return {
        success: false,
        error: "Greenweb API token is not configured (check GREENWEB_API_TOKEN or SMS_API_KEY).",
      };
    }

    // Normalize phone number to standard Bangladesh format: e.g. "01712345678" or "8801712345678"
    let cleanPhone = to.replace(/[\s\-\+]/g, "");
    if (cleanPhone.startsWith("880")) {
      // standard 880 format is fine
    } else if (cleanPhone.startsWith("0")) {
      cleanPhone = "88" + cleanPhone;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("token", this.token);
      formData.append("to", cleanPhone);
      formData.append("message", message);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Greenweb gateway HTTP error: ${response.status} ${response.statusText}`,
        };
      }

      const text = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        // Plain text response fallback
        if (text.includes("Ok:") || text.includes("SMS SUBMITTED")) {
          return {
            success: true,
            messageId: text.trim(),
            costPoisha: 40,
          };
        }
        return {
          success: false,
          error: `Greenweb gateway rejected: ${text.slice(0, 150)}`,
        };
      }

      // If json response array: e.g. [{"status": "SMS SUBMITTED", "status_code": 200, "smsid": "123456"}]
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        if (item.status_code === 200 || (item.status && item.status.includes("SUBMITTED"))) {
          return {
            success: true,
            messageId: item.smsid || String(item.status_code),
            costPoisha: 40,
          };
        }
        return {
          success: false,
          error: item.status || "Unknown gateway error",
        };
      }

      return {
        success: true,
        messageId: "gw_" + Date.now(),
        costPoisha: 40,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Greenweb request failed: ${errorMsg}`,
      };
    }
  }
}
