/**
 * Helpers de leitura sem limite de linhas.
 *
 * O PostgREST limita cada resposta a 1000 linhas. Estas funções repetem a
 * consulta em blocos (`range`) até trazer todas as linhas, e dividem listas
 * grandes de ids em pedaços para não estourar o tamanho da URL.
 */
export const PAGE_SIZE = 1000;
export const IN_CHUNK = 300;

type QueryBuilder = {
  range: (from: number, to: number) => Promise<{ data: any; error: any }>;
};

/** Executa a consulta em blocos de 1000 linhas até trazer tudo. */
export async function fetchAllRows<T = any>(build: () => QueryBuilder): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await build().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data || []) as T[];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}

/** Igual a fetchAllRows, mas dividindo a lista de valores do `.in()` em blocos. */
export async function fetchAllByIds<T = any>(
  values: (string | null | undefined)[],
  build: (chunk: string[]) => QueryBuilder,
): Promise<T[]> {
  const ids = [...new Set(values.filter((v): v is string => !!v))];
  if (ids.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    out.push(...(await fetchAllRows<T>(() => build(chunk))));
  }
  return out;
}

/** Divide um array em blocos de tamanho fixo (para gravações em lote). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
