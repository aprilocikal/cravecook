// ─── State ───────────────────────────────────────────────
let allRecipes = [];
let filteredRecipes = [];
let currentPage = 1;
const PER_PAGE = 15;

// ─── Init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  fetchRecipes();

  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentPage = 1;
    filterAndRender();
  });

  document
    .getElementById("recipeForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const mode = document.getElementById("formMode").value;
      const originalName = document.getElementById("originalName").value;

      const data = {
        recipe_name: document.getElementById("recipe_name").value,
        prep_time: document.getElementById("prep_time").value,
        cook_time: document.getElementById("cook_time").value,
        total_time: document.getElementById("total_time").value,
        servings: document.getElementById("servings").value,
        rating: parseFloat(document.getElementById("rating").value) || null,
        img_src: document.getElementById("img_src").value || null,
        yield: document.getElementById("f_yield").value || null,
        url: document.getElementById("f_url").value || null,
        cuisine_path: document.getElementById("cuisine_path").value || null,
        ingredients: document.getElementById("ingredients").value || null,
        directions: document.getElementById("directions").value || null,
      };

      try {
        if (mode === "add") {
          await fetch("/api/recipes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          showToast("Recipe added successfully!");
        } else {
          const id = document.getElementById("originalName").value;
          await fetch(`/api/recipes/id/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          showToast("Recipe updated successfully!");
        }
        closeModal();
        fetchRecipes();
      } catch (err) {
        showToast("Something went wrong!", true);
      }
    });
});

// ─── Fetch ────────────────────────────────────────────────
async function fetchRecipes() {
  try {
    const res = await fetch("/api/recipes");
    allRecipes = await res.json();

    // Update stats
    document.getElementById("totalCount").innerText = allRecipes.length;
    document.getElementById("sidebarCount").innerText = allRecipes.length;

    const withImg = allRecipes.filter((r) => r.img_src).length;
    document.getElementById("withImages").innerText = withImg;

    const ratings = allRecipes.filter((r) => r.rating).map((r) => r.rating);
    const avg = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "—";
    document.getElementById("avgRating").innerText = avg;

    filterAndRender();
  } catch (err) {
    document.getElementById("tableBody").innerHTML = `
            <tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--danger)">
                Failed to fetch data. Make sure server is running.
            </td></tr>`;
  }
}

// ─── Filter & Render ──────────────────────────────────────
function filterAndRender() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const minRating =
    parseFloat(document.getElementById("filterRating").value) || 0;

  filteredRecipes = allRecipes.filter((r) => {
    const matchName = (r.recipe_name || "").toLowerCase().includes(query);
    const matchRating = !minRating || (r.rating && r.rating >= minRating);
    return matchName && matchRating;
  });

  document.getElementById("tableCount").innerText =
    `${filteredRecipes.length} recipes`;
  renderTable();
  renderPagination();
}

// ─── Table ────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const start = (currentPage - 1) * PER_PAGE;
  const pageData = filteredRecipes.slice(start, start + PER_PAGE);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted)">No recipes found.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageData
    .map((r, idx) => {
      const globalIdx = start + idx + 1;
      // Use the global index in filteredRecipes so we can look up the object safely
      const filteredIdx = start + idx;
      const rating = r.rating;
      let ratingBadge = "";
      if (!rating) {
        ratingBadge = `<span class="rating-badge none">N/A</span>`;
      } else if (rating >= 4.5) {
        ratingBadge = `<span class="rating-badge high"><i class="ri-star-fill"></i> ${rating}</span>`;
      } else if (rating >= 3.5) {
        ratingBadge = `<span class="rating-badge mid"><i class="ri-star-half-fill"></i> ${rating}</span>`;
      } else {
        ratingBadge = `<span class="rating-badge low"><i class="ri-star-line"></i> ${rating}</span>`;
      }

      return `
        <tr>
            <td class="td-num">${globalIdx}</td>
            <td class="td-name">${r.recipe_name || "—"}</td>
            <td class="td-time">${r.prep_time || "—"}</td>
            <td class="td-time">${r.cook_time || "—"}</td>
            <td class="td-time">${r.total_time || "—"}</td>
            <td class="td-serving">${r.servings || "—"}</td>
            <td>${ratingBadge}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon-sm edit" data-idx="${filteredIdx}" title="Edit">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn-icon-sm delete" data-idx="${filteredIdx}" title="Delete">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    })
    .join("");

  // Attach event listeners after rendering — avoids all HTML-escaping issues
  tbody.querySelectorAll(".btn-icon-sm.edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      openModal("edit", filteredRecipes[idx]);
    });
  });

  tbody.querySelectorAll(".btn-icon-sm.delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      deleteRecipe(filteredRecipes[idx].recipe_name);
    });
  });
}

// ─── Pagination ───────────────────────────────────────────
function renderPagination() {
  const total = Math.ceil(filteredRecipes.length / PER_PAGE);
  const pg = document.getElementById("pagination");
  if (total <= 1) {
    pg.innerHTML = "";
    return;
  }

  let html = "";

  // Prev
  html += `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3"' : ""}>
        <i class="ri-arrow-left-s-line"></i></button>`;

  // Pages
  const pages = getPageNumbers(currentPage, total);
  pages.forEach((p) => {
    if (p === "...") {
      html += `<button class="page-btn dots">···</button>`;
    } else {
      html += `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goPage(${p})">${p}</button>`;
    }
  });

  // Next
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === total ? 'disabled style="opacity:0.3"' : ""}>
        <i class="ri-arrow-right-s-line"></i></button>`;

  pg.innerHTML = html;
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function goPage(page) {
  const total = Math.ceil(filteredRecipes.length / PER_PAGE);
  if (page < 1 || page > total) return;
  currentPage = page;
  renderTable();
  renderPagination();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Modal ────────────────────────────────────────────────
const ALL_FIELDS = [
  "recipe_name", "prep_time", "cook_time", "total_time",
  "servings", "rating", "img_src",
];
const TEXTAREA_FIELDS = ["ingredients", "directions"];
const TEXT_FIELDS_MAP = {
  f_yield: "yield",
  f_url: "url",
  cuisine_path: "cuisine_path",
};

function openModal(mode, recipeObj = null) {
  const modal = document.getElementById("formModal");
  document.getElementById("formMode").value = mode;

  if (mode === "add") {
    document.getElementById("modalTitle").innerText = "Add New Recipe";
    document.getElementById("modalSubtitle").innerText = "Fill in the recipe details below";
    ALL_FIELDS.forEach((id) => (document.getElementById(id).value = ""));
    TEXTAREA_FIELDS.forEach((id) => (document.getElementById(id).value = ""));
    Object.keys(TEXT_FIELDS_MAP).forEach((id) => (document.getElementById(id).value = ""));
    document.getElementById("recipe_name").readOnly = false;
    document.getElementById("originalName").value = "";
    previewImg("");
  } else {
    document.getElementById("modalTitle").innerText = "Edit Recipe";
    document.getElementById("modalSubtitle").innerText = "Update the recipe details below";

    // Standard fields
    ALL_FIELDS.forEach((id) => (document.getElementById(id).value = recipeObj[id] ?? ""));

    // Textarea fields (ingredients: join with comma, directions: join with newline)
    const ing = Array.isArray(recipeObj.ingredients)
      ? recipeObj.ingredients.join(", ")
      : (recipeObj.ingredients || "");
    const dir = Array.isArray(recipeObj.directions)
      ? recipeObj.directions.join("\n")
      : (recipeObj.directions || "");
    document.getElementById("ingredients").value = ing;
    document.getElementById("directions").value = dir;

    // Mapped text fields
    Object.entries(TEXT_FIELDS_MAP).forEach(([elemId, dataKey]) => {
      document.getElementById(elemId).value = recipeObj[dataKey] ?? "";
    });

    document.getElementById("originalName").value = recipeObj._id || recipeObj.recipe_name;
    document.getElementById("recipe_name").readOnly = false;
    previewImg(recipeObj.img_src || "");
  }

  modal.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeModal() {
  document.getElementById("formModal").classList.remove("active");
  document.body.classList.remove("modal-open");
}

// ─── Image Preview ─────────────────────────────────────────
function previewImg(url) {
  const wrap = document.getElementById("imgPreviewWrap");
  const img = document.getElementById("imgPreview");
  if (url) {
    img.src = url;
    wrap.style.display = "block";
  } else {
    wrap.style.display = "none";
    img.src = "";
  }
}

// ─── View Switcher ────────────────────────────────────────
function showView(view) {
  const recipesView = document.getElementById("recipesView");
  const analyticsView = document.getElementById("analyticsView");

  // Desktop Nav
  const navRecipes = document.getElementById("nav-recipes");
  const navAnalytics = document.getElementById("nav-analytics");

  // Mobile Nav
  const mobRecipes = document.getElementById("mob-nav-recipes");
  const mobAnalytics = document.getElementById("mob-nav-analytics");

  if (view === "recipes") {
    recipesView.style.display = "flex";
    analyticsView.style.display = "none";

    if (navRecipes) navRecipes.classList.add("active");
    if (navAnalytics) navAnalytics.classList.remove("active");
    if (mobRecipes) mobRecipes.classList.add("active");
    if (mobAnalytics) mobAnalytics.classList.remove("active");
  } else {
    recipesView.style.display = "none";
    analyticsView.style.display = "flex";

    if (navRecipes) navRecipes.classList.remove("active");
    if (navAnalytics) navAnalytics.classList.add("active");
    if (mobRecipes) mobRecipes.classList.remove("active");
    if (mobAnalytics) mobAnalytics.classList.add("active");

    loadAnalytics();
  }
}

// ─── Analytics ─────────────────────────────────────────────
async function loadAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();

    // Stat cards
    document.getElementById("aAvg").innerText = data.avgResult.avg
      ? data.avgResult.avg.toFixed(2)
      : "—";
    document.getElementById("aMax").innerText = data.avgResult.max || "—";
    document.getElementById("aCat").innerText = data.cuisines.length;
    document.getElementById("aTop").innerText = data.topRated.length;

    // Rating Distribution chart
    const rMax = Math.max(...data.ratingDist.map((r) => r.count));
    const labels = {
      1: "1–2",
      2: "2–3",
      3: "3–4",
      4: "4–4.5",
      4.5: "4.5–5",
      5: "5.0",
    };
    const colors = ["cyan", "yellow", "yellow", "green", "green", "green"];
    document.getElementById("ratingChart").innerHTML = data.ratingDist
      .map(
        (r, i) => `
            <div class="bar-row">
                <span class="bar-label">${labels[r._id] || r._id}</span>
                <div class="bar-track"><div class="bar-fill ${colors[i] || "primary"}" style="width:${Math.round((r.count / rMax) * 100)}%"></div></div>
                <span class="bar-count">${r.count}</span>
            </div>`,
      )
      .join("");

    // Cuisine chart
    const cMax = data.cuisines[0]?.count || 1;
    document.getElementById("cuisineChart").innerHTML = data.cuisines
      .map(
        (c, i) => `
            <div class="bar-row">
                <span class="bar-label wide">${c._id}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.round((c.count / cMax) * 100)}%;background:hsl(${210 + i * 15},80%,50%)"></div></div>
                <span class="bar-count">${c.count}</span>
            </div>`,
      )
      .join("");

    // Servings chart
    const sMax = Math.max(...data.servings.map((s) => s.count));
    const sLabels = {
      1: "1–4",
      5: "5–9",
      10: "10–19",
      20: "20–49",
      50: "50–99",
      "100+": "100+",
    };
    document.getElementById("servingsChart").innerHTML = data.servings
      .map(
        (s) => `
            <div class="bar-row">
                <span class="bar-label">${sLabels[s._id] || s._id}</span>
                <div class="bar-track"><div class="bar-fill cyan" style="width:${Math.round((s.count / sMax) * 100)}%"></div></div>
                <span class="bar-count">${s.count}</span>
            </div>`,
      )
      .join("");

    // Top rated list
    document.getElementById("topRatedList").innerHTML = data.topRated.length
      ? data.topRated
          .map(
            (r, i) => `
                <div class="top-item">
                    <span class="top-rank">#${i + 1}</span>
                    <span class="top-name">${r.recipe_name}</span>
                    <span class="top-badge"><i class="ri-star-fill" style="color: var(--yellow)"></i> ${r.rating}</span>
                </div>`,
          )
          .join("")
      : '<p style="color:var(--text-muted);font-size:.85rem">No perfect-rated recipes found.</p>';
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

// ─── Delete ───────────────────────────────────────────────
async function deleteRecipe(name) {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: `You want to delete "${name}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#dc2626",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    try {
      await fetch(`/api/recipes/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      showToast("Recipe deleted successfully!");
      fetchRecipes();
    } catch {
      showToast("Failed to delete recipe!", true);
    }
  }
}

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  Toast.fire({
    icon: isError ? "error" : "success",
    title: msg,
  });
}
