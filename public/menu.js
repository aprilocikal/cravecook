// ─── State ────────────────────────────────────────────────
let topRecipes = []; // top 50 from server
let displayedRecipes = []; // currently shown (top50 or search results)
let searchMode = false;
let sortBy = "time";
let searchTimer = null;

// ─── Price generator (deterministic from name) ──────────
function generatePrice(recipe) {
  // Use character codes for deterministic pseudo-random price
  const seed = (recipe.recipeName || "x")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const tiers = [
    15000, 18000, 20000, 22000, 25000, 28000, 30000, 35000, 38000, 42000, 45000,
    50000,
  ];
  return tiers[seed % tiers.length];
}

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Cuisine label ───────────────────────────────────────
function getCuisine(path) {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  return parts[0] || "";
}

// ─── Init ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadTop50();

  // Search — debounced
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const val = searchInput.value.trim();
    document.getElementById("clearSearch").style.display = val
      ? "flex"
      : "none";
    searchTimer = setTimeout(() => handleSearch(val), 350);
  });
});

// ─── Load Top 50 ─────────────────────────────────────────
async function loadTop50() {
  showLoading(true);
  try {
    const res = await fetch("/api/recipes/top50");
    topRecipes = await res.json();
    displayedRecipes = [...topRecipes];
    searchMode = false;

    document.getElementById("heroTotal").innerText = "1090+";
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
  document.getElementById("searchBadge").style.display = "none";

  try {
    const res = await fetch(
      `/api/recipes/search?q=${encodeURIComponent(query)}`,
    );
    const results = await res.json();

    searchMode = true;
    displayedRecipes = results;

    // Update section header
    document.getElementById("sectionTitle").innerHTML =
      `<i class="ri-search-2-line"></i> Search Results`;
    document.getElementById("sectionSubtitle").innerText =
      `Showing results for "${query}"`;

    // Show badge
    const badge = document.getElementById("searchBadge");
    badge.style.display = "flex";
    document.getElementById("searchBadgeText").innerText =
      `Found ${results.length} recipe${results.length !== 1 ? "s" : ""} for "${query}"`;

    renderCards(results);
  } catch {
    showLoading(false);
  }
  showLoading(false);
}

// ─── Clear Search ─────────────────────────────────────────
function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("clearSearch").style.display = "none";
  document.getElementById("searchBadge").style.display = "none";
  searchMode = false;
  displayedRecipes = [...topRecipes];
  resetSectionHeader();
  renderCards(displayedRecipes);
}

// ─── Sort ─────────────────────────────────────────────────
function handleSort() {
  sortBy = document.getElementById("sortSelect").value;
  let sorted = [...displayedRecipes];

  if (sortBy === "rating") {
    sorted.sort((a, b) => (b.ratings?.ratingScore || 0) - (a.ratings?.ratingScore || 0));
  } else if (sortBy === "name") {
    sorted.sort((a, b) =>
      (a.recipeName || "").localeCompare(b.recipeName || ""),
    );
  } else if (sortBy === "time") {
    // Sort by totalTime (already parsed on server)
    sorted.sort(
      (a, b) => (a.times?.totalTime || 999999) - (b.times?.totalTime || 999999),
    );
  }

  displayedRecipes = sorted;
  renderCards(displayedRecipes);
}

// ─── Render Cards ────────────────────────────────────────
function renderCards(recipes) {
  const grid = document.getElementById("cardsGrid");
  const noResults = document.getElementById("noResults");

  if (!recipes || recipes.length === 0) {
    grid.innerHTML = "";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";

  grid.innerHTML = recipes
    .map((r, i) => {
      const price = generatePrice(r);
      const cuisine = getCuisine(r.cuisine_path);
      const rating = r.ratings?.ratingScore;
      const img =
        r.img_src ||
        `https://via.placeholder.com/400x225/1f2937/4b5563?text=${encodeURIComponent(r.recipeName || "Recipe")}`;

      const ratingHtml = rating
        ? `<div class="card-rating"><i class="ri-star-fill"></i>${rating}</div>`
        : "";
      const cuisineHtml = cuisine
        ? `<div class="card-cuisine">${cuisine}</div>`
        : "";

      return `
        <div class="recipe-card" onclick="openDetail(${i})" style="animation-delay:${Math.min(i * 30, 300)}ms">
            <div class="card-img-wrap">
                <img src="${img}" alt="${r.recipe_name || ""}" loading="lazy"
                     onerror="this.src='https://via.placeholder.com/400x225/1f2937/4b5563?text=No+Image'">
                ${ratingHtml}
                ${cuisineHtml}
            </div>
            <div class="card-body">
                <h3 class="card-title">${r.recipeName || "Unknown Recipe"}</h3>
                <div class="card-meta">
                    ${r.times?.totalTime ? `<div class="card-meta-item"><i class="ri-time-line"></i>${r.times.totalTime} mins</div>` : ""}
                    ${r.servings ? `<div class="card-meta-item"><i class="ri-group-line"></i>${r.servings} servings</div>` : ""}
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
    })
    .join("");
}

// ─── Detail Modal ─────────────────────────────────────────
function openDetail(idx) {
  const r = displayedRecipes[idx];
  if (!r) return;

  const price = generatePrice(r);
  const img =
    r.img_src ||
    `https://via.placeholder.com/600x340/1f2937/4b5563?text=${encodeURIComponent(r.recipe_name || "Recipe")}`;

  document.getElementById("detailImg").src = img;
  document.getElementById("detailName").innerText =
    r.recipeName || "Unknown Recipe";
  document.getElementById("detailPrice").innerText = formatPrice(price);

  // Rating
  const rEl = document.getElementById("detailRating");
  const score = r.ratings?.ratingScore;
  rEl.innerHTML = score
    ? `<i class="ri-star-fill"></i> ${score}`
    : `<i class="ri-star-line"></i> No rating`;

  // Chips
  const chips = [];
  if (r.times?.prepTime)
    chips.push(
      `<div class="chip"><i class="ri-knife-line"></i> Prep: ${r.times.prepTime}m</div>`,
    );
  if (r.times?.cookTime)
    chips.push(
      `<div class="chip"><i class="ri-fire-line"></i> Cook: ${r.times.cookTime}m</div>`,
    );
  if (r.times?.totalTime)
    chips.push(
      `<div class="chip"><i class="ri-time-line"></i> Total: ${r.times.totalTime}m</div>`,
    );
  if (r.servings)
    chips.push(
      `<div class="chip"><i class="ri-group-line"></i> ${r.servings} servings</div>`,
    );
  document.getElementById("detailChips").innerHTML = chips.join("");

  // URL
  const urlEl = document.getElementById("detailUrl");
  if (r.url) {
    urlEl.href = r.url;
    urlEl.style.display = "flex";
  } else {
    urlEl.style.display = "none";
  }

  // Info grid
  const cuisine = getCuisine(r.cuisine_path);
  const infos = [];
  if (cuisine) infos.push(["Cuisine", cuisine]);
  if (r["yield"]) infos.push(["Yield", r["yield"]]);
  const score2 = r.ratings?.ratingScore;
  if (score2)
    infos.push([
      "Rating",
      `<i class="ri-star-fill" style="color: var(--yellow)"></i> ${score2} / 5.0`,
    ]);
  infos.push(["Price", formatPrice(price)]);

  document.getElementById("detailInfoGrid").innerHTML = infos
    .map(
      ([label, val]) => `
        <div class="detail-info-item">
            <label>${label}</label>
            <span>${val}</span>
        </div>`,
    )
    .join("");

  // Reset ingredients & directions
  document.getElementById("ingredientsSection").style.display = "none";
  document.getElementById("directionsSection").style.display = "none";
  document.getElementById("detailExtraLoading").style.display = "flex";

  // Open modal
  document.getElementById("detailModal").classList.add("active");
  document.body.style.overflow = "hidden";

  // Fetch full recipe detail (includes ingredients & directions)
  if (r._id) {
    fetch(`/api/recipes/id/${r._id}`)
      .then((res) => res.json())
      .then((full) => {
        renderIngredients(full.ingredients);
        renderDirections(full.directions);
      })
      .catch(() => {
        // Try to use what we already have in the card data
        renderIngredients(r.ingredients);
        renderDirections(r.directions);
      })
      .finally(() => {
        document.getElementById("detailExtraLoading").style.display = "none";
      });
  } else {
    // No _id — use existing card data
    renderIngredients(r.ingredients);
    renderDirections(r.directions);
    document.getElementById("detailExtraLoading").style.display = "none";
  }
}

// ─── Parse ingredients (comma-separated string) ──────────
function parseIngredients(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {}
    // Ingredients in CSV are comma-separated
    return field
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// ─── Parse directions (newline-separated string) ──────────
function parseDirections(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {}
    // Directions in CSV are newline-separated
    return field
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// ─── Render Ingredients ───────────────────────────────────
function renderIngredients(raw) {
  const items = parseIngredients(raw);
  const section = document.getElementById("ingredientsSection");
  const list = document.getElementById("ingredientsList");
  const count = document.getElementById("ingredientsCount");

  if (!items.length) {
    section.style.display = "none";
    return;
  }

  count.innerText = `${items.length} items`;
  list.innerHTML = items
    .map(
      (item) =>
        `<li><i class="ri-checkbox-circle-line"></i><span>${item}</span></li>`,
    )
    .join("");
  section.style.display = "block";
}

// ─── Render Directions ────────────────────────────────────
function renderDirections(raw) {
  const steps = parseDirections(raw);
  const section = document.getElementById("directionsSection");
  const list = document.getElementById("directionsList");

  if (!steps.length) {
    section.style.display = "none";
    return;
  }

  list.innerHTML = steps
    .map(
      (step) =>
        `<li><div class="direction-step"><span>${step}</span></div></li>`,
    )
    .join("");
  section.style.display = "block";
}

function closeDetail() {
  document.getElementById("detailModal").classList.remove("active");
  document.body.style.overflow = "";
}

// Close on overlay click
document.addEventListener("click", (e) => {
  if (e.target.id === "detailModal") closeDetail();
});

// ─── Helpers ──────────────────────────────────────────────
function showLoading(show) {
  document.getElementById("loadingWrap").style.display = show ? "flex" : "none";
  document.getElementById("cardsGrid").style.display = show ? "none" : "grid";
}

function resetSectionHeader() {
  document.getElementById("sectionTitle").innerHTML =
    `<i class="ri-time-line" style="color: var(--blue)"></i> Quickest 50 Recipes`;
  document.getElementById("sectionSubtitle").innerText =
    "Sorted by fastest preparation time — perfect for busy days";
}
