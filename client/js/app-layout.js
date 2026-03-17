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
      type: 'group',
      label: 'Produtos',
      children: [
        { id: 'produto-novo', href: '/produtos-novo.html', label: 'Novo produto' },
        { id: 'produtos-cadastrados', href: '/produtos-cadastrados.html', label: 'Produtos cadastrados' },
        { id: 'categorias', href: '/categorias.html', label: 'Categorias' },
        { id: 'importar-produtos', href: '/importar-produtos.html', label: 'Importar produtos' }
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
    const classes = `${className} ${link.id === pagina ? 'active' : ''}`.trim()

    return `
      <a class="${classes}" href="${link.href}">
        ${link.label}
      </a>
    `
  }

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
  document.getElementById('sidebar-logout-button')?.addEventListener('click', logoutUsuario)
})()
