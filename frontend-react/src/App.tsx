import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  ConfigProvider,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { fetchMachines } from "./api/machines";
import type { MachineRecord } from "./api/machines";
import {
  buildFieldCatalog,
  filterFieldCatalog,
  getRecordFieldCell,
} from "./domain/highDimensionalExplorer";
import type { FieldCatalogItem } from "./domain/highDimensionalExplorer";
import "./styles.css";

const CATEGORY = "机器信息";

interface FieldRow extends FieldCatalogItem {
  displayValue: string;
}

type LoadStatus = "loading" | "success" | "error";

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "空";
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

const columns: TableColumnsType<FieldRow> = [
  {
    title: "字段",
    dataIndex: "label",
    key: "label",
    width: "42%",
    render: (label: string) => <span className="field-name">{label}</span>,
  },
  {
    title: "当前值",
    dataIndex: "displayValue",
    key: "displayValue",
    render: (value: string) => <span className="field-value">{value}</span>,
  },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchMachines(controller.signal)
      .then((records) => {
        setMachines(records);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setErrorMessage(error instanceof Error ? error.message : "机器信息请求失败");
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const currentRecord = machines[0];
  const fieldCatalog = useMemo(
    () => buildFieldCatalog({ category: CATEGORY, records: machines }),
    [machines],
  );

  const rows = useMemo<FieldRow[]>(() => {
    if (!currentRecord) return [];
    return filterFieldCatalog(fieldCatalog, {
      query,
      availableOnly: true,
    }).map((field) => ({
      ...field,
      displayValue: formatValue(getRecordFieldCell(currentRecord, field).value),
    }));
  }, [currentRecord, fieldCatalog, query]);

  const sourceAlert =
    status === "error" ? (
      <Alert
        className="source-alert"
        type="error"
        showIcon
        title="机器信息加载失败"
        description={`${errorMessage}；未使用演示数据回退。`}
      />
    ) : (
      <Alert
        className="source-alert"
        type="info"
        showIcon
        title={
          status === "loading"
            ? "正在从后端读取机器信息"
            : "数据来源：MySQL（GET /api/machines）"
        }
      />
    );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#176b5b",
          borderRadius: 10,
          colorBgLayout: "#f3f6f5",
        },
      }}
    >
      <main className="app-shell">
        <section className="page-heading">
          <Space size={12} wrap>
            <Typography.Title level={2}>生产数据管理</Typography.Title>
            <Tag color={status === "error" ? "error" : status === "loading" ? "processing" : "green"}>
              {status === "error" ? "请求失败" : status === "loading" ? "加载中" : "MySQL 数据"}
            </Tag>
          </Space>
          <Typography.Paragraph>
            查看注塑机基础档案，并按字段名称快速定位生产信息。
          </Typography.Paragraph>
        </section>

        {sourceAlert}

        <Card
          className="data-card"
          loading={status === "loading"}
          title={
            <Space wrap>
              <span>{CATEGORY}</span>
              {currentRecord && <Tag>{currentRecord.资产编号}</Tag>}
            </Space>
          }
          extra={
            status === "success" && (
              <span className="record-count">共 {machines.length} 条记录</span>
            )
          }
        >
          {status === "success" && machines.length === 0 ? (
            <Empty description="数据库中暂无机器信息" />
          ) : status === "success" && currentRecord ? (
            <>
              <div className="toolbar">
                <Input.Search
                  allowClear
                  aria-label="搜索生产数据字段"
                  placeholder="搜索字段，例如：资产、吨位、功率"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <span className="match-count">
                  已匹配 {rows.length} / {fieldCatalog.length} 个字段
                </span>
              </div>

              <Table<FieldRow>
                rowKey="id"
                columns={columns}
                dataSource={rows}
                locale={{ emptyText: "没有匹配的字段" }}
                pagination={{ pageSize: 8, showSizeChanger: false }}
                scroll={{ x: 520 }}
              />
            </>
          ) : status === "error" ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="无法显示机器信息，请确认后端服务和数据库连接。"
            />
          ) : null}
        </Card>
      </main>
    </ConfigProvider>
  );
}
