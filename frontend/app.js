// Products - loaded from backend API
let products = [];

// Auth helpers
function getToken() { return localStorage.getItem('tazajmart_token'); }
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('tazajmart_user')); } catch { return null; }
}

// Fetch products from API
async function fetchProducts(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const res = await fetch(`/api/products?${queryString}`);
        products = await res.json();
    } catch (err) {
        console.warn('API unavailable, using empty list:', err);
        products = [];
    }
}

// App State
const state = {
    cart: {}, // id -> quantity
    wishlist: new Set(),
    filters: {
        category: 'all',
        searchQuery: '',
        sortBy: 'default'
    },
    promoApplied: false,
    promoDiscount: 0.10, // 10% discount
    freeShippingThreshold: 200.00,
    shippingCost: 5.00
};

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartTrigger = document.getElementById('cart-trigger');
const cartOverlay = document.getElementById('cart-overlay');
const cartDrawer = document.getElementById('cart-drawer');
const closeCartBtn = document.getElementById('close-cart-btn');
const closeCartInlineBtn = document.querySelector('.close-drawer-btn-inline');
const cartEmptyState = document.getElementById('cart-empty-state');
const cartItemsList = document.getElementById('cart-items-list');
const cartDrawerFooter = document.getElementById('cart-drawer-footer');
const cartSubtotal = document.getElementById('cart-subtotal');
const cartDiscount = document.getElementById('cart-discount');
const discountRow = document.getElementById('discount-row');
const cartDelivery = document.getElementById('cart-delivery');
const cartTotal = document.getElementById('cart-total');
const cartBadge = document.getElementById('cart-badge');
const cartItemsCount = document.getElementById('cart-items-count');
const cartTotalDisplay = document.querySelector('.cart-total-display');
const wishlistBadge = document.getElementById('wishlist-badge');
const deliveryProgress = document.getElementById('delivery-progress-bar');
const deliveryProgressContainer = document.getElementById('delivery-progress-container');
const deliveryNeededAmount = document.getElementById('delivery-needed-amount');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const filterPills = document.querySelectorAll('.filter-pill');
const sortSelect = document.getElementById('sort-select');
const activeFiltersInfo = document.getElementById('active-filters-info');
const resultsCount = document.getElementById('results-count');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const promoInput = document.getElementById('cart-promo-input');
const applyPromoBtn = document.getElementById('apply-promo-btn');
const toastContainer = document.getElementById('toast-container');
const navDropdownLinks = document.querySelectorAll('.dropdown-content a');

// Checkout DOM Elements
const checkoutTrigger = document.getElementById('checkout-trigger');
const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
const closeCheckoutModalBtn = document.getElementById('close-checkout-modal');
const checkoutStep1 = document.getElementById('checkout-step-1');
const checkoutStep2 = document.getElementById('checkout-step-2');
const checkoutStep3 = document.getElementById('checkout-step-3');
const stepBtn1 = document.getElementById('step-btn-1');
const stepBtn2 = document.getElementById('step-btn-2');
const stepBtn3 = document.getElementById('step-btn-3');
const deliveryForm = document.getElementById('delivery-form');
const paymentForm = document.getElementById('payment-form');
const backToAddressBtn = document.getElementById('back-to-address-btn');
const paymentMethodCards = document.querySelectorAll('.payment-method-card');
const cardFieldsContainer = document.getElementById('card-fields-container');
const placeOrderBtn = document.getElementById('place-order-btn');
const successOrderId = document.getElementById('success-order-id');
const successOrderTotal = document.getElementById('success-order-total');
const closeSuccessBtn = document.getElementById('close-success-btn');

// Initialize App
async function init() {
    updateHeaderUserUI();
    await fetchProducts();
    renderProducts();
    setupEventListeners();
    updateCartUI();
}

// Update header to show user name / login button
function updateHeaderUserUI() {
    const user = getCurrentUser();
    const userProfileEl = document.querySelector('.user-profile');
    if (!userProfileEl) return;
    if (user) {
        userProfileEl.innerHTML = `
            <span class="username" style="color:var(--primary);font-weight:600;">${user.name.split(' ')[0]}</span>
            ${user.role === 'admin' ? `<a href="admin.html" style="font-size:0.75rem;background:rgba(34,197,94,0.15);color:var(--primary);padding:4px 10px;border-radius:20px;text-decoration:none;font-weight:600;">Admin</a>` : ''}
            <button onclick="logoutUser()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;padding:4px 12px;border-radius:20px;font-size:0.78rem;cursor:pointer;font-family:inherit;font-weight:600;">Logout</button>
        `;
    } else {
        userProfileEl.innerHTML = `
            <a href="login.html" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:8px 16px;border-radius:20px;text-decoration:none;font-weight:600;font-size:0.85rem;">Sign In</a>
        `;
    }
}

function logoutUser() {
    localStorage.removeItem('tazajmart_token');
    localStorage.removeItem('tazajmart_user');
    updateHeaderUserUI();
    showToast('Logged out successfully', 'log-out');
}

// Render Products Grid
function renderProducts() {
    // Apply filters
    let filtered = products.filter(product => {
        const matchesCategory = state.filters.category === 'all' || product.category === state.filters.category;
        const matchesSearch = product.name.toLowerCase().includes(state.filters.searchQuery.toLowerCase()) ||
                              product.category.toLowerCase().includes(state.filters.searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Apply sorting
    if (state.filters.sortBy === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (state.filters.sortBy === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (state.filters.sortBy === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    }

    // Update Filter Stats
    if (state.filters.category !== 'all' || state.filters.searchQuery !== '') {
        activeFiltersInfo.style.display = 'flex';
        resultsCount.textContent = `${filtered.length} products found`;
    } else {
        activeFiltersInfo.style.display = 'none';
    }

    // Render HTML
    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">No Products Found</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Try adjusting your search keywords or filter category.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    productGrid.innerHTML = filtered.map(product => {
        const pid = product._id || product.id;
        const inCartQty = state.cart[pid] || 0;
        const isWishlisted = state.wishlist.has(pid);

        return `
            <div class="product-card" data-id="${pid}">
                ${product.badge ? `<span class="card-badge ${product.badgeClass}">${product.badge}</span>` : ''}
                <button class="card-wishlist ${isWishlisted ? 'active' : ''}" data-id="${pid}">
                    <i data-lucide="heart" ${isWishlisted ? 'style="fill: #ef4444; color: #ef4444;"' : ''}></i>
                </button>
                <div class="card-image-area">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="card-meta">${product.weight}</div>
                <h3 class="card-title">${product.name}</h3>
                <div class="card-rating">
                    <i data-lucide="star"></i>
                    <span>${product.rating.toFixed(1)}</span>
                    <span class="card-rating-count">(${product.ratingCount})</span>
                </div>
                <div class="card-bottom-row">
                    <div class="card-price">
                        <span class="price-current">$${product.price.toFixed(2)}</span>
                    </div>
                    <div class="card-action-wrapper">
                        ${inCartQty > 0 ? `
                            <div class="qty-adjuster-inline">
                                <button class="btn-qty-dec" data-id="${pid}">-</button>
                                <span>${inCartQty}</span>
                                <button class="btn-qty-inc" data-id="${pid}">+</button>
                            </div>
                        ` : `
                            <button class="add-to-cart-circle-btn btn-add-cart" data-id="${pid}">
                                <i data-lucide="plus"></i>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Toast Notifications
function showToast(message, iconName = 'check-circle') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
        <div class="toast-message">${message}</div>
    `;
    toastContainer.appendChild(toast);
    lucide.createIcons();

    // Trigger sliding animation
    setTimeout(() => toast.classList.add('show'), 50);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update Cart State and UI
function updateCartUI() {
    const cartIds = Object.keys(state.cart);
    const totalItems = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);

    // Update Headers badges
    cartBadge.textContent = totalItems;
    cartItemsCount.textContent = totalItems;
    
    if (totalItems === 0) {
        cartEmptyState.style.display = 'flex';
        cartItemsList.style.display = 'none';
        cartDrawerFooter.style.display = 'none';
        cartTotalDisplay.textContent = "$0.00";
        return;
    }

    cartEmptyState.style.display = 'none';
    cartItemsList.style.display = 'block';
    cartDrawerFooter.style.display = 'block';

    // Build Cart Items List
    let subtotal = 0;
    cartItemsList.innerHTML = cartIds.map(id => {
        const product = products.find(p => (p._id || p.id) == id);
        if (!product) return '';
        const qty = state.cart[id];
        const pid = product._id || product.id;
        const itemTotal = product.price * qty;
        subtotal += itemTotal;

        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${product.name}</h4>
                    <div class="cart-item-weight">${product.weight}</div>
                    <div class="cart-item-price-qty">
                        <span class="cart-item-price">$${product.price.toFixed(2)}</span>
                        <div class="qty-selector">
                            <button class="btn-cart-qty-dec" data-id="${pid}">-</button>
                            <span>${qty}</span>
                            <button class="btn-cart-qty-inc" data-id="${pid}">+</button>
                        </div>
                    </div>
                </div>
                <button class="cart-item-remove" data-id="${pid}">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
    }).join('');

    lucide.createIcons();

    // Discount Calculation
    let discount = 0;
    if (state.promoApplied) {
        discount = subtotal * state.promoDiscount;
        discountRow.style.display = 'flex';
        cartDiscount.textContent = `-$${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }

    // Delivery Fee logic
    const netAmount = subtotal - discount;
    let deliveryFee = state.shippingCost;
    
    if (netAmount >= state.freeShippingThreshold) {
        deliveryFee = 0;
        cartDelivery.textContent = "FREE";
        cartDelivery.style.color = "var(--primary)";
        cartDelivery.style.fontWeight = "700";
        deliveryProgressContainer.style.display = 'none';
    } else {
        cartDelivery.textContent = `$${deliveryFee.toFixed(2)}`;
        cartDelivery.style.color = "var(--text-main)";
        cartDelivery.style.fontWeight = "500";
        deliveryProgressContainer.style.display = 'block';

        // Shipping Progress update
        const needed = state.freeShippingThreshold - netAmount;
        deliveryNeededAmount.textContent = `$${needed.toFixed(2)}`;
        const percentage = Math.min((netAmount / state.freeShippingThreshold) * 100, 100);
        deliveryProgress.style.width = `${percentage}%`;
    }

    // Update Totals
    const finalTotal = netAmount + deliveryFee;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTotal.textContent = `$${finalTotal.toFixed(2)}`;
    cartTotalDisplay.textContent = `$${finalTotal.toFixed(2)}`;
    placeOrderBtn.textContent = `Place Order ($${finalTotal.toFixed(2)})`;
}

// Add/Remove from Cart Actions
function changeQuantity(id, change) {
    const currentQty = state.cart[id] || 0;
    const newQty = currentQty + change;

    if (newQty <= 0) {
        delete state.cart[id];
        showToast("Item removed from your basket", "trash");
    } else {
        state.cart[id] = newQty;
        if (change > 0) {
            showToast("Added to basket");
        }
    }

    updateCartUI();
    renderProducts();
}

// Event Listeners Setup
function setupEventListeners() {
    // Open/Close Cart Drawer
    cartTrigger.addEventListener('click', () => {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('open');
    });

    closeCartBtn.addEventListener('click', () => {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
    });

    cartOverlay.addEventListener('click', () => {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
    });

    closeCartInlineBtn.addEventListener('click', () => {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
    });

    // Product Grid clicks (Add to cart, qty adjustments, wishlist)
    productGrid.addEventListener('click', (e) => {
        const btnAdd = e.target.closest('.btn-add-cart');
        const btnQtyInc = e.target.closest('.btn-qty-inc');
        const btnQtyDec = e.target.closest('.btn-qty-dec');
        const btnWish = e.target.closest('.card-wishlist');

        if (btnAdd) {
            const id = parseInt(btnAdd.dataset.id);
            changeQuantity(id, 1);
        } else if (btnQtyInc) {
            const id = parseInt(btnQtyInc.dataset.id);
            changeQuantity(id, 1);
        } else if (btnQtyDec) {
            const id = parseInt(btnQtyDec.dataset.id);
            changeQuantity(id, -1);
        } else if (btnWish) {
            const id = parseInt(btnWish.dataset.id);
            if (state.wishlist.has(id)) {
                state.wishlist.delete(id);
                btnWish.classList.remove('active');
                btnWish.querySelector('i').style.fill = 'none';
                btnWish.querySelector('i').style.color = 'var(--text-muted)';
                showToast("Removed from wishlist", "heart");
            } else {
                state.wishlist.add(id);
                btnWish.classList.add('active');
                btnWish.querySelector('i').style.fill = '#ef4444';
                btnWish.querySelector('i').style.color = '#ef4444';
                showToast("Added to wishlist", "heart");
            }
            wishlistBadge.textContent = state.wishlist.size;
        }
    });

    // Cart Drawer clicks (adjust Qty, Remove)
    cartItemsList.addEventListener('click', (e) => {
        const btnInc = e.target.closest('.btn-cart-qty-inc');
        const btnDec = e.target.closest('.btn-cart-qty-dec');
        const btnRemove = e.target.closest('.cart-item-remove');

        if (btnInc) {
            const id = parseInt(btnInc.dataset.id);
            changeQuantity(id, 1);
        } else if (btnDec) {
            const id = parseInt(btnDec.dataset.id);
            changeQuantity(id, -1);
        } else if (btnRemove) {
            const id = parseInt(btnRemove.dataset.id);
            changeQuantity(id, -state.cart[id]); // Remove all
        }
    });

    // Promo Code Application
    applyPromoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        if (code === 'TAZAJ10') {
            if (state.promoApplied) {
                showToast("Promo code already applied!", "info");
                return;
            }
            state.promoApplied = true;
            showToast("Coupon 'TAZAJ10' applied! 10% discount on order.", "gift");
            updateCartUI();
        } else {
            showToast("Invalid Promo Code", "x-circle");
        }
    });

    // Search Operations
    const handleSearch = () => {
        state.filters.searchQuery = searchInput.value.trim();
        renderProducts();
    };

    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Sorting select changes
    sortSelect.addEventListener('change', (e) => {
        state.filters.sortBy = e.target.value;
        renderProducts();
    });

    // Filter pills (Category)
    filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.filters.category = pill.dataset.filter;
            renderProducts();
        });
    });

    // Dropdown Categories Select
    navDropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const cat = link.dataset.category;
            // Activate corresponding pill
            filterPills.forEach(pill => {
                if (pill.dataset.filter === cat) {
                    pill.click();
                }
            });
            // Scroll to catalog section
            document.querySelector('.catalog-section').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Clear Filters Action
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.filters.searchQuery = '';
        state.filters.category = 'all';
        filterPills.forEach(p => p.classList.remove('active'));
        filterPills[0].classList.add('active');
        renderProducts();
    });

    // Checkout Drawer trigger
    checkoutTrigger.addEventListener('click', () => {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('open');
        checkoutModalOverlay.classList.add('open');
        setCheckoutStep(1);
    });

    closeCheckoutModalBtn.addEventListener('click', () => {
        checkoutModalOverlay.classList.remove('open');
    });

    checkoutModalOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutModalOverlay) {
            checkoutModalOverlay.classList.remove('open');
        }
    });

    // Checkout step navigation logic
    function setCheckoutStep(stepNumber) {
        checkoutStep1.style.display = 'none';
        checkoutStep2.style.display = 'none';
        checkoutStep3.style.display = 'none';
        stepBtn1.classList.remove('active');
        stepBtn2.classList.remove('active');
        stepBtn3.classList.remove('active');

        if (stepNumber === 1) {
            checkoutStep1.style.display = 'block';
            stepBtn1.classList.add('active');
        } else if (stepNumber === 2) {
            checkoutStep2.style.display = 'block';
            stepBtn2.classList.add('active');
        } else if (stepNumber === 3) {
            checkoutStep3.style.display = 'block';
            stepBtn3.classList.add('active');
        }
    }

    deliveryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        setCheckoutStep(2);
    });

    backToAddressBtn.addEventListener('click', () => {
        setCheckoutStep(1);
    });

    // Payment Methods toggler
    paymentMethodCards.forEach(card => {
        card.addEventListener('click', () => {
            paymentMethodCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;

            // Hide/Show Card fields
            if (radio.value === 'card') {
                cardFieldsContainer.style.display = 'block';
                document.querySelectorAll('#card-fields-container input').forEach(input => input.required = true);
            } else {
                cardFieldsContainer.style.display = 'none';
                document.querySelectorAll('#card-fields-container input').forEach(input => input.required = false);
            }
        });
    });

    // Place Order submission
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Placing Order...';

        // Build cart items payload
        const cartItems = Object.keys(state.cart).map(id => {
            const product = products.find(p => p._id == id || p.id == id);
            return {
                productId: product._id || product.id,
                name: product.name,
                price: product.price,
                quantity: state.cart[id],
                image: product.image
            };
        });

        const subtotalVal = parseFloat(cartSubtotal.textContent.replace('$','')) || 0;
        const totalVal = parseFloat(cartTotal.textContent.replace('$','')) || 0;
        const discountVal = state.promoApplied ? subtotalVal * state.promoDiscount : 0;
        const deliveryVal = totalVal - subtotalVal + discountVal;
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'cod';
        const user = getCurrentUser();

        const orderPayload = {
            customerName: document.getElementById('cust-name').value,
            customerEmail: user ? user.email : '',
            address: document.getElementById('cust-address').value,
            city: document.getElementById('cust-city').value,
            zip: document.getElementById('cust-zip').value,
            phone: document.getElementById('cust-phone').value,
            items: cartItems,
            subtotal: subtotalVal,
            discount: discountVal,
            deliveryFee: deliveryVal < 0 ? 0 : deliveryVal,
            total: totalVal,
            paymentMethod,
            promoApplied: state.promoApplied,
            userId: user ? user.id : null
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            successOrderId.textContent = '#' + data.orderId;
            successOrderTotal.textContent = cartTotal.textContent;
            setCheckoutStep(3);

            // Clear Cart
            state.cart = {};
            state.promoApplied = false;
            promoInput.value = '';
            updateCartUI();
            renderProducts();
            showToast('Order placed successfully! 📦', 'check-circle');
        } catch (err) {
            showToast('Order failed: ' + err.message, 'x-circle');
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = `Place Order (${cartTotal.textContent})`;
        }
    });

    closeSuccessBtn.addEventListener('click', () => {
        checkoutModalOverlay.classList.remove('open');
    });

    // Card Input Auto Formatting
    const cardNum = document.getElementById('card-num');
    const cardExpiry = document.getElementById('card-expiry');

    cardNum.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        let formatted = val.match(/.{1,4}/g);
        e.target.value = formatted ? formatted.join(' ') : '';
    });

    cardExpiry.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) {
            e.target.value = val.substring(0, 2) + '/' + val.substring(2, 4);
        } else {
            e.target.value = val;
        }
    });

    // Shop now banner click
    document.getElementById('hero-shop-now').addEventListener('click', () => {
        document.querySelector('.catalog-section').scrollIntoView({ behavior: 'smooth' });
    });
}

// Start Application
document.addEventListener('DOMContentLoaded', init);
