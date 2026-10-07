import { createHttpClient, toPositiveNumber } from "./http";
import { createDemoAdapter } from "@/demo/demoBackend";
import { isDemoMode } from "@/demo/demoMode";

const server = createHttpClient({
  service: "algorithm",
  baseURL:
    process.env.VUE_APP_ALGORITHM_API_BASE_URL || "http://10.16.76.111:5000",
  timeout: toPositiveNumber(process.env.VUE_APP_ALGORITHM_API_TIMEOUT, 120000),
  sendRequestId: process.env.VUE_APP_SEND_REQUEST_ID === "true",
  adapter: isDemoMode ? createDemoAdapter("algorithm") : undefined,
});

export default server
