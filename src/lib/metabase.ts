const MB_URL = process.env.METABASE_URL!;
const MB_KEY = process.env.METABASE_API_KEY!;

// CPJ AMARAL (MySQL, db=7) — fonte dos processos Sisprime.
// (Carteira via Pipedrive entra numa 2ª fase — ver memory/metabase-data-sources.)
export const DB_CPJ = Number(process.env.METABASE_DATABASE_ID_CPJ ?? 7);

type MetabaseDatasetResponse = {
  data?: {
    rows: unknown[][];
    cols: { name: string }[];
  };
  error?: string;
};

export async function runSql<T = Record<string, unknown>>(
  sql: string,
  databaseId: number = DB_CPJ
): Promise<T[]> {
  const res = await fetch(`${MB_URL}/api/dataset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MB_KEY,
    },
    body: JSON.stringify({
      database: databaseId,
      type: "native",
      native: { query: sql },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Metabase API ${res.status}: ${await res.text()}`);
  }

  const json: MetabaseDatasetResponse = await res.json();
  if (json.error) throw new Error(`Metabase query error: ${json.error}`);

  const { rows = [], cols = [] } = json.data ?? {};
  return rows.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj as T;
  });
}
