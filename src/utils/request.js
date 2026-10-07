import { createHttpClient, toPositiveNumber } from "./http";
import { createDemoAdapter } from "@/demo/demoBackend";
import { isDemoMode } from "@/demo/demoMode";

const server = createHttpClient({
  service: "business",
  baseURL:
    process.env.VUE_APP_BUSINESS_API_BASE_URL || "http://10.16.24.23:8083",
  timeout: toPositiveNumber(process.env.VUE_APP_BUSINESS_API_TIMEOUT, 5000),
  sendRequestId: process.env.VUE_APP_SEND_REQUEST_ID === "true",
  adapter: isDemoMode ? createDemoAdapter("business") : undefined,
});

export default server
