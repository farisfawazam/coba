// Animasi fade-up saat elemen masuk viewport
const fadeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  },
  { threshold: 0.2 }
);

const observeFadeUps = (root) => {
  if (!root) return;
  root.querySelectorAll(".fade-up").forEach((el) => fadeObserver.observe(el));
};

observeFadeUps(document);

// FAQ accordion
document.querySelectorAll("[data-faq-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const parent = toggle.closest("[data-faq]");
    if (!parent) return;
    parent.classList.toggle("open");
  });
});

// Kumpulkan data produk dari DOM (tanpa ubah markup)
const productCards = Array.from(document.querySelectorAll(".product"));
const products = productCards.map((card, idx) => {
  const title =
    card.querySelector("strong")?.textContent.trim() || `Produk ${idx + 1}`;
  const priceText = card.querySelector(".price")?.textContent.trim() || "Rp 0";
  const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10) || 0;
  const desc = card.querySelector("small")?.textContent.trim() || "";
  const imgEl = card.querySelector("img");
  const img = imgEl?.getAttribute("src") || "";
  const alt = imgEl?.getAttribute("alt") || title;
  const category = card.dataset.category || "other";
  const id = card.dataset.productId || `prod-${idx + 1}`;
  card.dataset.productId = id;
  const addBtn = card.querySelector(".btn");
  if (addBtn) addBtn.dataset.addToCart = id;
  const searchText = `${title} ${desc}`.toLowerCase();
  return { id, title, priceText, price, desc, img, alt, category, searchText };
});

const productGrid = document.querySelector(".products-grid");
const productMap = new Map();
productCards.forEach((card) => {
  const id = card.dataset.productId;
  if (id) productMap.set(id, card);
});

// State filter/sort
let activeCategory = "all";
let searchQuery = "";
let sortMode = "default";

// Filter produk per kategori + pencarian + sorting
const filterButtons = document.querySelectorAll("[data-filter]");
const searchInput = document.querySelector("[data-search-input]");
const sortSelect = document.querySelector("[data-sort]");

const applyFiltersAndSort = () => {
  const filtered = products
    .filter((p) => {
      const categoryMatch =
        activeCategory === "all" || p.category === activeCategory;
      const searchMatch = !searchQuery || p.searchText.includes(searchQuery);
      return categoryMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortMode === "price-asc") return a.price - b.price;
      if (sortMode === "price-desc") return b.price - a.price;
      if (sortMode === "name-asc") return a.title.localeCompare(b.title);
      return 0;
    });

  products.forEach((p) => {
    const card = productMap.get(p.id);
    const matched = filtered.some((f) => f.id === p.id);
    card?.classList.toggle("hide", !matched);
  });

  // Reorder DOM sesuai hasil sorting yang terfilter
  if (productGrid) {
    filtered.forEach((p) => {
      const card = productMap.get(p.id);
      if (card) productGrid.appendChild(card);
    });
  }
};

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeCategory = btn.dataset.filter || "all";
    filterButtons.forEach((button) => {
      const isActive = button === btn;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    applyFiltersAndSort();
  });
});

searchInput?.addEventListener("input", (evt) => {
  searchQuery = evt.target.value.trim().toLowerCase();
  applyFiltersAndSort();
});

sortSelect?.addEventListener("change", (evt) => {
  sortMode = evt.target.value;
  applyFiltersAndSort();
});

// Link "Lihat semua" sebagai reset filter
const showAllLink = document.querySelector(".section-title .text-link");
if (showAllLink) {
  showAllLink.addEventListener("click", (evt) => {
    evt.preventDefault();
    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.click();
    if (searchInput) {
      searchInput.value = "";
      searchQuery = "";
    }
    if (sortSelect) {
      sortSelect.value = "default";
      sortMode = "default";
    }
    applyFiltersAndSort();
    const grid = document.querySelector(".products-grid");
    if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Util toast notification ringan
const toastContainer = document.createElement("div");
toastContainer.className = "toast-container";
document.body.appendChild(toastContainer);

const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
};

// Util format Rupiah
const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;

// State keranjang
const CART_KEY = "sparxparts_cart";
const PROMO_KEY = "sparxparts_promo";
let cart = [];
let activePromoCode = "";
let lastTotals = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  adminFee: 0,
  grand: 0,
};

const loadCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch {
    cart = [];
  }
};

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const savePromo = () => localStorage.setItem(PROMO_KEY, activePromoCode || "");
const loadPromo = () => {
  try {
    const stored = localStorage.getItem(PROMO_KEY);
    activePromoCode = stored || "";
    if (promoInput) promoInput.value = activePromoCode;
  } catch {
    activePromoCode = "";
  }
};

// Konfigurasi promo
const promoConfigs = {
  NGAWI: {
    label: "Diskon 10%",
    validate: (cart, subtotal) =>
      cart.length
        ? { valid: true }
        : { valid: false, reason: "Keranjang kosong" },
    discount: (subtotal, shipping) => 0.1 * subtotal,
  },
  FARISKEREN: {
    label: "Potongan ongkir 100k",
    validate: () => ({ valid: true }),
    discount: (subtotal, shipping) => Math.min(100000, subtotal + shipping),
  },
  OWIKUN: {
    label: "Diskon 50% maks 100k",
    validate: (cart, subtotal) =>
      cart.length
        ? { valid: true }
        : { valid: false, reason: "Keranjang kosong" },
    discount: (subtotal) => Math.min(subtotal * 0.5, 100000),
  },
  OWOKUN: {
    label: "Diskon 5% khusus GPU",
    validate: (cart) =>
      cart.some((item) => item.category === "gpu")
        ? { valid: true }
        : { valid: false, reason: "Harus ada produk kategori GPU" },
    discount: (subtotal) => 0.05 * subtotal,
  },
  HABIBDECUL: {
    label: "Potong 50k min 5jt",
    validate: (cart, subtotal) =>
      subtotal >= 5000000
        ? { valid: true }
        : { valid: false, reason: "Minimal belanja Rp 5.000.000" },
    discount: () => 50000,
  },
};

const calculateSubtotal = (cart) =>
  cart.reduce((acc, item) => acc + item.price * item.qty, 0);

const calculateShipping = (subtotal) => {
  if (subtotal <= 0) return 0;
  return subtotal >= 2000000 ? 0 : 25000;
};

const calculateFees = (subtotal, method) => {
  if (subtotal <= 0) return 0;
  if (method === "cod") return 10000;
  if (method === "kartu") return Math.round(subtotal * 0.02);
  if (method === "ewallet") return 5000;
  return 0;
};

const validatePromo = (code, cart, subtotal) => {
  const promo = promoConfigs[code];
  if (!promo) return { valid: false, reason: "Kode tidak dikenal" };
  return promo.validate(cart, subtotal);
};

const calculateDiscount = (code, cart, subtotal, shipping) => {
  const promo = promoConfigs[code];
  if (!promo) return 0;
  const discount = promo.discount(subtotal, shipping, cart);
  const cap = subtotal + shipping;
  return Math.min(discount, cap);
};

const calculateTotals = () => {
  const subtotal = calculateSubtotal(cart);
  const shipping = calculateShipping(subtotal);
  const method = paymentSelect?.value || "transfer";
  const adminFee = calculateFees(subtotal, method);

  let discount = 0;
  if (activePromoCode) {
    const validation = validatePromo(activePromoCode, cart, subtotal);
    if (validation.valid) {
      discount = calculateDiscount(activePromoCode, cart, subtotal, shipping);
      setPromoStatus(`Promo ${activePromoCode} diterapkan`, "success");
      promoRemoveBtn && (promoRemoveBtn.style.display = "inline-flex");
      if (promoInput) promoInput.value = activePromoCode;
    } else {
      activePromoCode = "";
      savePromo();
      setPromoStatus("Promo dibatalkan karena syarat tidak terpenuhi", "error");
      promoRemoveBtn && (promoRemoveBtn.style.display = "none");
      if (promoInput) promoInput.value = "";
      promoApplyBtn && (promoApplyBtn.disabled = true);
    }
  }

  const grand = Math.max(0, subtotal + shipping + adminFee - discount);
  lastTotals = { subtotal, discount, shipping, adminFee, grand };

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (discountEl) discountEl.textContent = `- ${formatCurrency(discount)}`;
  if (shippingEl) shippingEl.textContent = formatCurrency(shipping);
  if (adminEl) adminEl.textContent = formatCurrency(adminFee);
  if (grandEl) grandEl.textContent = formatCurrency(grand);
};

const resetPromoUI = () => {
  if (promoRemoveBtn)
    promoRemoveBtn.style.display = activePromoCode ? "inline-flex" : "none";
  if (promoApplyBtn) promoApplyBtn.disabled = !promoInput?.value.trim();
};

const setPromoStatus = (message, type) => {
  if (!promoStatusEl) return;
  promoStatusEl.textContent = message || "";
  promoStatusEl.classList.remove("success", "error");
  if (type) promoStatusEl.classList.add(type);
};

const applyPromo = () => {
  const code = promoInput?.value.trim().toUpperCase();
  if (!code) return;
  if (promoInput) promoInput.value = code;
  const subtotal = calculateSubtotal(cart);
  const validation = validatePromo(code, cart, subtotal);
  if (!validation.valid) {
    setPromoStatus(validation.reason || "Promo tidak valid", "error");
    activePromoCode = "";
    savePromo();
    promoRemoveBtn && (promoRemoveBtn.style.display = "none");
    calculateTotals();
    return;
  }
  activePromoCode = code;
  savePromo();
  promoRemoveBtn && (promoRemoveBtn.style.display = "inline-flex");
  setPromoStatus(`Promo ${code} diterapkan`, "success");
  calculateTotals();
};

const removePromo = (message) => {
  activePromoCode = "";
  savePromo();
  if (promoInput) promoInput.value = "";
  resetPromoUI();
  setPromoStatus(message || "Promo dihapus", "error");
  calculateTotals();
};

// Elemen UI keranjang
const cartPanel = document.querySelector("[data-cart-panel]");
const cartOverlay = document.querySelector("[data-cart-overlay]");
const cartToggle = document.querySelector("[data-cart-toggle]");
const cartClose = document.querySelector("[data-cart-close]");
const cartItemsEl = document.querySelector("[data-cart-items]");
const cartCountEl = document.querySelector("[data-cart-count]");
const checkoutBtn = document.querySelector("[data-checkout]");
const paymentSelect = document.querySelector("[data-payment]");
const cartSummary = document.querySelector(".cart-summary");
const checkoutError = document.createElement("div");
checkoutError.className = "form-error";
cartSummary?.appendChild(checkoutError);
const subtotalEl = document.querySelector("[data-cart-subtotal]");
const discountEl = document.querySelector("[data-cart-discount]");
const adminEl = document.querySelector("[data-cart-admin]");
const shippingEl = document.querySelector("[data-cart-shipping]");
const grandEl = document.querySelector("[data-cart-grand]");
const promoInput = document.querySelector("[data-promo-input]");
const promoApplyBtn = document.querySelector("[data-promo-apply]");
const promoRemoveBtn = document.querySelector("[data-promo-remove]");
const promoStatusEl = document.querySelector("[data-promo-status]");

const updateCartCount = () => {
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  if (cartCountEl) cartCountEl.textContent = count;
};

const renderCart = () => {
  if (!cartItemsEl) return;
  if (!cart.length) {
    cartItemsEl.innerHTML =
      '<p class="muted">Keranjang masih kosong. Tambahkan produk untuk checkout.</p>';
    updateCartCount();
    calculateTotals();
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(
      (item) => `<div class="cart-item" data-cart-item="${item.id}">
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
          <button class="icon-btn sm" data-cart-remove="${
            item.id
          }" aria-label="Hapus item">×</button>
        </div>
      </div>`
    )
    .join("");

  updateCartCount();
  calculateTotals();
};

const openCart = () => {
  cartPanel?.classList.add("open");
  cartOverlay?.classList.add("show");
  cartPanel?.setAttribute("aria-hidden", "false");
  cartToggle?.setAttribute("aria-expanded", "true");
};

const closeCart = () => {
  cartPanel?.classList.remove("open");
  cartOverlay?.classList.remove("show");
  cartPanel?.setAttribute("aria-hidden", "true");
  cartToggle?.setAttribute("aria-expanded", "false");
};

const addToCart = (id) => {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  const existing = cart.find((item) => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...product, qty: 1 });
  saveCart();
  renderCart();
  openCart();
  showToast(`${product.title} ditambahkan ke keranjang`);
};

const changeQty = (id, delta) => {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
};

const removeItem = (id) => {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
};

// Wiring tombol add to cart (tidak ubah HTML produk)
productCards.forEach((card) => {
  const btn = card.querySelector("[data-add-to-cart]");
  const id = card.dataset.productId;
  if (btn && id) {
    btn.addEventListener("click", () => addToCart(id));
  }
});

// Event keranjang
cartToggle?.addEventListener("click", () => {
  const isOpen = cartPanel?.classList.contains("open");
  isOpen ? closeCart() : openCart();
});
cartClose?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", closeCart);

cartItemsEl?.addEventListener("click", (evt) => {
  const decBtn = evt.target.closest("[data-cart-dec]");
  const incBtn = evt.target.closest("[data-cart-inc]");
  const rmBtn = evt.target.closest("[data-cart-remove]");
  if (decBtn) changeQty(decBtn.dataset.cartDec, -1);
  if (incBtn) changeQty(incBtn.dataset.cartInc, 1);
  if (rmBtn) removeItem(rmBtn.dataset.cartRemove);
});

checkoutBtn?.addEventListener("click", () => {
  checkoutError.textContent = "";
  if (!cart.length) {
    checkoutError.textContent = "Keranjang masih kosong.";
    showToast("Keranjang masih kosong.", "error");
    return;
  }
  calculateTotals();
  const { subtotal, discount, shipping, adminFee, grand } = lastTotals;
  const method = paymentSelect?.value || "transfer";
  if (!method) {
    checkoutError.textContent = "Pilih metode pembayaran.";
    showToast("Pilih metode pembayaran.", "error");
    return;
  }
  checkoutError.textContent = "";
  const promoText = activePromoCode ? activePromoCode : "Tidak ada";
  const summary = [
    `Subtotal: ${formatCurrency(subtotal)}`,
    `Diskon: - ${formatCurrency(discount)}`,
    `Ongkir: ${formatCurrency(shipping)}`,
    `Biaya admin (${method}): ${formatCurrency(adminFee)}`,
    `Total akhir: ${formatCurrency(grand)}`,
    `Promo: ${promoText}`,
  ].join("\n");
  showToast("Checkout siap, detail terkirim.", "success");
  alert(`Ringkasan checkout:\n${summary}`);
});

paymentSelect?.addEventListener("change", calculateTotals);

promoInput?.addEventListener("input", () => {
  if (promoApplyBtn) promoApplyBtn.disabled = !promoInput.value.trim();
});

promoInput?.addEventListener("keydown", (evt) => {
  if (evt.key === "Enter") {
    evt.preventDefault();
    applyPromo();
  }
});

promoApplyBtn?.addEventListener("click", applyPromo);
promoRemoveBtn?.addEventListener("click", () => removePromo("Promo dihapus"));

// Init cart + promo
loadCart();
loadPromo();
if (activePromoCode && promoRemoveBtn)
  promoRemoveBtn.style.display = "inline-flex";
resetPromoUI();
renderCart();

// Wishlist ringan (tersimpan di localStorage)
const WISHLIST_KEY = "sparxparts_wishlist";
let wishlist = new Set();

const loadWishlist = () => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    wishlist = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    wishlist = new Set();
  }
};

const saveWishlist = () =>
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));

const syncWishlistUI = () => {
  productCards.forEach((card) => {
    const id = card.dataset.productId;
    const btn = card.querySelector("[data-wishlist]");
    const active = id && wishlist.has(id);
    if (btn) {
      btn.classList.toggle("active", !!active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  });
};

productCards.forEach((card) => {
  const id = card.dataset.productId;
  const wishBtn = document.createElement("button");
  wishBtn.className = "wishlist-btn";
  wishBtn.type = "button";
  wishBtn.innerHTML = "❤";
  wishBtn.dataset.wishlist = id || "";
  wishBtn.setAttribute("aria-label", "Tambah ke wishlist");
  card.appendChild(wishBtn);
});

document.addEventListener("click", (evt) => {
  const wishBtn = evt.target.closest("[data-wishlist]");
  if (!wishBtn) return;
  const id = wishBtn.dataset.wishlist;
  if (!id) return;
  if (wishlist.has(id)) {
    wishlist.delete(id);
    showToast("Dihapus dari wishlist", "error");
  } else {
    wishlist.add(id);
    showToast("Ditambahkan ke wishlist");
  }
  saveWishlist();
  syncWishlistUI();
});

loadWishlist();
syncWishlistUI();
applyFiltersAndSort();
