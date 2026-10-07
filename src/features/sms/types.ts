export interface SendResult {
  success: boolean;
  messageId?: string;
  costPoisha?: number;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  sendSms(to: string, message: string): Promise<SendResult>;
}

export interface SmsVariables {
  customer_name?: string;
  shop_name?: string;
  shop_phone?: string;
  due_amount?: string;
  paid_amount?: string;
  total_amount?: string;
  invoice_no?: string;
  invoice_link?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface SendDueReminderInput {
  customerId: string;
  customMessage?: string;
  templateId?: string;
}

export interface SendBulkDueReminderInput {
  minDueAmountPoisha: number; // e.g. 50000 = ৳500
  templateId?: string;
  customMessage?: string;
}

export interface SendSaleReceiptInput {
  saleId: string;
  customMessage?: string;
}
