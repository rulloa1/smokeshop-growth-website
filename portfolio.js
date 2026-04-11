// Filter logic
const filterBtns = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.port-card');

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    // Update active button
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide cards
    cards.forEach((card) => {
      const categories = card.dataset.category || '';
      if (filter === 'all' || categories.includes(filter)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 70);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);
reveals.forEach((el) => observer.observe(el));
