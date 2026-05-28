import Papa, { ParseError } from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export interface ParsedCsvRows {
  rows: string[][];
  errors: string[];
}

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

export const sanitizeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (FORMULA_TRIGGERS.test(str)) {
    return `'${str}`;
  }
  return str;
};

const stripBom = (text: string): string =>
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

// Read a File as text using the best-guess encoding so non-UTF-8 CSVs (e.g.
// Excel's default Save-As-CSV on Windows, which writes Windows-1252) no longer
// produce U+FFFD replacement characters in names like "Ma. Theresa P. Flores"
// when the original byte was 0xA0 / 0x91 / etc.
//
// Detection order:
//   1. UTF-16 LE / BE BOM
//   2. UTF-8 strict decode (succeeds for ASCII and well-formed UTF-8, including
//      files with a UTF-8 BOM)
//   3. Windows-1252 fallback (Excel default on Windows)
export const readCsvFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const buf = reader.result;
      if (!(buf instanceof ArrayBuffer)) {
        reject(new Error("Expected ArrayBuffer from FileReader"));
        return;
      }
      const bytes = new Uint8Array(buf);

      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        resolve(new TextDecoder("utf-16le").decode(bytes.subarray(2)));
        return;
      }
      if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        resolve(new TextDecoder("utf-16be").decode(bytes.subarray(2)));
        return;
      }

      try {
        // `fatal: true` makes the decoder throw on any invalid UTF-8 sequence,
        // so we can distinguish well-formed UTF-8 from Windows-1252.
        resolve(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch {
        resolve(new TextDecoder("windows-1252").decode(bytes));
      }
    };
    reader.readAsArrayBuffer(file);
  });

const collectErrors = (rawErrors: ParseError[] | undefined): string[] =>
  (rawErrors ?? [])
    .filter((e) => e.code !== "TooFewFields" && e.code !== "TooManyFields")
    .map((e) => {
      const rowInfo = typeof e.row === "number" ? ` (row ${e.row + 2})` : "";
      return `CSV parse error${rowInfo}: ${e.message}`;
    });

// header-mode parse: returns an array of row objects keyed by header name.
export const parseCsv = (text: string): ParsedCsv => {
  const cleaned = stripBom(text ?? "");

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  const headers = (result.meta?.fields ?? []).map((h) => h.trim());
  const rows = (result.data ?? []).filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== ""),
  );

  return { headers, rows, errors: collectErrors(result.errors) };
};

// row-array mode: returns each line as an array of cell strings. Use this when
// the column count is dynamic and you want positional access (e.g. attendance
// imports where columns 4+ are date headers).
export const parseCsvRows = (text: string): ParsedCsvRows => {
  const cleaned = stripBom(text ?? "");

  const result = Papa.parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: "greedy",
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });

  const rows = (result.data ?? []).filter((row) =>
    row.some((v) => v !== undefined && v !== null && String(v).trim() !== ""),
  );

  return { rows, errors: collectErrors(result.errors) };
};

export const sanitizeRow = (row: Record<string, string>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = sanitizeCell(v);
  }
  return out;
};
