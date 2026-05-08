// ─── State ────────────────────────────────────────────────
let topRecipes = [];       // top 50 from server
let displayedRecipes = []; // currently shown (top50 or search results)
let searchMode = false;
let sortBy = 'rating';
let searchTimer = null;

// ─── Price generator (deterministic from name) ──────────
function generatePrice(recipe) {
    // Use character codes for deterministic pseudo-random price
    const seed = (recipe.recipe_name || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const tiers = [15000, 18000, 20000, 22000, 25000, 28000, 30000, 35000, 38000, 42000, 45000, 50000];
    return tiers[seed % tiers.length];
}

function formatPrice(price) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(price);
}

// ─── Cuisine label ───────────────────────────────────────
function getCuisine(path) {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    return parts[0] || '';
}

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadTop50();

    // Search — debounced
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const val = searchInput.value.trim();
        document.getElementById('clearSearch').style.display = val ? 'flex' : 'none';
        searchTimer = setTimeout(() => handleSearch(val), 350);
    });
});

// ─── Load Top 50 ─────────────────────────────────────────
async function loadTop50() {
    showLoading(true);
    try {
        const res = await fetch('/api/recipes/top50');
        topRecipes = await res.json();
        displayedRecipes = [...topRecipes];
        searchMode = false;

        document.getElementById('heroTotal').innerText = '1090+';
        resetSectionHeader();
        renderCards(displayedRecipes);
    } catch {
        showLoading(false);
    }
    showLoading(false);
}

// ─── Handle Search ───────────────────────────────────────
async function handleSearch(query) {
    if (!query) {
        clearSearch();
        return;
    }

    showLoading(true);
    document.getElementById('searchBadge').style.display = 'none';

    try {
        const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`);
        const results = await res.json();

        searchMode = true;
        displayedRecipes = results;

        // Update section header
        document.getElementById('sectionTitle').innerHTML = `<i class="ri-search-2-line"></i> Search Results`;
        document.getElementById('sectionSubtitle').innerText = `Showing results for "${query}"`;

        // Show badge
        const badge = document.getElementById('searchBadge');
        badge.style.display = 'flex';
        document.getElementById('searchBadgeText').innerText =
            `Found ${results.length} recipe${results.length !== 1 ? 's' : ''} for "${query}"`;

        renderCards(results);
    } catch {
        showLoading(false);
    }
    showLoading(false);
}

// ─── Clear Search ─────────────────────────────────────────
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    document.getElementById('searchBadge').style.display = 'none';
    searchMode = false;
    displayedRecipes = [...topRecipes];
    resetSectionHeader();
    renderCards(displayedRecipes);
}

// ─── Sort ─────────────────────────────────────────────────
function handleSort() {
    sortBy = document.getElementById('sortSelect').value;
    let sorted = [...displayedRecipes];

    if (sortBy === 'rating') {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name') {
        sorted.sort((a, b) => (a.recipe_name || '').localeCompare(b.recipe_name || ''));
    } else if (sortBy === 'time') {
        // Sort by prep_time minutes (parse number from string like "25 mins")
        sorted.sort((a, b) => {
            const ta = parseInt(a.prep_time) || 999;
            const tb = parseInt(b.prep_time) || 999;
            return ta - tb;
        });
    }

    displayedRecipes = sorted;
    renderCards(displayedRecipes);
}

// ─── Render Cards ────────────────────────────────────────
function renderCards(recipes) {
    const grid = document.getElementById('cardsGrid');
    const noResults = document.getElementById('noResults');

    if (!recipes || recipes.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    grid.innerHTML = recipes.map((r, i) => {
        const price = generatePrice(r);
        const cuisine = getCuisine(r.cuisine_path);
        const rating = r.rating;
        const img = r.img_src || `https://via.placeholder.com/400x225/1f2937/4b5563?text=${encodeURIComponent(r.recipe_name || 'Recipe')}`;

        const ratingHtml = rating
            ? `<div class="card-rating"><i class="ri-star-fill"></i>${rating}</div>`
            : '';
        const cuisineHtml = cuisine
            ? `<div class="card-cuisine">${cuisine}</div>`
            : '';

        return `
        <div class="recipe-card" onclick="openDetail(${i})" style="animation-delay:${Math.min(i * 30, 300)}ms">
            <div class="card-img-wrap">
                <img src="${img}" alt="${r.recipe_name || ''}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x225/1f2937/4b5563?text=No+Image'">
                ${ratingHtml}
                ${cuisineHtml}
            </div>
            <div class="card-body">
                <h3 class="card-title">${r.recipe_name || 'Unknown Recipe'}</h3>
                <div class="card-meta">
                    ${r.total_time ? `<div class="card-meta-item"><i class="ri-time-line"></i>${r.total_time}</div>` : ''}
                    ${r.servings ? `<div class="card-meta-item"><i class="ri-group-line"></i>${r.servings} servings</div>` : ''}
                </div>
                <div class="card-footer">
                    <div class="card-price">
                        ${formatPrice(price)}
                        <span>per portion</span>
                    </div>
                    <button class="card-btn" onclick="event.stopPropagation(); openDetail(${i})">
                        <i class="ri-eye-line"></i> View
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── Detail Modal ─────────────────────────────────────────
function openDetail(idx) {
    const r = displayedRecipes[idx];
    if (!r) return;

    const price = generatePrice(r);
    const img = r.img_src || `https://via.placeholder.com/600x340/1f2937/4b5563?text=${encodeURIComponent(r.recipe_name || 'Recipe')}`;

    document.getElementById('detailImg').src = img;
    document.getElementById('detailName').innerText = r.recipe_name || 'Unknown Recipe';
    document.getElementById('detailPrice').innerText = formatPrice(price);

    // Rating
    const rEl = document.getElementById('detailRating');
    rEl.innerHTML = r.rating
        ? `<i class="ri-star-fill"></i> ${r.rating}`
        : `<i class="ri-star-line"></i> No rating`;

    // Chips
    const chips = [];
    if (r.prep_time) chips.push(`<div class="chip"><i class="ri-knife-line"></i> Prep: ${r.prep_time}</div>`);
    if (r.cook_time) chips.push(`<div class="chip"><i class="ri-fire-line"></i> Cook: ${r.cook_time}</div>`);
    if (r.total_time) chips.push(`<div class="chip"><i class="ri-time-line"></i> Total: ${r.total_time}</div>`);
    if (r.servings) chips.push(`<div class="chip"><i class="ri-group-line"></i> ${r.servings} servings</div>`);
    document.getElementById('detailChips').innerHTML = chips.join('');

    // URL
    const urlEl = document.getElementById('detailUrl');
    if (r.url) {
        urlEl.href = r.url;
        urlEl.style.display = 'flex';
    } else {
        urlEl.style.display = 'none';
    }

    // Info grid
    const cuisine = getCuisine(r.cuisine_path);
    const infos = [];
    if (cuisine) infos.push(['Cuisine', cuisine]);
    if (r['yield']) infos.push(['Yield', r['yield']]);
    if (r.rating) infos.push(['Rating', `<i class="ri-star-fill" style="color: var(--yellow)"></i> ${r.rating} / 5.0`]);
    infos.push(['Price', formatPrice(price)]);

    document.getElementById('detailInfoGrid').innerHTML = infos.map(([label, val]) => `
        <div class="detail-info-item">
            <label>${label}</label>
            <span>${val}</span>
        </div>`).join('');

    document.getElementById('detailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetail();
});

// ─── Helpers ──────────────────────────────────────────────
function showLoading(show) {
    document.getElementById('loadingWrap').style.display = show ? 'flex' : 'none';
    document.getElementById('cardsGrid').style.display = show ? 'none' : 'grid';
}

function resetSectionHeader() {
    document.getElementById('sectionTitle').innerHTML = `<i class="ri-star-fill" style="color: var(--yellow)"></i> Top 50 Best Recipes`;
    document.getElementById('sectionSubtitle').innerText = 'Sorted by highest rating — our most popular picks';
}
