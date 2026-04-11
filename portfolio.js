// ── Filter logic ─────────────────────────────────────────────
const filterBtns = document.querySelectorAll('.filter-btn');
const cards      = document.querySelectorAll('.port-card');

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    cards.forEach((card) => {
      const categories = card.dataset.category || '';
      if (filter === 'all' || categories.includes(filter)) {
        card.classList.remove('hidden');
        card.style.animation = 'none';
        card.offsetHeight; // reflow
        card.style.animation = '';
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// ── Scroll reveal ─────────────────────────────────────────────
const portReveals = document.querySelectorAll('.reveal');
const portObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        portObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);
portReveals.forEach((el) => portObserver.observe(el));

// ── Mobile nav hamburger ─────────────────────────────────────
const hamburger = document.getElementById('nav-hamburger');
const overlay   = document.getElementById('mobile-nav-overlay');
const drawer    = document.getElementById('mobile-nav-drawer');

function openNav() {
  hamburger.classList.add('open');
  overlay.classList.add('open');
  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  hamburger.classList.remove('open');
  overlay.classList.remove('open');
  drawer.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
  hamburger.classList.contains('open') ? closeNav() : openNav();
});
overlay?.addEventListener('click', closeNav);
drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
