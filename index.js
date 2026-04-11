// ── Scroll reveal ────────────────────────────────────────────
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
reveals.forEach((el) => observer.observe(el));

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

// Close mobile nav when a drawer link is clicked
drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

// ── Contact form handler ─────────────────────────────────────
async function handleContact(e) {
  e.preventDefault();
  const form      = document.getElementById('contact-form');
  const success   = document.getElementById('contact-success');
  const submitBtn = form.querySelector('button[type="submit"]');

  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  try {
    const formData = new FormData(form);
    const res = await fetch('/api/contact', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) throw new Error('Failed to send');

    form.style.opacity   = '0';
    form.style.transform = 'translateY(-8px)';
    form.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => {
      form.hidden = true;
      success.hidden = false;
    }, 300);
  } catch (error) {
    alert('Something went wrong. Please try again or text us directly.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}
