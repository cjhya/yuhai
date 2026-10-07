const GROUP_SEPARATOR = /\s*[-—–]\s*/;

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target || {}, key);
}

function normalizeText(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .toLocaleLowerCase();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map(value => String(value)))];
}

export function inferFieldGroup(label, fallback = "其他") {
  const normalizedLabel = String(label || "").trim();
  const [prefix] = normalizedLabel.split(GROUP_SEPARATOR);
  if (prefix && prefix !== normalizedLabel) return prefix.trim();
  return String(fallback || "其他");
}

export function buildFieldCatalog({ category, fieldMap = {}, records = [] }) {
  const safeCategory = String(category || "未分类");
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  const orderedKeys = [];
  const seenKeys = new Set();
  const rawKeysByLabel = new Map();

  Object.keys(fieldMap || {}).forEach(rawKey => {
    const label = String(fieldMap[rawKey] || rawKey);
    if (!rawKeysByLabel.has(label)) rawKeysByLabel.set(label, []);
    rawKeysByLabel.get(label).push(rawKey);
  });

  const appendKey = key => {
    const normalizedKey = String(key);
    if (seenKeys.has(normalizedKey)) return;
    seenKeys.add(normalizedKey);
    orderedKeys.push(normalizedKey);
  };

  Object.keys(fieldMap || {}).forEach(appendKey);
  safeRecords.forEach(record => {
    Object.keys(record || {}).forEach(recordKey => {
      const mappedKeys = rawKeysByLabel.get(recordKey);
      appendKey(mappedKeys && mappedKeys.length === 1 ? mappedKeys[0] : recordKey);
    });
  });

  return orderedKeys.map((rawKey, index) => {
    const mappedLabel = hasOwn(fieldMap, rawKey) ? fieldMap[rawKey] : rawKey;
    const label = String(mappedLabel || rawKey);
    const sourceKeys = uniqueStrings([rawKey, label]);
    const available = safeRecords.some(record =>
      sourceKeys.some(sourceKey => hasOwn(record, sourceKey))
    );
    const group = inferFieldGroup(label, safeCategory);
    const aliases = uniqueStrings([rawKey, label]);

    return Object.freeze({
      id: `${safeCategory}::${rawKey}`,
      category: safeCategory,
      rawKey,
      label,
      group,
      aliases: Object.freeze(aliases),
      sourceKeys: Object.freeze(sourceKeys),
      searchText: normalizeText([group, ...aliases].join(" ")),
      available,
      order: index,
    });
  });
}

export function getRecordFieldCell(record, field) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const sourceKeys = field && Array.isArray(field.sourceKeys)
    ? field.sourceKeys
    : [field && field.rawKey];
  const matchedKey = sourceKeys.find(sourceKey => sourceKey && hasOwn(safeRecord, sourceKey));
  return {
    present: Boolean(matchedKey),
    value: matchedKey ? safeRecord[matchedKey] : undefined,
    sourceKey: matchedKey || null,
  };
}

export function filterFieldCatalog(catalog, options = {}) {
  const query = normalizeText(options.query);
  const group = String(options.group || "").trim();
  const availableOnly = options.availableOnly === true;

  return (Array.isArray(catalog) ? catalog : []).filter(field => {
    if (availableOnly && !field.available) return false;
    if (group && field.group !== group) return false;
    if (query && !field.searchText.includes(query)) return false;
    return true;
  });
}

export function groupFieldCatalog(catalog, options = {}) {
  const groups = [];
  const groupIndex = new Map();
  filterFieldCatalog(catalog, options).forEach(field => {
    let target = groupIndex.get(field.group);
    if (!target) {
      target = { label: field.group, fields: [] };
      groupIndex.set(field.group, target);
      groups.push(target);
    }
    target.fields.push(field);
  });
  return groups;
}

function resolveFields(catalog, fieldIds) {
  const fields = Array.isArray(catalog) ? catalog : [];
  if (!Array.isArray(fieldIds) || fieldIds.length === 0) return fields;
  const selectedIds = new Set(fieldIds);
  return fields.filter(field => selectedIds.has(field.id));
}

export function projectRecord(record, catalog, fieldIds = null) {
  return resolveFields(catalog, fieldIds).map(field => ({
    ...field,
    ...getRecordFieldCell(record, field),
  }));
}

function valuesEqual(left, right) {
  return left.present === right.present && Object.is(left.value, right.value);
}

export function compareRecords(records, catalog, fieldIds, options = {}) {
  const safeRecords = Array.isArray(records) ? records : [];
  const changedOnly = options.changedOnly === true;

  return resolveFields(catalog, fieldIds)
    .map(field => {
      const values = safeRecords.map(record => getRecordFieldCell(record, field));
      const firstValue = values[0] || { present: false, value: undefined };
      const changed = values.slice(1).some(value => !valuesEqual(firstValue, value));
      return { ...field, values, changed };
    })
    .filter(row => !changedOnly || row.changed);
}

export function pickFieldIdsByGroup(catalog, limit = 8) {
  const maxCount = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 8;
  const availableFields = (Array.isArray(catalog) ? catalog : []).filter(
    field => field.available
  );
  const selected = [];
  const selectedIds = new Set();
  const seenGroups = new Set();

  availableFields.forEach(field => {
    if (selected.length >= maxCount || seenGroups.has(field.group)) return;
    seenGroups.add(field.group);
    selectedIds.add(field.id);
    selected.push(field.id);
  });

  availableFields.forEach(field => {
    if (selected.length >= maxCount || selectedIds.has(field.id)) return;
    selectedIds.add(field.id);
    selected.push(field.id);
  });

  return selected;
}
