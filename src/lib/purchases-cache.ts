/**
 * Cache curto e compartilhado da lista de compras.
 *
 * Várias telas (Compras, Processos, Concluídos, Filiais) carregam a mesma
 * lista completa de compras e itens. Sem cache, cada troca de tela, cada
 * componente montado e cada retorno de foco refaz toda a leitura no banco.
 *
 * O cache é invalidado automaticamente a cada gravação no banco (qualquer
 * requisição que não seja de leitura), então nunca exibe dado velho depois de
 * salvar, avançar etapa ou excluir.
 */
const TTL_MS = 60_000;

let cached: { at: number; data: any[] } | null = null;
let inflight: Promise<any[]> | null = null;

export function invalidatePurchasesCache() {
  cached = null;
}

/** Executa o loader reaproveitando o resultado recente e unindo chamadas simultâneas. */
export async function cachedLoad<T>(loader: () => Promise<T[]>): Promise<T[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data.slice() as T[];
  if (inflight) return (await inflight).slice() as T[];

  inflight = (async () => {
    try {
      const data = await loader();
      cached = { at: Date.now(), data: data as any[] };
      return data as any[];
    } finally {
      inflight = null;
    }
  })();

  return (await inflight).slice() as T[];
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
