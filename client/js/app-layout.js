(function initAppLayout() {
  if (typeof window.initTheme === 'function') {
    window.initTheme()
  }

  const pagina = document.body.dataset.appPage
  const mainContent = document.querySelector('.main-content')

  if (!pagina || !mainContent) {
    return
  }

  if (!localStorage.getItem('token')) {
    window.location.href = '/login.html'
    return
  }

  const navigation = [
    {
      type: 'link',
      id: 'dashboard',
      href: '/dashboard.html',
      label: 'Dashboard',
      icon: '📊'
    },
    {
      type: 'link',
      id: 'dashboard-financeiro',
      href: '/dashboard-financeiro.html',
      label: 'Financeiro',
      icon: '💰'
    },
    {
      type: 'submenu',
      id: 'cadastros',
      label: 'Cadastros',
      icon: '📝',
      children: [
        { id: 'contatos', href: '/contatos.html', label: 'Contatos', icon: '👥' },
        { id: 'compras', href: '/compras.html', label: 'Compras', icon: '🛒' },
        { id: 'produtos-cadastrados', href: '/produtos-cadastrados.html', label: 'Produtos', icon: '📦' },
        { id: 'anuncios', href: '/anuncios.html', label: 'Anuncios', icon: '📣' },
        { id: 'categorias', href: '/categorias.html', label: 'Categorias', icon: '🍿' },
        { id: 'vendedores', href: '/vendedores.html', label: 'Vendedores', icon: '👀' },
        { id: 'embalagens', href: '/embalagens.html', label: 'Embalagens', icon: '💼' },
        { id: 'relatorios', href: '/relatorios.html', label: 'Relatorios', icon: '📊' }
      ]
    },
    {
      type: 'group',
      label: 'Precificacao',
      icon: '🔢',
      children: [
        { id: 'regras-preco', href: '/regras-preco.html', label: 'Regras de preco', icon: '💾' },
        { id: 'reprecificacao', href: '/reprecificacao.html', label: 'Reprecificacao', icon: '🔄' }
      ]
    },
    {
      type: 'link',
      id: 'marketplaces',
      href: '/marketplaces.html',
      label: 'Marketplaces',
      icon: '🛍️'
    },
    {
      type: 'link',
      id: 'taxas',
      href: '/taxas.html',
      label: 'Taxas',
      icon: '📐'
    },
    {
      type: 'group',
      label: 'Ferramentas',
      icon: '🔧',
      children: [
        { id: 'simulador-preco', href: '/simulador-preco.html', label: 'Simulador de preco', icon: '💯' }
      ]
    },
    {
      type: 'link',
      id: 'minha-conta',
      href: '/minha-conta.html',
      label: 'Minha conta',
      icon: '👤'
    }
  ]

  // Estado do submenu
  let submenuOpen = false
  const cadastroSubmenu = navigation.find((item) => item.id === 'cadastros')

  function renderLink(link, className = 'menu-link') {
    const classes = [
      className,
      link.id === pagina ? 'active' : '',
      link.disabled ? 'is-disabled' : ''
    ]
      .filter(Boolean)
      .join(' ')

    const icon = link.icon || '•'
    const title = link.label

    return `
      <a class="${classes}" href="${link.disabled ? '#' : link.href}" title="${title}" data-icon="${icon}" ${link.disabled ? 'aria-disabled="true"' : ''}>
        ${link.label}
      </a>
    `
  }

  function renderSubmenuToggle(item) {
    const isActive = item.children.some((child) => child.id === pagina)

    return `
      <button
        class="menu-link menu-link-toggle ${isActive ? 'active' : ''}"
        type="button"
        data-submenu-toggle="${item.id}"
        data-has-submenu="true"
        aria-expanded="false"
      >
        <span>${item.label}</span>
        <span class="menu-link-toggle-icon" aria-hidden="true">&rsaquo;</span>
      </button>
    `
  }

  const sidebar = document.createElement('aside')
  sidebar.className = 'sidebar'
  sidebar.innerHTML = `
    <div class="sidebar-top">
      <a class="sidebar-brand-link" href="/dashboard.html">
        <div class="brand">
          <h2>Zentry</h2>
          <span>Operacao SaaS para marketplaces</span>
        </div>
      </a>
      <nav class="menu">
        ${navigation
          .map((item) => {
            if (item.type === 'link') {
              return renderLink(item)
            }

            if (item.type === 'submenu') {
              return renderSubmenuToggle(item)
            }

            const groupActive = item.children.some((child) => child.id === pagina)

            return `
              <div class="menu-group ${groupActive ? 'menu-group-active' : ''}">
                <span class="menu-group-title">${item.label}</span>
                <div class="menu-submenu">
                  ${item.children.map((child) => renderLink(child, 'menu-sublink')).join('')}
                </div>
              </div>
            `
          })
          .join('')}
      </nav>
    </div>
    <div class="sidebar-footer">
      <button id="sidebar-logout-button" class="button-secondary sidebar-logout-button" type="button">
        Sair
      </button>
    </div>
  `

  document.body.insertBefore(sidebar, mainContent)

  // Criar painel de submenu lateral
  const submenuPanel = document.createElement('aside')
  submenuPanel.className = 'sidebar-submenu-panel'
  submenuPanel.setAttribute('data-submenu-panel', 'cadastros')
  submenuPanel.setAttribute('aria-hidden', 'true')
  submenuPanel.innerHTML = `
    <div class="sidebar-submenu-header">
      <h3>${cadastroSubmenu?.label || 'Menu'}</h3>
      <button
        class="sidebar-submenu-close"
        type="button"
        aria-label="Fechar menu"
      >
        ×
      </button>
    </div>
    <nav class="sidebar-submenu-items">
      ${cadastroSubmenu?.children.map((child) => renderLink(child, 'sidebar-submenu-item')).join('') || ''}
    </nav>
  `

  document.body.insertBefore(submenuPanel, mainContent)

  document.getElementById('sidebar-logout-button')?.addEventListener('click', logoutUsuario)

  // ========================================
  // CONTROLE CENTRAL DO SUBMENU
  // ========================================

  const submenuToggle = document.querySelector('[data-submenu-toggle="cadastros"]')
  const submenuCloseBtn = document.querySelector('.sidebar-submenu-close')
  const menu = document.querySelector('.menu')

  /**
   * Função centralizada para controlar o estado do submenu
   * Garante que DOM, state e attributes estão sempre sincronizados
   * @param {boolean} isOpen - true para abrir, false para fechar
   */
  function setSubmenuOpen(isOpen) {
    // Evitar múltiplas atualizações desnecessárias
    if (submenuOpen === isOpen) {
      return
    }

    // Atualizar state
    submenuOpen = isOpen

    // 1. Sincronizar classe CSS no painel
    if (isOpen) {
      submenuPanel.classList.add('is-open')
    } else {
      submenuPanel.classList.remove('is-open')
    }

    // 2. Sincronizar atributo aria-hidden
    submenuPanel.setAttribute('aria-hidden', String(!isOpen))

    // 3. Sincronizar aria-expanded no toggle
    if (submenuToggle) {
      submenuToggle.setAttribute('aria-expanded', String(isOpen))
    }

    // 4. Sincronizar data-submenu-open no main-content
    if (isOpen) {
      mainContent.setAttribute('data-submenu-open', 'true')
    } else {
      mainContent.removeAttribute('data-submenu-open')
    }

    // Log para debug
    console.log(`[Submenu] Estado Alterado: ${isOpen ? '✓ ABERTO' : '✗ FECHADO'}`)

    // Salvar estado para persistir entre navegações
    sessionStorage.setItem('submenuOpen', String(isOpen))
  }

  /**
   * LISTENER 1: Toggle (botão "Cadastros")
   * Abre/fecha o submenu ao clicar
   */
  if (submenuToggle) {
    submenuToggle.addEventListener('click', (e) => {
      e.stopPropagation()
      setSubmenuOpen(!submenuOpen)
    })
  }

  /**
   * LISTENER 2: Botão de fechar (×)
   * Fecha o submenu
   */
  if (submenuCloseBtn) {
    submenuCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      setSubmenuOpen(false)
    })
  }

  /**
   * LISTENER 2.5: Clique no submenu
   * Se clicar fora dos items do submenu, fecha o submenu
   * Permite clicar nos itens da sidebar que ficam visíveis nos 20%
   */
  if (submenuPanel) {
    submenuPanel.addEventListener('click', (e) => {
      // Se clicou em um item do submenu, NÃO fecha
      if (e.target.closest('.sidebar-submenu-item')) {
        return
      }

      // Se clicou no header ou botão de fechar, deixa passar
      if (e.target.closest('.sidebar-submenu-header')) {
        return
      }

      // Se clicou em qualquer outro lugar, fecha o submenu
      if (submenuOpen) {
        console.log('[Submenu] Clique fora dos items → Fechando')
        setSubmenuOpen(false)
      }
    })

    // Adicionar listener em cada item do submenu para evitar propagação
    document.querySelectorAll('.sidebar-submenu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        console.log('[Submenu] Item clicado - mantendo aberto')
      })
    })
  }

  /**
   * LISTENER 3: Tecla ESC
   * Fecha o submenu apenas com ESC (ou outro menu)
   */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && submenuOpen) {
      e.preventDefault()
      setSubmenuOpen(false)
      // Retornar foco para o botão
      if (submenuToggle) {
        submenuToggle.focus()
      }
    }
  })

  /**
   * LISTENER 4: Clique em items do menu principal
   * Fecha APENAS ao clicar em outro menu (Dashboard, Financeiro, etc)
   * Submenu fica aberto se clicar em items do próprio submenu
   */
  if (menu) {
    menu.addEventListener('click', (e) => {
      // Ignorar se clicou o toggle do submenu
      if (e.target.closest('[data-submenu-toggle]')) {
        return
      }

      // Ignorar cliques em items do submenu - NÃO deve fechar
      if (e.target.closest('.sidebar-submenu-panel')) {
        return
      }

      // Se clicou em um link do menu principal (a, button), fechar submenu
      const link = e.target.closest('a, button')
      if (link && submenuOpen) {
        console.log('[Submenu] Clique em outro item do menu → Fechando')
        setSubmenuOpen(false)
      }
    })
  }

  /**
   * INICIALIZAÇÃO: Recuperar estado salvo ou começar FECHADO
   * Persiste o estado do submenu entre navegações
   */
  const submenuState = sessionStorage.getItem('submenuOpen') === 'true'
  setSubmenuOpen(submenuState)

  // ===================================
  // SIDEBAR FIXA - SEM COMPORTAMENTO DE HOVER
  // ===================================
  // Sidebar é sempre expandida (240px) e fixa
  // Não há hover automático - comportamento controlado apenas por clique do submenu
  sidebar.classList.add('is-expanded')
})()
