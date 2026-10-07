import { SmsProvider } from "../types";
import { MockSmsProvider } from "./mock-provider";
import { GreenwebSmsProvider } from "./greenweb-provider";

const defaultMockProvider = new MockSmsProvider();

export function getSmsProvider(): SmsProvider {
  const providerType = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  switch (providerType) {
    case "greenweb":
      return new GreenwebSmsProvider();
    case "mock":
    default:
      return defaultMockProvider;
  }
}

export function getMockProviderInstance(): MockSmsProvider {
  return defaultMockProvider;
}
