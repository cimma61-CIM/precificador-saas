# ✅ Guia de Validação Visual - Submenu

## 🚀 Quick Start

```bash
# 1. Certifique-se que o servidor está rodando
cd server && npm start

# 2. Abra em navegador
http://localhost:3010/dashboard.html

# 3. Abra DevTools (F12) e vá para Console
# para ver logs de estado do submenu
```

---

## 🧪 Teste 1: Submenu Não Abre Automaticamente

**Ação:** Carregar página Dashboard
- [ ] Submenu NÃO aparece (translateX hidden)
- [ ] Botão "Cadastros" visível com arrow
- [ ] Layout normal (sem margin-left 520px)
- [ ] Console mostra: `[Submenu] Estado: FECHADO`

---

## 🧪 Teste 2: Abrir Submenu ao Clicar

**Ação:** Clicar em botão "Cadastros"
- [ ] Submenu desliza suavemente da esquerda (animação 0.3s)
- [ ] Mostra itens: Produtos, Categorias, etc
- [ ] Layout ajusta com margin-left (sidebar 240px + submenu 280px)
- [ ] Botão toggle fica ativo (visual highlight)
- [ ] Console mostra: `[Submenu] Estado: ABERTO`

**Visual esperado:**
```
[Sidebar]     [Submenu]      [Conteúdo]
[📊 ...] ────[📝 Cadastros]──────────────
[💰 ...] │    [📦 Produtos]
[📝 ...] │    [🏷️ Categorias]
[toggle]▼│    [👥 Clientes]
         │    [📊 Relatorios]
```

---

## 🧪 Teste 3: Fechar ao Clicar em Item

**Ação:** Com submenu aberto, clicar em "Produtos"
- [ ] Navega para `/produtos-cadastrados.html`
- [ ] Submenu se fecha (translateX hidden)
- [ ] Layout volta ao normal
- [ ] Console mostra: `[Submenu] Estado: FECHADO`

**Timing esperado:**
1. Clique em "Produtos"
2. Submenu fecha (~0.3s)
3. Página navega+carrega

---

## 🧪 Teste 4: Fechar ao Clicar Fora

**Ação:** Submenu aberto, clicar no conteúdo (não no submenu)
- [ ] Submenu fecha imediatamente
- [ ] Layout volta ao normal
- [ ] Nenhuma navegação acontece
- [ ] Console mostra: `[Submenu] Estado: FECHADO`

**Áreas para testar:**
- ✓ Em cima do conteúdo principal
- ✓ Na sidebar (parte reduzida)
- ✓ Na parte inferior da página

---

## 🧪 Teste 5: Fechar com Botão X

**Ação:** Clicar no botão "×" do submenu
- [ ] Submenu fecha suavemente (0.3s)
- [ ] Layout volta ao normal
- [ ] Nenhuma navegação
- [ ] Console mostra: `[Submenu] Estado: FECHADO`

**Visual esperado:**
```
Na head do submenu:
┌─────────────────────┐
│ 📝 Cadastros  [×] ◄─ Clique aqui
├─────────────────────┤
│ 📦 Produtos         │
├─────────────────────┤
│ 🏷️ Categorias      │
└─────────────────────┘
```

---

## 🧪 Teste 6: Fechar com ESC

**Ação:** Submenu aberto, pressionar tecla ESC
- [ ] Submenu fecha suavemente (0.3s)
- [ ] Layout volta ao normal
- [ ] Foco retorna para botão "Cadastros"
- [ ] Console mostra: `[Submenu] Estado: FECHADO`

**Como testar:**
1. Clicar em "Cadastros" (submenu abre)
2. Pressionar ESC
3. Submenu deve fechar e botão ganhar foco (outline visível)

---

## 🧪 Teste 7: Comportamento em Items Desabilitados

**Ação:** Com submenu aberto, clicar em item cinzento

Exemplo: "Clientes e Fornecedores" tem icon 👥 mas está cinzento

- [ ] Item NÃO é clicável (sem active state)
- [ ] Submenu NÃO fecha
- [ ] Página NÃO navega
- [ ] Cursor muda para "not-allowed"
- [ ] Console NÃO mostra erro

---

## 🧪 Teste 8: Abrir Automaticamente em Página de Submenu

**Ação:** Navegar para página dentro do submenu

**Cenário 1:** De Dashboard → Produtos
```
1. Clique em "Cadastros" (submenu abre)
2. Clique em "Produtos"
3. Página navega para /produtos-cadastrados.html
4. Submenu se fecha + página carrega
```

**Cenário 2:** Recarregar página (F5) em uma página de submenu
```
1. Estar em /produtos-cadastrados.html
2. Pressionar F5 (recarregar)
3. Página recarrega
4. Submenu abre automaticamente (porque está em página do submenu)
5. Console mostra: `[Submenu] Estado: ABERTO`
```

**Cenário 3:** Navegar para página de submenu direto
```
1. Na URL, navegar para /categorias.html
2. Página carrega
3. Submenu abre automaticamente
4. Console mostra: `[Submenu] Estado: ABERTO`
```

---

## 🧪 Teste 9: Toggle Rápido (Cliques)

**Ação:** Clicar muito rápido no botão "Cadastros"

```
Clique 1 → Submenu abre (0.3s animação)
Clique 2 (durante animação) → Submenu fecha
Clique 3 (durante animação) → Submenu abre
...
```

**Esperado:**
- ✓ Sem erro/crash
- ✓ Estado fica sincronizado
- ✓ Nenhuma duplicação
- ✓ Animação fluida

---

## 🧪 Teste 10: Validação com DevTools (F12)

**Console - Verificar Estado:**
```javascript
// Deve retornar true quando aberto
document.querySelector('.sidebar-submenu-panel').classList.contains('is-open')

// Deve ter data-submenu-open quando aberto
document.querySelector('.main-content').hasAttribute('data-submenu-open')

// Aria-hidden deve inverter
document.querySelector('.sidebar-submenu-panel').getAttribute('aria-hidden')
// 'false' quando aberto, 'true' quando fechado
```

**Elements - Inspecionar Estrutura:**
1. Pressionar F12
2. Ir para "Elements"
3. Encontrar `.sidebar-submenu-panel`
4. Verificar se tem classe `is-open` quando aberto
5. Verificar se `.main-content` tem atributo `data-submenu-open`

---

## 📊 Matriz de Validação Completa

| Teste | Ação | Resultado Esperado | Status |
|-------|------|-------------------|--------|
| 1 | Carregar Dashboard | Submenu FECHADO | [ ] |
| 2 | Clicar "Cadastros" | Submenu ABRE | [ ] |
| 3 | Clicar "Produtos" | Navega + Fecha | [ ] |
| 4 | Clicar FORA | Submenu FECHA | [ ] |
| 5 | Clicar botão × | Submenu FECHA | [ ] |
| 6 | Pressionar ESC | Submenu FECHA | [ ] |
| 7 | Clicar item cinzento | Sem ação | [ ] |
| 8 | Navegar para Produtos | Submenu ABRE auto | [ ] |
| 9 | Cliques rápidos | Sem erro | [ ] |
| 10 | DevTools check | Sincronizado | [ ] |

---

## 🐛 Se Algo Não Funcionar

### Submenu não abre ao clicar
```javascript
// No console, verificar:
document.querySelector('[data-submenu-toggle="cadastros"]')
// Se retorna null → check HTML

// Verificar listener:
console.log('Click listeners:', getEventListeners(document.querySelector('[data-submenu-toggle="cadastros"]')))
```

### Submenu não fecha ao clicar fora
```javascript
// Verificar se listener existe:
console.log('Document listeners:', getEventListeners(document).click)

// Testar manualmente:
submenuPanel.classList.remove('is-open')
mainContent.removeAttribute('data-submenu-open')
```

### Layout não ajusta (margin-left)
```javascript
// Verificar atributo:
document.querySelector('.main-content').getAttribute('data-submenu-open')
// Deve ser 'true' quando aberto

// Verificar CSS aplicado:
window.getComputedStyle(document.querySelector('.main-content')).marginLeft
// Deve ser '520px' quando aberto
```

### Estado desincronizado
```javascript
// Verificar todas as sincronizações:
const panel = document.querySelector('.sidebar-submenu-panel')
const toggle = document.querySelector('[data-submenu-toggle]')
const content = document.querySelector('.main-content')

console.log('Is Open:', panel.classList.contains('is-open'))
console.log('Aria Hidden:', panel.getAttribute('aria-hidden'))
console.log('Aria Expanded:', toggle.getAttribute('aria-expanded'))
console.log('Data Submenu:', content.hasAttribute('data-submenu-open'))
// Todos devem estar sincronizados (opens=true → is-open + aria-hidden:false + aria-expanded:true + data-submenu-open)
```

---

## 🎯 Checklist Final

- [ ] Teste 1: ✓ Não abre automaticamente
- [ ] Teste 2: ✓ Abre ao clicar
- [ ] Teste 3: ✓ Fecha ao navegar
- [ ] Teste 4: ✓ Fecha ao clicar fora
- [ ] Teste 5: ✓ Fecha com botão X
- [ ] Teste 6: ✓ Fecha com ESC
- [ ] Teste 7: ✓ Items desabilitados não clicam
- [ ] Teste 8: ✓ Abre automaticamente em página de submenu
- [ ] Teste 9: ✓ Cliques rápidos sem erro
- [ ] Teste 10: ✓ DevTools mostra sincronização

**Se todos passarem:** ✅ COMPORTAMENTO CORRETO!

---

## 📱 Testes em Dispositivos

### Desktop (Recomendado)
- ✓ Chrome/Edge (Chromium)
- ✓ Firefox
- ✓ Safari

### Mobile (Opcional)
- ✓ Testar clique fora (toque em conteúdo)
- ✓ Testar ESC (sem teclado? usar close button)
- ✓ Verificar layout em tela pequena

---

## 📝 Logs Esperados no Console

**Ao abrir:**
```
[Submenu] Estado: ABERTO
```

**Ao fechar:**
```
[Submenu] Estado: FECHADO
```

**Ao clicar em item:**
```
[Submenu] Estado: FECHADO
```

**Ao recarregar em página de submenu:**
```
[Submenu] Estado: ABERTO
```

---

## ✅ Status da Implementação

**Código:** ✅ Implementado e validado
**Testes:** ⏳ Aguardando execução manual
**Documentação:** ✅ Completa

**Próximo Passo:** Executar todos os testes da matriz acima e confirmar comportamento.

---

## 💡 Dica de Produtividade

Para testar múltiplos cenários rápido:

1. Abra DevTools (F12)  
2. No Console, rode:
```javascript
// Ver estado atual
submenuOpen  // true/false

// Testar abertura/fechamento manual
setSubmenuOpen(true)   // Abre
setSubmenuOpen(false)  // Fecha
```

3. Observe tanto:
   - O visual (submenu deslizando)
   - Os logs (console mensagens)
   - O DOM (inspecione elementos)

---

**Tempo estimado de testes:** 10-15 minutos
**Resultado esperado:** Todos os testes passando ✅
