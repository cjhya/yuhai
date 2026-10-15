// Minimal TypeScript port of ../../src/domain/data/highDimensionalExplorer.js.
// It keeps the field-catalog and search semantics independent of any UI framework.

export type DataRecord = Record<string, unknown>;

export interface FieldCatalogItem {
  id: string;
  category: string;
  rawKey: string;
  label: string;
  group: string;
  aliases: readonly string[];
  sourceKeys: readonly string[];
  searchText: string;
  available: boolean;
  order: number;
}

interface BuildFieldCatalogOptions {
  category: string;
  fieldMap?: Record<string, string>;
  records?: DataRecord[];
}

interface FilterFieldCatalogOptions {
  query?: string;
  group?: string;
  availableOnly?: boolean;
}

const GROUP_SEPARATOR = /\s*[-—–]\s*/;

function hasOwn(target: object, key: string) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.filter(Boolean).map(String))];
}

export function inferFieldGroup(label: string, fallback = "其他") {
  const normalizedLabel = String(label || "").trim();
  const [prefix] = normalizedLabel.split(GROUP_SEPARATOR);
  return prefix && prefix !== normalizedLabel ? prefix.trim() : fallback;
}

export function buildFieldCatalog({
  category,
  fieldMap = {},
  records = [],
}: BuildFieldCatalogOptions): FieldCatalogItem[] {
  const safeCategory = String(category || "未分类");
  const orderedKeys: string[] = [];
  const seenKeys = new Set<string>();
  const rawKeysByLabel = new Map<string, string[]>();

  Object.keys(fieldMap).forEach((rawKey) => {
    const label = String(fieldMap[rawKey] || rawKey);
    const keys = rawKeysByLabel.get(label) ?? [];
    keys.push(rawKey);
    rawKeysByLabel.set(label, keys);
  });

  const appendKey = (key: string) => {
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    orderedKeys.push(key);
  };

  Object.keys(fieldMap).forEach(appendKey);
  records.forEach((record) => {
    Object.keys(record).forEach((recordKey) => {
      const mappedKeys = rawKeysByLabel.get(recordKey);
      appendKey(mappedKeys?.length === 1 ? mappedKeys[0] : recordKey);
    });
  });

  return orderedKeys.map((rawKey, index) => {
    const label = String(fieldMap[rawKey] || rawKey);
    const sourceKeys = uniqueStrings([rawKey, label]);
    const available = records.some((record) =>
      sourceKeys.some((sourceKey) => hasOwn(record, sourceKey)),
    );
    const group = inferFieldGroup(label, safeCategory);
    const aliases = uniqueStrings([rawKey, label]);

    return {
      id: `${safeCategory}::${rawKey}`,
      category: safeCategory,
      rawKey,
      label,
      group,
      aliases,
      sourceKeys,
      searchText: normalizeText([group, ...aliases].join(" ")),
      available,
      order: index,
    };
  });
}

export function filterFieldCatalog(
  catalog: FieldCatalogItem[],
  options: FilterFieldCatalogOptions = {},
) {
  const query = normalizeText(options.query);
  const group = String(options.group || "").trim();

  return catalog.filter((field) => {
    if (options.availableOnly && !field.available) return false;
    if (group && field.group !== group) return false;
    return !query || field.searchText.includes(query);
  });
}

export function getRecordFieldCell(
  record: DataRecord,
  field: FieldCatalogItem,
) {
  const matchedKey = field.sourceKeys.find((sourceKey) =>
    hasOwn(record, sourceKey),
  );
  return {
    present: Boolean(matchedKey),
    value: matchedKey ? record[matchedKey] : undefined,
  };
}

