

# Validação de quantidade na conferência

## O que muda

O botão "Encerrar Conferência" só será habilitado quando a quantidade de peças conferidas for **igual** à quantidade declarada na compra. Um indicador visual mostrará o progresso (ex: "2/5 peças conferidas") e um alerta quando faltar peças.

## Alterações

### `src/components/processes/SacolaConferenciaPanel.tsx`

1. **Calcular quantidade declarada** a partir de `purchase.items` (soma de `quantity || 1` dos itens `peca_sacola`)
2. **Bloquear "Encerrar"** no `handleFinish`: se `pieces.length !== declaredQty`, exibir toast de erro e retornar
3. **Desabilitar botão "Encerrar"** visualmente quando `pieces.length !== declaredQty`
4. **Indicador de progresso** no rodapé: mostrar `{pieces.length}/{declaredQty} peças conferidas` com cor verde quando completo, amarelo/vermelho quando incompleto
5. O botão "Salvar e Continuar" permanece sem essa trava (permite salvar parcial e retomar depois)

| Arquivo | Mudança |
|---------|---------|
| `src/components/processes/SacolaConferenciaPanel.tsx` | Validação de quantidade + indicador visual |

