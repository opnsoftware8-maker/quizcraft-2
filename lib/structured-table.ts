export interface StructuredTableData {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  summary?: string;
}

const EMOJI_STRIP_REGEX =
  /(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)|[\u{1F1E6}-\u{1F1FF}]|[\u2600-\u27BF]\uFE0F?|\d\uFE0F?\u20E3|\uFE0F/gu;

function cleanCellString(value: unknown): string {
  if (value === null || value === undefined) return "-";
  let str: string;
  if (typeof value === "string") {
    str = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    str = String(value);
  } else if (Array.isArray(value)) {
    str = value.map((v) => cleanCellString(v)).join(", ");
  } else if (typeof value === "object") {
    try {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return "-";
      str = entries.map(([k, v]) => `${k}: ${cleanCellString(v)}`).join(", ");
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  const stripped = str
    .replace(EMOJI_STRIP_REGEX, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped || "-";
}

function cleanHeaderString(value: unknown, fallback: string): string {
  const cleaned = cleanCellString(value);
  return cleaned === "-" ? fallback : cleaned;
}

export function normalizeTableToolArgs(
  rawArgs: unknown,
  idSeed: string
): StructuredTableData | null {
  if (!rawArgs || typeof rawArgs !== "object") return null;
  const args = rawArgs as Record<string, unknown>;

  const rawTitle =
    typeof args.title === "string"
      ? args.title
          .replace(EMOJI_STRIP_REGEX, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  const title = rawTitle || "ตารางเปรียบเทียบข้อมูล";

  const rawSummary =
    typeof args.summary === "string"
      ? args.summary
          .replace(EMOJI_STRIP_REGEX, "")
          .replace(/\s+/g, " ")
          .trim()
      : "";

  let columns: string[] = [];
  let rows: string[][] = [];

  // Format A: explicit columns + rows (where row is string[] or { values: string[] } or { cells: [{ column, value }] })
  if (Array.isArray(args.columns)) {
    columns = args.columns
      .map((col, idx) => cleanHeaderString(col, `คอลัมน์ ${idx + 1}`))
      .slice(0, 30);
  }

  if (Array.isArray(args.rows)) {
    const parsedRows: string[][] = [];
    for (const rawRow of args.rows.slice(0, 200)) {
      if (Array.isArray(rawRow)) {
        parsedRows.push(rawRow.map((cell) => cleanCellString(cell)));
      } else if (rawRow && typeof rawRow === "object") {
        const rowObj = rawRow as Record<string, unknown>;
        if (Array.isArray(rowObj.values)) {
          parsedRows.push(rowObj.values.map((cell) => cleanCellString(cell)));
        } else if (Array.isArray(rowObj.cells)) {
          const cellMap = new Map<string, string>();
          for (const cellItem of rowObj.cells) {
            if (cellItem && typeof cellItem === "object") {
              const c = cellItem as Record<string, unknown>;
              const colName = cleanHeaderString(c.column ?? c.key, "");
              if (colName) {
                if (!columns.includes(colName)) {
                  columns.push(colName);
                }
                cellMap.set(colName, cleanCellString(c.value));
              }
            }
          }
          parsedRows.push(columns.map((col) => cellMap.get(col) ?? "-"));
        } else {
          // Plain key-value object row
          const keys = Object.keys(rowObj);
          for (const k of keys) {
            const h = cleanHeaderString(k, "");
            if (h && !columns.includes(h)) columns.push(h);
          }
          parsedRows.push(
            columns.map((col) => {
              const direct = rowObj[col];
              return direct !== undefined ? cleanCellString(direct) : "-";
            })
          );
        }
      }
    }
    rows = parsedRows;
  }

  // Format B: records/items array of objects or { cells: [{ column, value }] }
  if (rows.length === 0 && (Array.isArray(args.records) || Array.isArray(args.items))) {
    const rawList = (Array.isArray(args.records) ? args.records : args.items) as unknown[];
    const extractedObjects: Array<Record<string, string>> = [];

    for (const entry of rawList.slice(0, 200)) {
      if (!entry || typeof entry !== "object") continue;
      const obj = entry as Record<string, unknown>;

      if (Array.isArray(obj.cells)) {
        const rowRecord: Record<string, string> = {};
        for (const cellItem of obj.cells) {
          if (cellItem && typeof cellItem === "object") {
            const c = cellItem as Record<string, unknown>;
            const colName = cleanHeaderString(c.column ?? c.key, "");
            if (colName) {
              if (!columns.includes(colName)) columns.push(colName);
              rowRecord[colName] = cleanCellString(c.value);
            }
          }
        }
        if (Object.keys(rowRecord).length > 0) {
          extractedObjects.push(rowRecord);
        }
      } else {
        const rowRecord: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj)) {
          const colName = cleanHeaderString(k, "");
          if (colName) {
            if (!columns.includes(colName)) columns.push(colName);
            rowRecord[colName] = cleanCellString(v);
          }
        }
        if (Object.keys(rowRecord).length > 0) {
          extractedObjects.push(rowRecord);
        }
      }
    }

    if (extractedObjects.length > 0) {
      rows = extractedObjects.map((rec) =>
        columns.map((col) => rec[col] ?? "-")
      );
    }
  }

  // Infer columns if rows exist but columns are still empty
  if (columns.length === 0 && rows.length > 0) {
    const maxLen = Math.max(...rows.map((r) => r.length));
    columns = Array.from({ length: maxLen }, (_, idx) => `คอลัมน์ ${idx + 1}`);
  }

  if (columns.length === 0 || rows.length === 0) {
    return null;
  }

  const colCount = columns.length;
  const normalizedRows = rows.map((row) => {
    const fixed = row.slice(0, colCount);
    while (fixed.length < colCount) {
      fixed.push("-");
    }
    return fixed;
  });

  return {
    id: `tbl-${idSeed}`,
    title,
    columns,
    rows: normalizedRows,
    ...(rawSummary ? { summary: rawSummary } : {}),
  };
}

export function sanitizeStructuredTables(raw: unknown): StructuredTableData[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid: StructuredTableData[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title === "string" &&
      Array.isArray(item.columns) &&
      Array.isArray(item.rows) &&
      item.columns.length > 0 &&
      item.rows.length > 0
    ) {
      valid.push({
        id: item.id,
        title: item.title,
        columns: item.columns.map((c: unknown, idx: number) =>
          cleanHeaderString(c, `คอลัมน์ ${idx + 1}`)
        ),
        rows: item.rows
          .filter((r: unknown) => Array.isArray(r))
          .map((r: unknown[]) => {
            const cells = r.map((cell) => cleanCellString(cell));
            while (cells.length < item.columns.length) cells.push("-");
            return cells.slice(0, item.columns.length);
          }),
        ...(typeof item.summary === "string" && item.summary.trim()
          ? { summary: item.summary.trim() }
          : {}),
      });
    }
  }
  return valid.length > 0 ? valid : undefined;
}

const NUMERIC_CELL_REGEX = /^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?\s*(%|บาท|THB|USD|\$|kg|g|m|cm|km|s|ms|Hz|V|A|W|J|mol|K|°C)?$/i;

export function isNumericColumn(rows: string[][], colIdx: number): boolean {
  let seenValue = false;
  for (const row of rows) {
    const val = (row[colIdx] || "").trim();
    if (!val || val === "-" || val === "N/A") continue;
    seenValue = true;
    if (!NUMERIC_CELL_REGEX.test(val)) {
      return false;
    }
  }
  return seenValue;
}

export function tableToTsv(
  table: StructuredTableData,
  rowsOverride?: string[][]
): string {
  const rows = rowsOverride ?? table.rows;
  const sanitizeCell = (cell: string) =>
    cell.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
  const headerLine = table.columns.map(sanitizeCell).join("\t");
  const bodyLines = rows.map((row) => row.map(sanitizeCell).join("\t"));
  return [headerLine, ...bodyLines].join("\n");
}
