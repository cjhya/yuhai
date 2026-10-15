import type { DataRecord } from "../domain/highDimensionalExplorer";

export interface MachineRecord extends DataRecord {
  ID: string;
  资产编号: string;
  资产名称: string;
  规格型号: string | null;
  资产分类: string | null;
  吨位: number | null;
  总功率: number | null;
  螺杆直径: number | null;
  创建时间: number;
}

function isMachineRecord(value: unknown): value is MachineRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.ID === "string" &&
    typeof record.资产编号 === "string" &&
    typeof record.资产名称 === "string"
  );
}

export async function fetchMachines(signal?: AbortSignal): Promise<MachineRecord[]> {
  let response: Response;
  try {
    response = await fetch("/api/machines", {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("无法连接后端服务");
  }

  if (!response.ok) {
    throw new Error(`机器信息请求失败（HTTP ${response.status}）`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("机器信息响应格式不正确");
  }
  if (!Array.isArray(payload) || !payload.every(isMachineRecord)) {
    throw new Error("机器信息响应格式不正确");
  }
  return payload;
}
