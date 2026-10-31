/**
 * SkillSwap Campus - App Core Utilities
 * Common UI handlers, navigation rendering, and notification helpers.
 */

document.addEventListener("DOMContentLoaded", () => {
  if (!enforceRoleAccess()) return;
  applySavedTheme();
  renderNavbar();
  highlightActiveNavLink();
  initLogoutHandlers();
  colorizeAvatars();
  new MutationObserver(() => colorizeAvatars()).observe(document.body, { childList: true, subtree: true, characterData: true });
});

const THEME_KEY = "skillswap_theme";

/* Give each student avatar a stable colour derived from its initial. */
function colorizeAvatars(root) {
  (root || document).querySelectorAll(".student-avatar, .profile-avatar-large, .user-avatar-small").forEach((el) => {
    const letter = (el.textContent || "").trim().charAt(0).toUpperCase();
    if (!letter || el.getAttribute("data-hued") === letter) return;
    el.style.setProperty("--h", String(Math.round(((letter.charCodeAt(0) - 65) * 137.5 % 360 + 360) % 360)));
    el.setAttribute("data-hued", letter);
  });
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.body.dataset.theme = savedTheme;
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  updateThemeButton(nextTheme);
}

function updateThemeButton(theme) {
  const themeButton = document.getElementById("btn-theme-toggle");
  if (!themeButton) return;
  const isDark = theme === "dark";
  themeButton.textContent = isDark ? "Light mode" : "Dark mode";
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.setAttribute("title", `Switch to ${isDark ? "light" : "dark"} mode`);
}

function enforceRoleAccess() {
  const currentUser = getCurrentUser();
  if (!currentUser) return true;

  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf("/") + 1) || "index.html";
  const adminPages = new Set(["admin.html"]);
  const studentPages = new Set(["dashboard.html", "find-students.html", "profile.html", "requests.html", "student-details.html"]);

  if (isAdminUser(currentUser) && studentPages.has(currentPage)) {
    window.location.replace("admin.html");
    return false;
  }

  if (!isAdminUser(currentUser) && adminPages.has(currentPage)) {
    window.location.replace("dashboard.html");
    return false;
  }

  return true;
}

/**
 * Renders the top navigation bar dynamically across all pages.
 */
function renderNavbar() {
  const navContainer = document.getElementById("navbar-container");
  if (!navContainer) return;

  const currentUser = getCurrentUser();

  // Get current page filename
  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf("/") + 1) || "index.html";
  const isPublicAuthPage = currentPage === "login.html" || currentPage === "register.html";

  // Build navigation links
  let navLinksHtml = "";

  if (currentUser && !isPublicAuthPage) {
    const isAdmin = isAdminUser(currentUser);
    const navigationLinks = isAdmin
      ? `<li class="nav-item">
          <a href="admin.html" class="nav-link ${currentPage === 'admin.html' ? 'active' : ''}">Admin Dashboard</a>
        </li>`
      : `<li class="nav-item">
          <a href="dashboard.html" class="nav-link ${currentPage === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
        </li>
        <li class="nav-item">
          <a href="find-students.html" class="nav-link ${currentPage === 'find-students.html' ? 'active' : ''}">Find Students</a>
        </li>
        <li class="nav-item">
          <a href="profile.html" class="nav-link ${currentPage === 'profile.html' ? 'active' : ''}">My Profile</a>
        </li>
        <li class="nav-item">
          <a href="requests.html" class="nav-link ${currentPage === 'requests.html' ? 'active' : ''}">
            Requests
            <span class="badge-counter" id="nav-pending-badge" style="display: none;"></span>
          </a>
        </li>`;

    navLinksHtml = `
      <ul class="nav-menu">
        ${navigationLinks}
        <li class="nav-item">
          <button type="button" id="btn-logout" class="btn-text btn-sm btn-logout" title="Log out of session">Logout</button>
        </li>
      </ul>
    `;
  } else {
    const authPageLink = currentPage === "login.html"
      ? `<a href="register.html" class="btn btn-primary btn-sm">Register</a>`
      : `<a href="login.html" class="btn btn-primary btn-sm">Login</a>`;

    navLinksHtml = isPublicAuthPage ? `
      <ul class="nav-menu">
        <li class="nav-item">${authPageLink}</li>
        <li class="nav-item">
          <button type="button" id="btn-theme-toggle" class="btn-text theme-toggle" aria-pressed="false">Dark mode</button>
        </li>
      </ul>
    ` : `
      <ul class="nav-menu">
        <li class="nav-item">
          <a href="index.html" class="nav-link ${currentPage === 'index.html' ? 'active' : ''}">Home</a>
        </li>
        <li class="nav-item">
          <a href="login.html" class="nav-link ${currentPage === 'login.html' ? 'active' : ''}">Login</a>
        </li>
        <li class="nav-item">
          <a href="register.html" class="btn btn-primary btn-sm">Register</a>
        </li>
        <li class="nav-item">
          <button type="button" id="btn-theme-toggle" class="btn-text theme-toggle" aria-pressed="false">Dark mode</button>
        </li>
      </ul>
    `;
  }

  navContainer.innerHTML = `
    <nav class="navbar" aria-label="Main Navigation">
      <div class="nav-brand">
        <a href="${currentUser && !isPublicAuthPage ? 'dashboard.html' : 'index.html'}" class="brand-link">
          <span class="brand-logo-icon">SS</span>
          <span class="brand-title">SkillSwap <span class="brand-subtitle">Campus</span></span>
        </a>
      </div>
      <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
        <span class="toggle-bar"></span>
        <span class="toggle-bar"></span>
        <span class="toggle-bar"></span>
      </button>
      <div class="nav-collapse" id="nav-collapse">
        ${navLinksHtml}
      </div>
    </nav>
  `;

  // Toggle mobile menu
  const toggleBtn = document.getElementById("nav-toggle");
  const collapseMenu = document.getElementById("nav-collapse");
  if (toggleBtn && collapseMenu) {
    toggleBtn.addEventListener("click", () => {
      const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
      toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
      collapseMenu.classList.toggle("open");
    });
  }

  const themeButton = document.getElementById("btn-theme-toggle");
  if (themeButton) {
    updateThemeButton(document.body.dataset.theme || "light");
    themeButton.addEventListener("click", toggleTheme);
  }

  initProfileMenuHandlers();
  if (currentUser && !isAdminUser(currentUser)) refreshPendingCount(currentUser.id);
}

async function refreshPendingCount(userId) {
  try {
    const requests = await getRequests(userId);
    const count = requests.filter((request) => request.status === "PENDING" && request.receiverId === userId).length;
    const badge = document.getElementById("nav-pending-badge");
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? "inline-flex" : "none";
    }
  } catch {
    // Page-specific API calls display errors where the data is required.
  }
}

function initProfileMenuHandlers() {
  if (window.profileMenuEventsReady) return;
  window.profileMenuEventsReady = true;

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("#dashboard-user-trigger");
    const dropdown = document.getElementById("dashboard-user-dropdown");
    const profileMenu = document.querySelector(".dashboard-profile-menu");
    if (!dropdown || !profileMenu) return;

    if (trigger) {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      dropdown.classList.toggle("open", !isOpen);
      return;
    }

    if (!event.target.closest(".dashboard-profile-menu")) {
      dropdown.classList.remove("open");
      document.getElementById("dashboard-user-trigger")?.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dropdown = document.getElementById("dashboard-user-dropdown");
    const trigger = document.getElementById("dashboard-user-trigger");
    if (!dropdown?.classList.contains("open")) return;
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    trigger?.focus();
  });
}

/**
 * Handle active navigation highlighting
 */
function highlightActiveNavLink() {
  const path = window.location.pathname;
  const currentPage = path.substring(path.lastIndexOf("/") + 1) || "index.html";
  const links = document.querySelectorAll(".nav-link");
  links.forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}

/**
 * Setup logout click event
 */
function initLogoutHandlers() {
  document.addEventListener("click", (e) => {
    if (e.target && (e.target.id === "btn-logout" || e.target.classList.contains("btn-logout"))) {
      e.preventDefault();
      logoutUser();
      showToast("Logged out successfully.", "info");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
    }
  });
}

/**
 * Display toast notification
 */
function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Close message">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Close on button click
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    toast.remove();
  });

  // Auto-remove after 3.5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-fadeout");
      setTimeout(() => toast.remove(), 300);
    }
  }, 3500);
}

/**
 * Helper to escape HTML and prevent basic injection
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Display successful connection popup with mini scheduling UI
 */
function showConnectionSuccessModal({ peerName, onSchedule }) {
  const existing = document.getElementById("connection-success-modal");
  if (existing) existing.remove();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "connection-success-modal";
  modalOverlay.className = "modal-overlay active";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");
  modalOverlay.setAttribute("aria-labelledby", "conn-modal-title");

  modalOverlay.innerHTML = `
    <div class="modal-box" style="max-width: 480px;">
      <div class="modal-header">
        <h3 class="modal-title" id="conn-modal-title">Connection successful!</h3>
        <button type="button" class="modal-close" id="btn-close-conn-modal" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body" style="text-align: center; padding: 24px 20px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--color-success-bg); color: var(--color-success); font-size: 28px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;">&check;</div>
        <p style="font-size: 16px; margin-bottom: 6px;">You are now connected with <strong>${escapeHtml(peerName || "your peer")}</strong>.</p>
        <p style="font-size: 13px; color: var(--color-text-muted); margin-bottom: 20px;">You can now collaborate and exchange knowledge together.</p>

        <div id="conn-cta-view">
          <button type="button" class="btn btn-primary btn-block" id="btn-start-schedule-meet" style="padding: 10px 16px; font-size: 15px;">Schedule a Meet</button>
          <button type="button" class="btn-text btn-sm" id="btn-skip-cta" style="margin-top: 12px; color: var(--color-text-muted);">Skip for now</button>
        </div>

        <form id="conn-schedule-form" style="display: none; text-align: left; margin-top: 10px; border-top: 1px solid var(--color-border); padding-top: 18px;">
          <h4 style="font-size: 15px; font-weight: 600; margin-bottom: 14px;">Schedule a Meet</h4>
          
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="meet-date" class="form-label">Recommended date</label>
            <input type="date" id="meet-date" class="form-input" value="${tomorrowStr}" required min="${new Date().toISOString().split("T")[0]}">
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label for="meet-time" class="form-label">Time</label>
            <input type="time" id="meet-time" class="form-input" value="10:00" required>
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label for="meet-platform" class="form-label">Communication platform</label>
            <select id="meet-platform" class="form-select" required>
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom</option>
              <option value="Microsoft Teams">Microsoft Teams</option>
              <option value="In-person">In-person</option>
            </select>
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="btn-skip-schedule">Skip for now</button>
            <button type="submit" class="btn btn-primary" id="btn-confirm-schedule">Schedule</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const close = () => {
    modalOverlay.remove();
  };

  modalOverlay.querySelector("#btn-close-conn-modal")?.addEventListener("click", close);
  modalOverlay.querySelector("#btn-skip-cta")?.addEventListener("click", close);
  modalOverlay.querySelector("#btn-skip-schedule")?.addEventListener("click", close);

  const ctaView = modalOverlay.querySelector("#conn-cta-view");
  const scheduleForm = modalOverlay.querySelector("#conn-schedule-form");
  const startBtn = modalOverlay.querySelector("#btn-start-schedule-meet");

  startBtn?.addEventListener("click", () => {
    ctaView.style.display = "none";
    scheduleForm.style.display = "block";
  });

  scheduleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = modalOverlay.querySelector("#meet-date").value;
    const time = modalOverlay.querySelector("#meet-time").value;
    const platform = modalOverlay.querySelector("#meet-platform").value;

    close();
    showToast(`Meet scheduled with ${escapeHtml(peerName || "peer")} on ${date} at ${time} via ${platform}!`, "success");
    if (typeof onSchedule === "function") {
      onSchedule({ date, time, platform });
    }
  });
}



/**
 * Resolve the id of a user-typed skill: reuse an existing catalog entry (case-insensitive) or create it.
 */
async function resolveCustomSkillId(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Please enter a skill name.");
  const existing = (await getSkills()).find((skill) => skill.skillName.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing.id;
  return (await createSkill(trimmed)).id;
}