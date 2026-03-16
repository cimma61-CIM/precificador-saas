(function initThemeModule() {
  const THEME_KEY = 'tema'
  const THEMES = new Set(['light', 'dark'])

  function getStoredTheme() {
    const storedTheme = localStorage.getItem(THEME_KEY)
    return THEMES.has(storedTheme) ? storedTheme : 'light'
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
  }

  function initTheme() {
    applyTheme(getStoredTheme())
  }

  function setTheme(theme) {
    const normalizedTheme = THEMES.has(theme) ? theme : 'light'
    localStorage.setItem(THEME_KEY, normalizedTheme)
    applyTheme(normalizedTheme)
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || getStoredTheme()
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  window.initTheme = initTheme
  window.setTheme = setTheme
  window.toggleTheme = toggleTheme

  initTheme()
})()
