// Reveal on scroll
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
  { threshold: 0.12 }
);
reveals.forEach((el) => observer.observe(el));

// Contact form handler
async function handleContact(e) {
  e.preventDefault();
  const form = document.getElementById('contact-form');
  const success = document.getElementById('contact-success');
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

    form.style.opacity = '0';
    form.style.transform = 'translateY(-8px)';
    form.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => {
      form.hidden = true;
      success.hidden = false;
      success.style.animation = 'none';
      success.offsetHeight; // reflow
      success.style.animation = '';
    }, 300);
  } catch (error) {
    alert('Something went wrong. Please try again or contact us directly.');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}
