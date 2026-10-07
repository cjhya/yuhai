export function isDemoModeEnabled(env = process.env) {
  return String(env && env.VUE_APP_DEMO_MODE || "true").toLowerCase() !== "false";
}

export const isDemoMode = isDemoModeEnabled();

