function inicializarRevealLanding() {
  const elementos = document.querySelectorAll('[data-reveal]')

  if (!elementos.length) {
    return
  }

  elementos.forEach((elemento, index) => {
    const delay = Math.min(index * 0.08, 0.4)
    elemento.style.setProperty('--reveal-delay', `${delay}s`)
  })

  if (!('IntersectionObserver' in window)) {
    elementos.forEach((elemento) => {
      elemento.classList.add('is-visible')
    })
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return
        }

        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px'
    }
  )

  elementos.forEach((elemento) => {
    observer.observe(elemento)
  })
}

function inicializarGraficoHero() {
  const ctxHero = document.getElementById('graficoHero')

  if (!ctxHero || typeof window.Chart !== 'function') {
    return
  }

  new window.Chart(ctxHero, {
    type: 'line',
    data: {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [{
        data: [120, 180, 150, 220, 300, 260],
        tension: 0.4,
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarRevealLanding()
  inicializarGraficoHero()
})
