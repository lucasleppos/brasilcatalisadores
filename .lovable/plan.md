

# Corrigir edição de fornecedor com campos vazios

## Problema
O `SupplierForm` usa `useState(initial?.name ?? "")` que apenas define o valor na **primeira montagem** do componente. Como o `Dialog` permanece montado, quando o usuario clica para editar, o `initial` muda mas os estados internos nao atualizam.

## Solucao
Adicionar um `useEffect` que sincroniza os campos do formulario sempre que `initial` ou `open` mudar. Quando o dialog abre, os campos sao preenchidos com os dados do fornecedor selecionado (ou limpos para novo cadastro).

## Arquivo: `src/components/suppliers/SupplierForm.tsx`
- Importar `useEffect`
- Adicionar `useEffect` que observa `initial` e `open`, resetando todos os estados (`name`, `document`, `email`, `branch`, `buyer`, `margin`) com os valores de `initial` quando o dialog abre

## Impacto
- Nenhuma alteracao de banco
- Apenas 1 arquivo modificado
- Resolve tanto a edicao quanto o reset ao criar novo fornecedor

