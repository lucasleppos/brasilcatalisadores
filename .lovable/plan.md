# Plano: Atalho na Tela Inicial (PWA)

## Objetivo
Permitir que o app seja adicionado à tela inicial de celulares (iPhone e Android) diretamente pelo navegador, sem precisar de loja de apps.

## Escopo
Implementar suporte mínimo e seguro para instalação na tela inicial, **sem service worker e sem cache offline**, pois o objetivo é apenas o atalho/ícone.

## O que será feito

1. **Criar o manifesto do app**
   - Arquivo: `public/manifest.webmanifest`
   - Conteúdo: nome do app, nome curto, cores tema/fundo, `display: standalone`, ícones nos tamanhos padrão.

2. **Gerar ícones do app**
   - Criar ícones PNG em `public/` nos tamanhos 192x192 e 512x512 para o manifesto.
   - Criar `apple-touch-icon.png` (180x180) para iPhone.
   - Usar a identidade visual bege/dourada e o nome "Brasil Sust. Catalisadores".

3. **Atualizar o `index.html`**
   - Adicionar `<link rel="manifest" href="/manifest.webmanifest">`.
   - Adicionar `<meta name="theme-color" content="...">` com a cor da marca.
   - Adicionar `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`.
   - Ajustar a descrição meta para algo mais informativo do que "INTERNO".

4. **Validar**
   - Verificar se o manifesto é carregado corretamente no preview.
   - Confirmar que não há service worker sendo registrado (manter comportamento atual).

## Nota importante
O atalho na tela inicial funciona apenas no app publicado. No preview do Lovable o navegador pode não oferecer a opção "Adicionar à tela inicial". Após publicar, os usuários verão a opção no menu do navegador (Compartilhar → Adicionar à Tela Inicial no iPhone, ou menu do Chrome no Android).
