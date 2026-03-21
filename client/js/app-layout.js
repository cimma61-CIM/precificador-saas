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
      label: 'Dashboard'
    },
    {
      type: 'link',
      id: 'dashboard-financeiro',
      href: '/dashboard-financeiro.html',
      label: 'Financeiro'
    },
    {
      type: 'submenu',
      id: 'cadastros',
      label: 'Cadastros',
      children: [
        { id: 'clientes-fornecedores', href: '#', label: 'Clientes e Fornecedores', disabled: true },
        { id: 'produtos-cadastrados', href: '/produtos-cadastrados.html', label: 'Produtos' },
        { id: 'anuncios', href: '#', label: 'Anuncios', disabled: true },
        { id: 'categorias', href: '/categorias.html', label: 'Categorias' },
        { id: 'vendedores', href: '#', label: 'Vendedores', disabled: true },
        { id: 'embalagens', href: '#', label: 'Embalagens', disabled: true },
        { id: 'relatorios', href: '#', label: 'Relatorios', disabled: true }
      ]
    },
    {
      type: 'group',
      label: 'Precificacao',
      children: [
        { id: 'regras-preco', href: '/regras-preco.html', label: 'Regras de preco' },
        { id: 'reprecificacao', href: '/reprecificacao.html', label: 'Reprecificacao' }
      ]
    },
    {
      type: 'link',
      id: 'marketplaces',
      href: '/marketplaces.html',
      label: 'Marketplaces'
    },
    {
      type: 'link',
      id: 'taxas',
      href: '/taxas.html',
      label: 'Taxas'
    },
    {
      type: 'group',
      label: 'Ferramentas',
      children: [
        { id: 'simulador-preco', href: '/simulador-preco.html', label: 'Simulador de preco' }
      ]
    },
    {
      type: 'link',
      id: 'minha-conta',
      href: '/minha-conta.html',
      label: 'Minha conta'
    }
  ]

  function renderLink(link, className = 'menu-link') {
    const classes = [
      className,
      link.id === pagina ? 'active' : '',
      link.disabled ? 'is-disabled' : ''
    ]
      .filter(Boolean)
      .join(' ')

    return `
      <a class="${classes}" href="${link.disabled ? '#' : link.href}" ${link.disabled ? 'aria-disabled="true"' : ''}>
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
        aria-expanded="${isActive ? 'true' : 'false'}"
      >
        <span>${item.label}</span>
        <span class="menu-link-toggle-icon" aria-hidden="true">&rsaquo;</span>
      </button>
    `
  }

  function renderSubmenuPanel(item) {
    const isActive = item.children.some((child) => child.id === pagina)

    return `
      <aside
        class="sidebar-submenu ${isActive ? 'is-open' : ''}"
        data-submenu-panel="${item.id}"
        aria-hidden="${isActive ? 'false' : 'true'}"
      >
        <div class="sidebar-submenu-head">
          <span class="sidebar-submenu-kicker">Cadastros</span>
        </div>
        <nav class="sidebar-submenu-nav">
          ${item.children.map((child) => renderLink(child, 'sidebar-submenu-link')).join('')}
        </nav>
      </aside>
    `
  }

  const cadastroSubmenu = navigation.find((item) => item.type === 'submenu' && item.id === 'cadastros')
  const cadastroActive = Boolean(cadastroSubmenu?.children.some((child) => child.id === pagina))

  const sidebar = document.createElement('aside')
  sidebar.className = 'sidebar'
  sidebar.innerHTML = `
    <div class="sidebar-top">
      <a class="sidebar-brand-link" href="/dashboard.html">
        <div class="brand">
          <h2>Precificador</h2>
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
  if (cadastroSubmenu) {
    document.body.insertAdjacentHTML('afterbegin', renderSubmenuPanel(cadastroSubmenu))
  }

  document.getElementById('sidebar-logout-button')?.addEventListener('click', logoutUsuario)

  const submenuToggle = document.querySelector('[data-submenu-toggle="cadastros"]')
  const submenuPanel = document.querySelector('[data-submenu-panel="cadastros"]')

  function setSubmenuState(isOpen) {
    if (!submenuToggle || !submenuPanel) {
      return
    }

    submenuToggle.setAttribute('aria-expanded', String(isOpen))
    submenuPanel.classList.toggle('is-open', isOpen)
    submenuPanel.setAttribute('aria-hidden', String(!isOpen))
  }

  if (cadastroActive) {
    setSubmenuState(true)
  }

  submenuToggle?.addEventListener('click', () => {
    const isOpen = submenuToggle.getAttribute('aria-expanded') === 'true'
    setSubmenuState(!isOpen)
  })

  document.addEventListener('click', (event) => {
    if (!submenuToggle || !submenuPanel) {
      return
    }

    const target = event.target

    if (!(target instanceof Node)) {
      return
    }

    if (submenuToggle.contains(target) || submenuPanel.contains(target)) {
      return
    }

    setSubmenuState(false)
  })

  document.querySelectorAll('.is-disabled').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
    })
  })

  document.querySelectorAll('.sidebar-submenu-link:not(.is-disabled)').forEach((link) => {
    link.addEventListener('click', () => {
      setSubmenuState(false)
    })
  })
})()
