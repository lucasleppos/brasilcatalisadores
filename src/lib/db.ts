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
  order?: (column: string, opts?: any) => any;
};

/**
 * Executa a consulta em blocos de 1000 linhas até trazer tudo.
 *
 * A paginação por `range` só é estável com uma ordenação fixa: sem ela o banco
 * pode devolver a mesma linha em dois blocos (itens duplicados) e omitir outras.
 * Por isso aplicamos `order("id")` quando possível e ainda descartamos
 * repetições por `id` ao juntar os blocos.
 */
export async function fetchAllRows<T = any>(build: () => QueryBuilder): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let q: any = build();
    if (typeof q.order === "function") {
      try {
        q = q.order("id", { ascending: true });
      } catch {
        /* tabela sem coluna id: mantém a consulta original */
      }
    }
    const { data, error } = await q.range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data || []) as T[];
    for (const row of batch) {
      const id = (row as any)?.id;
      if (typeof id === "string") {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      out.push(row);
    }
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
