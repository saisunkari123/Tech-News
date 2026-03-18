/**
 * ============================================================
 * Sai Tech News - Live Application Logic (NewsAPI)
 * ------------------------------------------------------------
 * Architecture:
 *   - Fetches live Tech news via the official NewsAPI.org
 *   - Supports true global search across all news sources
 *   - Renders fully clickable anchor tags with real thumbnails
 *   - Asynchronous data flow with async/await + try/catch
 * ============================================================
 */
(function () {
  "use strict";

  // The API key is now safely loaded from config.js and ignored by Git
  const API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.API_KEY : "YOUR_API_KEY_HERE";

  // == DOM References ==========================================
  const newsGrid = document.getElementById("news-grid");
  const searchInput = document.getElementById("search-input");
  const resultsCount = document.getElementById("results-count");
  const navbar = document.querySelector(".navbar");

  // Keep track of timeout for search debouncing
  let searchTimeout = null;

  // == Data Fetching ===========================================

  /**
   * Fetches LIVE global tech news from NewsAPI.
   * If a query is provided, it searches all news.
   * If no query is provided, it fetches top US tech headlines.
   *
   * @param {string} query - Optional search term.
   * @returns {Promise<Array>} Array of normalized article objects.
   */
  async function fetchNews(query = "") {
    if (API_KEY === "YOUR_API_KEY_HERE") {
      throw new Error("MISSING_API_KEY");
    }

    let url = "";

    if (query) {
      // Global search for specific keywords (sorted by newest, English only)
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&apiKey=${API_KEY}`;
    } else {
      // Default home page: Top tech headlines
      url = `https://newsapi.org/v2/top-headlines?category=technology&language=en&apiKey=${API_KEY}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch from NewsAPI");
    }

    // Filter out articles that were removed or lack a valid URL
    const validArticles = data.articles.filter((article) => {
      return article.title !== "[Removed]" && article.url;
    });

    // We only need the first 12 articles for our grid layout
    return validArticles.slice(0, 12).map((article, index) => {
      return {
        id: index,
        title: article.title,
        description: article.description || "Read more about this story inside...",
        imageUrl: article.urlToImage || `https://placehold.co/600x340/1a73e8/ffffff?text=${encodeURIComponent(article.source.name || "News")}`,
        source: article.source.name || "News",
        publishedAt: article.publishedAt,
        url: article.url,
      };
    });
  }

  // == Rendering Helpers =======================================

  /**
   * Formats a date string into a human-friendly format.
   * e.g. "2026-03-18T14:32:00Z" -> "Mar 18, 2026"
   */
  function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  }

  /**
   * Generates the inner HTML for a single news card <a>.
   * Uses target="_blank" so clicks open the real article in a new tab.
   */
  function createCardHTML(article, index) {
    return `
      <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-card" style="animation-delay: ${index * 0.07}s" aria-label="${article.title}">
        <div class="news-card__image-wrapper">
          <img class="news-card__image" src="${article.imageUrl}" alt="${article.title}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x340/1a73e8/ffffff?text=${encodeURIComponent(article.source)}';" />
          <span class="news-card__source-badge">${article.source}</span>
        </div>
        <div class="news-card__body">
          <h3 class="news-card__title">${article.title}</h3>
          <p class="news-card__description">${article.description}</p>
          <div class="news-card__footer">
            <span class="news-card__date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(article.publishedAt)}
            </span>
            <span class="news-card__read-more">Read more &rarr;</span>
          </div>
        </div>
      </a>
    `;
  }

  /**
   * Renders an array of articles into the news grid.
   * Clears existing content first for an optimized re-render.
   *
   * @param {Array} articles - The array of normalized news objects.
   * @param {string} query - The search query term (if any).
   */
  function renderNews(articles, query) {
    // Update the results counter
    if (query) {
      resultsCount.textContent = `Search results for "${query}" (${articles.length})`;
    } else {
      resultsCount.textContent = "Top Technology Headlines";
    }

    // Handle empty results
    if (articles.length === 0) {
      newsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">&#128269;</div>
          <h3 class="empty-state__title">No articles found</h3>
          <p class="empty-state__text">We couldn't find any recent news matching your search. Try a different keyword.</p>
        </div>
      `;
      return;
    }

    // Build all cards as a single HTML string
    newsGrid.innerHTML = articles.map((article, index) => createCardHTML(article, index)).join("");
  }

  // == Loading State ===========================================

  /** Shows 6 skeleton placeholder cards while data loads. */
  function showLoading() {
    let skeletons = "";
    for (let i = 0; i < 6; i++) {
      skeletons += `
        <div class="skeleton-card">
          <div class="skeleton-card__image"></div>
          <div class="skeleton-card__body">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line--short"></div>
            <div class="skeleton-line skeleton-line--xs"></div>
          </div>
        </div>
      `;
    }
    newsGrid.innerHTML = skeletons;
    resultsCount.textContent = "Fetching live news...";
  }

  // == Error Handling UI =======================================

  /** Renders a user-friendly error message, including specific instructions for the missing API key. */
  function showError(message) {
    if (message === "MISSING_API_KEY") {
      newsGrid.innerHTML = `
        <div class="error-state" style="padding: 40px; text-align: left; background: #fff; border: 2px solid var(--color-primary); box-shadow: var(--shadow-lg);">
          <h2 style="color: var(--color-primary); font-size: 1.5rem; margin-bottom: 16px;">🔑 API Key Required</h2>
          <p style="margin-bottom: 12px; font-size: 1rem; color: #333;">The application is ready, but it needs an API key to fetch real-time global news images and search results.</p>
          <ol style="margin-bottom: 24px; padding-left: 20px; color: #555; line-height: 1.8;">
            <li>Go to <a href="https://newsapi.org/" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: bold;">newsapi.org</a> and click "Get API Key" (it's free).</li>
            <li>Copy the generated key.</li>
            <li>Rename <code>config.example.js</code> to <code>config.js</code> in your project.</li>
            <li>Paste the key into the <code><strong>API_KEY</strong></code> property in <code>config.js</code>.</li>
            <li>Save the file and click the reload button below.</li>
          </ol>
          <button class="error-state__retry" id="retry-btn">
            &#8635; Reload Application
          </button>
        </div>
      `;
    } else {
      newsGrid.innerHTML = `
        <div class="error-state">
          <div class="error-state__icon">&#9888;&#65039;</div>
          <h3 class="error-state__title">Something went wrong</h3>
          <p class="error-state__text">${message}</p>
          <button class="error-state__retry" id="retry-btn">
            &#8635; Try Again
          </button>
        </div>
      `;
    }

    resultsCount.textContent = "Setup Required";
    document.getElementById("retry-btn").addEventListener("click", () => loadNews());
  }

  // == Search / Filtering ======================================

  /**
   * Executes a LIVE global search against NewsAPI.
   * Implements debouncing (delays the API call until the user stops typing for 600ms)
   * to avoid hitting the API rate limit on every single keystroke.
   */
  function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();

    // Clear the previous timeout if the user is still typing
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Wait 600ms before firing the API request
    searchTimeout = setTimeout(() => {
      loadNews(query);
    }, 600);
  }

  // == Navbar Scroll Effect ====================================

  function handleNavbarScroll() {
    if (window.scrollY > 10) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  // == Orchestration ===========================================

  /**
   * Fetches and renders news for a given query (or top headlines if empty).
   */
  async function loadNews(query = "") {
    showLoading();
    try {
      const articles = await fetchNews(query);
      renderNews(articles, query);
    } catch (error) {
      console.error("NewsAPI Error:", error);
      showError(error.message);
    }
  }

  // == Event Listeners =========================================

  // Listen for typing events and debounce the live search
  searchInput.addEventListener("input", handleSearch);

  // Scroll effect on the navbar
  window.addEventListener("scroll", handleNavbarScroll, { passive: true });

  // Kick off the initial load (Top Tech Headlines)
  loadNews();

})();
