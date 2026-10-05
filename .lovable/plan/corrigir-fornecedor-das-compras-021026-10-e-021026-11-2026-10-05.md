# Corrigir fornecedor das compras 021026-10 e 021026-11

## O que será feito
- Alterar o fornecedor das duas compras abaixo, hoje registrado como "AYRTON SILVA BRISON":
  - **021026-10** (Peças, 4 peças / 2,220 kg, R$ 2.851,28)
  - **021026-11** (Cerâmico, 0,865 kg, R$ 138,70)
- Passam a constar como **"VALQUIRIA GOMES VARIAL BRISON"** (cadastro existente, documento 131.934.667-78, filial TV, comprador HIAGO).
- O vínculo interno com o cadastro também é trocado: as duas compras deixam de apontar para o cadastro do AYRTON e passam a apontar para o cadastro da VALQUIRIA. Assim nome e cadastro ficam consistentes em todas as telas e relatórios.
- Nada mais muda: data, status, itens, pesos, valores e observações permanecem exatamente como estão.
- O cadastro de "AYRTON SILVA BRISON" não é alterado nem excluído — ele continua existindo para as outras compras que já usam esse fornecedor.

## Verificação
- Consultar no banco as duas compras e confirmar nome e vínculo atualizados.
- Conferir que nenhum outro registro (bags, análises, demonstrativos) foi tocado.

## Detalhes técnicos
- `UPDATE public.purchases SET supplier_id = '6f4ea043-4c44-4725-a70a-56c287cd3b0f', supplier_name = 'VALQUIRIA GOMES VARIAL BRISON' WHERE purchase_number IN ('021026-10','021026-11');`
- IDs das compras: 021026-10 = `8fb9d3dc-eb54-44a1-a21e-f3adb6096924`, 021026-11 = `34051432-473b-47e6-b740-3c352247f836`.
- Cadastro de destino: VALQUIRIA GOMES VARIAL BRISON = `6f4ea043-4c44-4725-a70a-56c287cd3b0f`.
- Conferido no banco: nenhuma dessas compras tem item em bag, histórico de bag, consumo de hedge ou registro em conta corrente de filial, então não há nome duplicado em outro lugar para acertar.
- Os demonstrativos/PDFs leem o nome da compra no momento da emissão, então passam a sair com o fornecedor correto sem necessidade de regeração.
