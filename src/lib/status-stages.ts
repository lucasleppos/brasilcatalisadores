import type { Purchase, MaterialFlow } from "./purchases";

/** Nomes padronizados das etapas, na ordem do fluxo (fonte única do app). */
export const STAGES = {
  conferencia: "Conferência",
  moagem: "Moagem",
  laboratorio: "Laboratório",
  demonstrativo: "Demonstrativo",
  aprovacao: "Aprovação",
  corte: "Corte",
  bag: "Alocação em Bag",
  concluido: "Concluído",
} as const;

export const STAGE_ORDER: string[] = [
  STAGES.conferencia,
  STAGES.moagem,
  STAGES.laboratorio,
  STAGES.demonstrativo,
  STAGES.aprovacao,
  STAGES.corte,
  STAGES.bag,
  STAGES.concluido,
];

/** Status interno (banco) → etapa padronizada. */
const STATUS_TO_STAGE: Record<string, string> = {
  // Conferência
  "Aguardando Inclusão": STAGES.conferencia,
  "Aguardando Conferência": STAGES.conferencia,
  "Em Conferência": STAGES.conferencia,
  "Conferência": STAGES.conferencia,
  "Recebimento": STAGES.conferencia,
  // Moagem
  "Peças: Trituração e Amostragem": STAGES.moagem,
  "Peças: Em Trituração": STAGES.moagem,
  "Peças: Em Amostragem": STAGES.moagem,
  "Cerâmico: Em Trituração/Homogeneização": STAGES.moagem,
  "Trituração": STAGES.moagem,
  "Homogeneização": STAGES.moagem,
  "Amostragem": STAGES.moagem,
  // Laboratório
  "Peças: Laboratório": STAGES.laboratorio,
  "Cerâmico: Amostra Enviada ao Lab": STAGES.laboratorio,
  "Cerâmico: Lab em Análise": STAGES.laboratorio,
  "Cerâmico: Resultado Incluído": STAGES.laboratorio,
  "Análise": STAGES.laboratorio,
  // Demonstrativo
  "Peças: Aguardando Demonstrativo": STAGES.demonstrativo,
  "Peças: Pesagem Realizada": STAGES.demonstrativo,
  "Peças: Peso Divergente": STAGES.demonstrativo,
  "Cerâmico: Em Precificação": STAGES.demonstrativo,
  // Aprovação
  "Peças: Gerar Boleto de Aprovação": STAGES.aprovacao,
  "Cerâmico: Gerar Boleto de Aprovação": STAGES.aprovacao,
  "Peças: Demonstrativo Contestado": STAGES.aprovacao,
  "Cerâmico: Demonstrativo Contestado": STAGES.aprovacao,
  "Aprovação do Fornecedor": STAGES.aprovacao,
  // Corte
  "Peças: Em Corte": STAGES.corte,
  "Corte da Peça": STAGES.corte,
  // Alocação em Bag
  "Peças: Aprovado - Aguardando Pagamento": STAGES.bag,
  "Peças: Pagamento Realizado": STAGES.bag,
  "Pagamento": STAGES.bag,
  "Peças: Alocado ao Bag": STAGES.bag,
  "Cerâmico: Aprovado": STAGES.bag,
  "Enviado ao Bag": STAGES.bag,
  // Concluído
  "Peças: Encerrado": STAGES.concluido,
  "Cerâmico: Encerrado": STAGES.concluido,
  "Concluído": STAGES.concluido,
  "Exportação/Venda": STAGES.concluido,
};

/** Etapa padronizada de um status (opcionalmente considerando o sub-status de bag). */
export function stageOfStatus(status: string, opStatus?: string | null): string {
  if (opStatus === "Bag Alocado") return STAGES.concluido;
  if (opStatus === "Alocando Bag") return STAGES.bag;
  return STATUS_TO_STAGE[status] || status;
}

/** Etapa padronizada de uma compra. */
export function stageOfPurchase(p: Pick<Purchase, "status" | "opStatus">): string {
  return stageOfStatus(p.status, p.opStatus);
}

const FLOW_LABELS: Record<string, string> = {
  pecas: "Peças",
  sacola: "Peça em Sacola",
  ceramico: "Cerâmico",
};

export function flowLabel(flow: MaterialFlow | null | undefined): string {
  return (flow && FLOW_LABELS[flow]) || "";
}

/** Compra já concluída (mesmo critério usado na tela de Concluídos). */
export function isCompletedStage(p: Pick<Purchase, "status" | "opStatus">): boolean {
  return stageOfPurchase(p) === STAGES.concluido;
}
