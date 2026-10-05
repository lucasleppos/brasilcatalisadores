/**
 * Cache curto e compartilhado da lista de compras (por recorte de período).
 *
 * O cache é invalidado automaticamente a cada gravação no banco (qualquer
 * requisição que não seja de leitura), então nunca exibe dado velho depois de
 * salvar, avançar etapa ou excluir.
 */
const TTL_MS = 60_000;

const cached = new Map<string, { at: number; data: any[] }>();
const inflight = new Map<string, Promise<any[]>>();

export function invalidatePurchasesCache() {
  cached.clear();
}

/** Executa o loader reaproveitando o resultado recente e unindo chamadas simultâneas. */
export async function cachedLoad<T>(loader: () => Promise<T[]>, key = "default"): Promise<T[]> {
  const hit = cached.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data.slice() as T[];
  const running = inflight.get(key);
  if (running) return (await running).slice() as T[];

  const p = (async () => {
    try {
      const data = await loader();
      cached.set(key, { at: Date.now(), data: data as any[] });
      return data as any[];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return (await p).slice() as T[];
}

/**
 * Invalida o cache sempre que o app grava algo no banco.
 * Instalado uma única vez, na inicialização do app.
 */
let installed = false;
export function installWriteInvalidation() {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: any, init?: any) => {
    const method = (init?.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
    const url = typeof input === "string" ? input : (input?.url ?? "");
    const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
    const isData = typeof url === "string" && (url.includes("/rest/v1/") || url.includes("/functions/v1/"));
    if (isWrite && isData) invalidatePurchasesCache();
    return original(input, init);
  };
}
