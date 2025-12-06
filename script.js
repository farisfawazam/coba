// Reveal on scroll animations
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// FAQ accordion
document.querySelectorAll('[data-faq-toggle]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const parent = toggle.closest('[data-faq]');
    if (!parent) return;
    parent.classList.toggle('open');
  });
});
