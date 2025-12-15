// Animasi fade-up saat elemen masuk viewport
const fadeObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('show');
    });
  },
  { threshold: 0.2 }
);

const observeFadeUps = root => {
  if (!root) return;
  root.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));
};

observeFadeUps(document);

// FAQ accordion
document.querySelectorAll('[data-faq-toggle]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const parent = toggle.closest('[data-faq]');
    if (!parent) return;
    parent.classList.toggle('open');
  });
});

// Kumpulkan data produk dari DOM (tanpa ubah markup)
const productCards = Array.from(document.querySelectorAll('.product'));
const products = productCards.map((card, idx) => {
  const title = card.querySelector('strong')?.textContent.trim() || `Produk ${idx + 1}`;
  const priceText = card.querySelector('.price')?.textContent.trim() || 'Rp 0';
  const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 0;
  const desc = card.querySelector('small')?.textContent.trim() || '';
  const imgEl = card.querySelector('img');
  const img = imgEl?.getAttribute('src') || '';
  const alt = imgEl?.getAttribute('alt') || title;
  const category = card.dataset.category || 'other';
  const id = card.dataset.productId || `prod-${idx + 1}`;
  card.dataset.productId = id;
  const addBtn = card.querySelector('.btn');
  if (addBtn) addBtn.dataset.addToCart = id;
  return { id, title, priceText, price, desc, img, alt, category };
});

// Filter produk per kategori
const filterButtons = document.querySelectorAll('[data-filter]');

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

// Link "Lihat semua" sebagai reset filter
const showAllLink = document.querySelector('.section-title .text-link');
if (showAllLink) {
  showAllLink.addEventListener('click', evt => {
    evt.preventDefault();
    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.click();
    const grid = document.querySelector('.products-grid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Util format Rupiah
const formatCurrency = value => `Rp ${value.toLocaleString('id-ID')}`;

// State keranjang
const CART_KEY = 'sparxparts_cart';
let cart = [];

const loadCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch {
    cart = [];
  }
};

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));

// Elemen UI keranjang
const cartPanel = document.querySelector('[data-cart-panel]');
const cartOverlay = document.querySelector('[data-cart-overlay]');
const cartToggle = document.querySelector('[data-cart-toggle]');
const cartClose = document.querySelector('[data-cart-close]');
const cartItemsEl = document.querySelector('[data-cart-items]');
const cartTotalEl = document.querySelector('[data-cart-total]');
const cartCountEl = document.querySelector('[data-cart-count]');
const checkoutBtn = document.querySelector('[data-checkout]');
const paymentSelect = document.querySelector('[data-payment]');

const updateCartCount = () => {
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  if (cartCountEl) cartCountEl.textContent = count;
};

const renderCart = () => {
  if (!cartItemsEl) return;
  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="muted">Keranjang masih kosong. Tambahkan produk untuk checkout.</p>';
    cartTotalEl && (cartTotalEl.textContent = 'Rp 0');
    updateCartCount();
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(
      item => `<div class="cart-item" data-cart-item="${item.id}">
        <img src="${item.img}" alt="${item.alt}" loading="lazy" />
        <div>
          <h4>${item.title}</h4>
          <div class="muted">${item.desc}</div>
          <div class="qty-row">
            <button class="qty-btn" data-cart-dec="${item.id}">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-cart-inc="${item.id}">+</button>
          </div>
        </div>
        <div style="display:grid; gap:8px; justify-items:end;">
          <strong>${formatCurrency(item.price * item.qty)}</strong>
          <button class="icon-btn sm" data-cart-remove="${item.id}" aria-label="Hapus item">×</button>
        </div>
      </div>`
    )
    .join('');

  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  cartTotalEl && (cartTotalEl.textContent = formatCurrency(total));
  updateCartCount();
};

const openCart = () => {
  cartPanel?.classList.add('open');
  cartOverlay?.classList.add('show');
  cartPanel?.setAttribute('aria-hidden', 'false');
  cartToggle?.setAttribute('aria-expanded', 'true');
};

const closeCart = () => {
  cartPanel?.classList.remove('open');
  cartOverlay?.classList.remove('show');
  cartPanel?.setAttribute('aria-hidden', 'true');
  cartToggle?.setAttribute('aria-expanded', 'false');
};

const addToCart = id => {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  renderCart();
  openCart();
};

const changeQty = (id, delta) => {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
};

const removeItem = id => {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
};

// Wiring tombol add to cart (tidak ubah HTML produk)
productCards.forEach(card => {
  const btn = card.querySelector('[data-add-to-cart]');
  const id = card.dataset.productId;
  if (btn && id) {
    btn.addEventListener('click', () => addToCart(id));
  }
});

// Event keranjang
cartToggle?.addEventListener('click', () => {
  const isOpen = cartPanel?.classList.contains('open');
  isOpen ? closeCart() : openCart();
});
cartClose?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);

cartItemsEl?.addEventListener('click', evt => {
  const decBtn = evt.target.closest('[data-cart-dec]');
  const incBtn = evt.target.closest('[data-cart-inc]');
  const rmBtn = evt.target.closest('[data-cart-remove]');
  if (decBtn) changeQty(decBtn.dataset.cartDec, -1);
  if (incBtn) changeQty(incBtn.dataset.cartInc, 1);
  if (rmBtn) removeItem(rmBtn.dataset.cartRemove);
});

checkoutBtn?.addEventListener('click', () => {
  if (!cart.length) {
    alert('Keranjang masih kosong.');
    return;
  }
  const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const method = paymentSelect?.value || 'transfer';
  alert(
    `Checkout disiapkan.\nItems: ${cart.length}\nTotal: ${formatCurrency(
      total
    )}\nMetode: ${method.toUpperCase()}\n(Lanjutkan ke halaman pembayaran.)`
  );
});

// Init cart
loadCart();
renderCart();
