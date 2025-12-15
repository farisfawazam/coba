// Reveal on scroll animations: menambahkan class .show saat elemen masuk viewport
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

// FAQ accordion: toggle class .open pada item yang diklik
document.querySelectorAll('[data-faq-toggle]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const parent = toggle.closest('[data-faq]');
    if (!parent) return;
    parent.classList.toggle('open');
  });
});

// Filter produk per kategori
const filterButtons = document.querySelectorAll('[data-filter]');
const productCards = document.querySelectorAll('.product[data-category]');

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;
    filterButtons.forEach(button => {
      const isActive = button === btn;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    productCards.forEach(card => {
      const matches = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hide', !matches);
    });
  });
});
