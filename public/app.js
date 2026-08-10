// Global Application State
let state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('aether_cart')) || [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  activeView: 'shop' // 'shop' or 'track'
};

// DOM Elements Cached
const DOM = {
  productsGrid: document.getElementById('productsGrid'),
  cartBadge: document.getElementById('cartBadge'),
  cartOverlay: document.getElementById('cartOverlay'),
  cartDrawer: document.getElementById('cartDrawer'),
  cartItemsContainer: document.getElementById('cartItemsContainer'),
  cartSubtotal: document.getElementById('cartSubtotal'),
  cartDeliveryCharge: document.getElementById('cartDeliveryCharge'),
  cartTotal: document.getElementById('cartTotal'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  
  announcementBar: document.getElementById('announcementBar'),
  announcementText: document.getElementById('announcementText'),
  
  cartShippingProgress: document.getElementById('cartShippingProgress'),
  shippingStatusText: document.getElementById('shippingStatusText'),
  shippingProgressBar: document.getElementById('shippingProgressBar'),
  
  checkoutModalOverlay: document.getElementById('checkoutModalOverlay'),
  checkoutModal: document.getElementById('checkoutModal'),
  checkoutForm: document.getElementById('checkoutForm'),
  checkoutSummaryItems: document.getElementById('checkoutSummaryItems'),
  checkoutSubtotal: document.getElementById('checkoutSubtotal'),
  checkoutDelivery: document.getElementById('checkoutDelivery'),
  checkoutTotal: document.getElementById('checkoutTotal'),
  
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  
  navShop: document.getElementById('navShop'),
  navTrack: document.getElementById('navTrack'),
  shopPage: document.getElementById('shopPage'),
  trackPage: document.getElementById('trackPage'),
  heroSection: document.getElementById('heroSection'),
  
  trackInput: document.getElementById('trackInput'),
  trackResult: document.getElementById('trackResult'),
  toastContainer: document.getElementById('toastContainer')
};

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  setupEventListeners();
  syncCartWithBackend();
});

// Event Listeners Registration
function setupEventListeners() {
  // Search keyup
  DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderProducts();
  });
}

// Fetch products from REST API
async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to load products');
    state.products = await response.json();
    renderProducts();
  } catch (error) {
    console.error('Error fetching products:', error);
    showToast('Failed to load products database.', 'error');
    DOM.productsGrid.innerHTML = `
      <div class="loading-state">
        <p style="color: #ef4444;">Could not load products. Please try again later.</p>
      </div>
    `;
  }
}

// Render Products Grid
function renderProducts() {
  // Filter products by category & search
  let filtered = [...state.products];
  
  if (state.activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === state.activeCategory);
  }
  
  if (state.searchQuery.trim() !== '') {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description.toLowerCase().includes(query)
    );
  }

  // Sort products
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  // Render cards
  if (filtered.length === 0) {
    DOM.productsGrid.innerHTML = `
      <div class="loading-state">
        <p>No products match your criteria.</p>
      </div>
    `;
    return;
  }

  DOM.productsGrid.innerHTML = filtered.map(product => {
    const specsHtml = product.features.map(spec => `<span class="spec-tag">${spec}</span>`).join('');
    
    return `
      <div class="product-card glass-panel">
        <div class="product-image-container">
          <img class="product-image" src="${product.image}" alt="${product.name}">
          <span class="category-badge">${product.category}</span>
        </div>
        <div class="product-info">
          <div class="product-rating">
            <i data-lucide="star" class="star-icon"></i>
            <span class="rating-val">${product.rating}</span>
            <span class="reviews-val">(${product.reviews} reviews)</span>
          </div>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-specs">
            ${specsHtml}
          </div>
          <div class="product-action-row">
            <div class="product-price">₹${product.price.toLocaleString('en-IN')}</div>
            <button class="btn-add-cart" onclick="addToCart('${product.id}')">
              <i data-lucide="shopping-cart"></i>
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Refresh icons
  if (window.refreshIcons) window.refreshIcons();
}

// Navigation Handler
function navigateTo(view) {
  state.activeView = view;
  
  if (view === 'shop') {
    DOM.navShop.classList.add('active');
    DOM.navTrack.classList.remove('active');
    DOM.shopPage.classList.add('active');
    DOM.trackPage.classList.remove('active');
    DOM.heroSection.style.display = 'block';
  } else if (view === 'track') {
    DOM.navShop.classList.remove('active');
    DOM.navTrack.classList.add('active');
    DOM.shopPage.classList.remove('active');
    DOM.trackPage.classList.add('active');
    DOM.heroSection.style.display = 'none';
  }
}

function scrollToCatalog() {
  const filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    window.scrollTo({
      top: filterBar.offsetTop - 120,
      behavior: 'smooth'
    });
  }
}

// Category Tabs Filter
function filterCategory(category, button) {
  state.activeCategory = category;
  
  // Update UI classes
  const buttons = document.querySelectorAll('.category-tabs .tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  
  renderProducts();
}

// Sort dropdown change handler
function handleSortChange() {
  state.sortBy = DOM.sortSelect.value;
  renderProducts();
}

// Cart Drawer Open/Close
function toggleCart(open) {
  if (open) {
    DOM.cartOverlay.classList.add('active');
    DOM.cartDrawer.classList.add('active');
  } else {
    DOM.cartOverlay.classList.remove('active');
    DOM.cartDrawer.classList.remove('active');
  }
}

// Add Item to Cart
function addToCart(productId) {
  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ id: productId, quantity: 1 });
  }
  
  localStorage.setItem('aether_cart', JSON.stringify(state.cart));
  syncCartWithBackend();
  showToast('Gear added to cart!');
  toggleCart(true);
}

// Update Cart Quantity
function updateQuantity(productId, delta) {
  const item = state.cart.find(item => item.id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter(i => i.id !== productId);
    }
    localStorage.setItem('aether_cart', JSON.stringify(state.cart));
    syncCartWithBackend();
  }
}

// Delete Item from Cart
function deleteCartItem(productId) {
  state.cart = state.cart.filter(i => i.id !== productId);
  localStorage.setItem('aether_cart', JSON.stringify(state.cart));
  syncCartWithBackend();
  showToast('Item removed from cart.');
}

// Synchronize Cart state with backend API calculations
async function syncCartWithBackend() {
  // Update badge count
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  DOM.cartBadge.textContent = totalCount;

  if (state.cart.length === 0) {
    DOM.cartItemsContainer.innerHTML = `
      <div class="loading-state">
        <i data-lucide="shopping-bag" style="width: 32px; height: 32px; opacity: 0.3; margin-bottom: 8px;"></i>
        <p>Your cart is empty. Fill it with premium desk setup pieces.</p>
      </div>
    `;
    DOM.cartSubtotal.textContent = '₹0';
    DOM.cartDeliveryCharge.textContent = '₹0';
    DOM.cartTotal.textContent = '₹0';
    DOM.checkoutBtn.disabled = true;
    
    // Update progress bar
    DOM.shippingStatusText.innerHTML = `🎉 Congratulations! You qualify for <strong>FREE Delivery</strong>!`;
    DOM.shippingProgressBar.style.width = '100%';
    DOM.cartShippingProgress.classList.add('free-shipping');
    
    // Reset announcement bar
    DOM.announcementText.textContent = "Get FREE Delivery on all orders!";
    if (window.refreshIcons) window.refreshIcons();
    return;
  }

  try {
    const response = await fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.cart })
    });

    if (!response.ok) throw new Error('API Cart calculation failed.');
    
    const calculations = await response.json();
    renderCartDrawerItems(calculations.items);
    updateCartTotalsUI(calculations);

  } catch (error) {
    console.error('Error syncing cart:', error);
    showToast('Failed to sync cart pricing with server API.', 'error');
  }
}

// Render Cart Drawer Items list
function renderCartDrawerItems(items) {
  DOM.cartItemsContainer.innerHTML = items.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
      </div>
      <div class="cart-item-controls">
        <div class="qty-control">
          <button class="btn-qty" onclick="updateQuantity('${item.id}', -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="btn-qty" onclick="updateQuantity('${item.id}', 1)">+</button>
        </div>
        <button class="btn-delete-item" onclick="deleteCartItem('${item.id}')" title="Remove item">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `).join('');

  if (window.refreshIcons) window.refreshIcons();
}

// Update Cart price tags and shipping progress bar
function updateCartTotalsUI(data) {
  DOM.cartSubtotal.textContent = `₹${data.subtotal.toLocaleString('en-IN')}`;
  
  if (data.deliveryCharge === 0) {
    DOM.cartDeliveryCharge.textContent = 'FREE';
    DOM.cartDeliveryCharge.classList.add('free');
  } else {
    DOM.cartDeliveryCharge.textContent = `₹${data.deliveryCharge.toLocaleString('en-IN')}`;
    DOM.cartDeliveryCharge.classList.remove('free');
  }

  DOM.cartTotal.textContent = `₹${data.total.toLocaleString('en-IN')}`;
  DOM.checkoutBtn.disabled = false;

  // Shipping is always free
  DOM.shippingProgressBar.style.width = '100%';
  DOM.shippingStatusText.innerHTML = `🎉 Congratulations! You qualify for <strong>FREE Delivery</strong>!`;
  DOM.cartShippingProgress.classList.add('free-shipping');
  DOM.announcementText.textContent = "Get FREE Delivery on all orders!";
}

// Checkout Flow
async function openCheckoutModal() {
  toggleCart(false);
  
  try {
    const response = await fetch('/api/cart/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.cart })
    });

    if (!response.ok) throw new Error('API calculate failed.');
    
    const data = await response.json();
    
    // Populate form order summary
    DOM.checkoutSummaryItems.innerHTML = data.items.map(item => `
      <div class="checkout-sum-item">
        <div class="checkout-sum-item-left">
          <span class="sum-item-name">${item.name}</span>
          <span class="sum-item-qty">Qty: ${item.quantity} x ₹${item.price.toLocaleString('en-IN')}</span>
        </div>
        <span class="sum-item-total">₹${item.itemTotal.toLocaleString('en-IN')}</span>
      </div>
    `).join('');

    DOM.checkoutSubtotal.textContent = `₹${data.subtotal.toLocaleString('en-IN')}`;
    if (data.deliveryCharge === 0) {
      DOM.checkoutDelivery.textContent = 'FREE';
      DOM.checkoutDelivery.classList.add('free');
    } else {
      DOM.checkoutDelivery.textContent = `₹${data.deliveryCharge.toLocaleString('en-IN')}`;
      DOM.checkoutDelivery.classList.remove('free');
    }
    DOM.checkoutTotal.textContent = `₹${data.total.toLocaleString('en-IN')}`;

    // Open Modal
    DOM.checkoutModalOverlay.classList.add('active');
    DOM.checkoutModal.classList.add('active');

  } catch (error) {
    console.error('Error fetching checkout data:', error);
    showToast('Failed to load checkout details.', 'error');
  }
}

function closeCheckoutModal() {
  DOM.checkoutModalOverlay.classList.remove('active');
  DOM.checkoutModal.classList.remove('active');
}

// Submit Order via REST API
async function handlePlaceOrder(event) {
  event.preventDefault();
  
  const customer = {
    name: document.getElementById('shippingName').value,
    email: document.getElementById('shippingEmail').value,
    phone: document.getElementById('shippingPhone').value,
    address: document.getElementById('shippingAddress').value
  };

  const payload = {
    customer,
    items: state.cart
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to place order');
    }

    const order = await response.json();
    
    // Success Actions
    showToast('Order confirmed successfully!', 'success');
    closeCheckoutModal();
    
    // Clear cart state
    state.cart = [];
    localStorage.removeItem('aether_cart');
    syncCartWithBackend();
    
    // Open order details page with order info
    DOM.trackInput.value = order.orderId;
    navigateTo('track');
    renderOrderDetails(order);

  } catch (error) {
    console.error('Error placing order:', error);
    showToast(error.message || 'Server error occurred during checkout.', 'error');
  }
}

// Track Order form submission
async function trackOrderSubmit() {
  const orderId = DOM.trackInput.value.trim();
  if (orderId === '') {
    showToast('Please enter a valid order ID.', 'error');
    return;
  }

  DOM.trackResult.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Locating order record...</p>
    </div>
  `;

  try {
    const response = await fetch(`/api/orders/${orderId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Order not found. Please double-check the Order ID.');
      }
      throw new Error('Server returned an error.');
    }
    const order = await response.json();
    renderOrderDetails(order);
  } catch (error) {
    console.error('Error tracking order:', error);
    showToast(error.message, 'error');
    DOM.trackResult.innerHTML = `
      <div class="track-placeholder" style="color: #ef4444;">
        <i data-lucide="alert-circle" class="placeholder-icon"></i>
        <p>${error.message}</p>
      </div>
    `;
    if (window.refreshIcons) window.refreshIcons();
  }
}

// Helper to determine status order indices
const statuses = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

// Render tracked order summary UI
function renderOrderDetails(order) {
  const activeIndex = statuses.indexOf(order.status) !== -1 ? statuses.indexOf(order.status) : 1;
  const progressPercent = (activeIndex / (statuses.length - 1)) * 100;

  // Build items html list
  const itemsHtml = order.items.map(item => `
    <div class="checkout-sum-item" style="padding: 6px 0;">
      <span>${item.name} <strong style="color: var(--text-muted);">x ${item.quantity}</strong></span>
      <span>₹${item.itemTotal.toLocaleString('en-IN')}</span>
    </div>
  `).join('');

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  DOM.trackResult.innerHTML = `
    <div class="track-result-header">
      <div>
        <p class="subtitle" style="margin-bottom: 4px;">ID: ${order.orderId}</p>
        <p style="font-size: 13px; color: var(--text-muted);">${formattedDate}</p>
      </div>
      <span class="status-badge ${order.status.toLowerCase() === 'delivered' ? 'delivered' : ''}">${order.status}</span>
    </div>

    <!-- Timeline Progress Bar -->
    <div class="track-timeline">
      <div class="track-timeline-progress" style="width: ${progressPercent}%"></div>
      
      <div class="timeline-step ${activeIndex >= 0 ? 'completed' : ''}">
        <div class="step-node">${activeIndex > 0 ? '✓' : '1'}</div>
        <div class="step-label">Placed</div>
      </div>
      <div class="timeline-step ${activeIndex >= 1 ? (activeIndex === 1 ? 'active' : 'completed') : ''}">
        <div class="step-node">${activeIndex > 1 ? '✓' : '2'}</div>
        <div class="step-label">Processing</div>
      </div>
      <div class="timeline-step ${activeIndex >= 2 ? (activeIndex === 2 ? 'active' : 'completed') : ''}">
        <div class="step-node">${activeIndex > 2 ? '✓' : '3'}</div>
        <div class="step-label">Shipped</div>
      </div>
      <div class="timeline-step ${activeIndex >= 3 ? (activeIndex === 3 ? 'active' : 'completed') : ''}">
        <div class="step-node">${activeIndex > 3 ? '✓' : '4'}</div>
        <div class="step-label">In Transit</div>
      </div>
      <div class="timeline-step ${activeIndex >= 4 ? 'completed' : ''}">
        <div class="step-node">✓</div>
        <div class="step-label">Delivered</div>
      </div>
    </div>

    <div class="track-order-summary">
      <div class="summary-title">Workspace Address details</div>
      <p style="font-size: 14px; margin-bottom: 2px;"><strong>${order.customer.name}</strong></p>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
        ${order.customer.address}<br>
        Phone: ${order.customer.phone} | Email: ${order.customer.email}
      </p>

      <div class="divider"></div>

      <div class="summary-title">Summary</div>
      <div class="summary-items-list" style="margin-bottom: 16px;">
        ${itemsHtml}
      </div>
      <div class="divider"></div>
      <div class="summary-line" style="margin-bottom: 8px;">
        <span>Subtotal</span>
        <span>₹${order.subtotal.toLocaleString('en-IN')}</span>
      </div>
      <div class="summary-line" style="margin-bottom: 8px;">
        <span>Delivery Charge</span>
        <span class="${order.deliveryCharge === 0 ? 'free' : ''}" style="color: ${order.deliveryCharge === 0 ? 'var(--accent)' : 'inherit'}">
          ${order.deliveryCharge === 0 ? 'FREE' : '₹' + order.deliveryCharge.toLocaleString('en-IN')}
        </span>
      </div>
      <div class="divider" style="margin: 10px 0;"></div>
      <div class="summary-line total-line" style="margin-bottom: 0;">
        <span>Total Paid</span>
        <span>₹${order.total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  `;

  if (window.refreshIcons) window.refreshIcons();
}

// Toast System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info'}"></i>
    <span>${message}</span>
  `;
  
  DOM.toastContainer.appendChild(toast);
  if (window.refreshIcons) window.refreshIcons();

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}
