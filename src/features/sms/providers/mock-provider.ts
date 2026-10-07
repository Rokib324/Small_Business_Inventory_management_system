import { SmsProvider, SendResult } from "../types";

export interface MockSmsRecord {
  to: string;
  message: string;
  timestamp: Date;
  messageId: string;
}

export class MockSmsProvider implements SmsProvider {
  public readonly name = "mock";
  private sentMessages: MockSmsRecord[] = [];

  async sendSms(to: string, message: string): Promise<SendResult> {
    // Normalization / sanity check
    const cleanPhone = to.replace(/[\s\-]/g, "");

    // Allow simulating failure with specific test number
    if (cleanPhone === "01700000000" || cleanPhone === "+8801700000000") {
      return {
        success: false,
        error: "Mock provider simulated gateway error: Invalid recipient or out of balance",
      };
    }

    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: MockSmsRecord = {
      to: cleanPhone,
      message,
      timestamp: new Date(),
      messageId,
    };

    this.sentMessages.push(record);

    console.log(`[MockSmsProvider] 📱 Sent SMS to ${cleanPhone}: "${message}" (ID: ${messageId})`);

    return {
      success: true,
      messageId,
      costPoisha: 35, // ৳0.35 per SMS in poisha
    };
  }

  getSentMessages(): MockSmsRecord[] {
    return [...this.sentMessages];
  }

  clearHistory(): void {
    this.sentMessages = [];
  }
}
