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
  const label = themeButton.querySelector(".theme-label");
  if (label) {
    label.textContent = isDark ? "Light mode" : "Dark mode";
  } else {
    themeButton.textContent = isDark ? "Light mode" : "Dark mode";
  }
  const icon = themeButton.querySelector(".theme-icon");
  if (icon) icon.innerHTML = isDark ? NAV_ICONS.sun : NAV_ICONS.moon;
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

const APP_SHELL_PAGES = new Set(["dashboard.html", "find-students.html", "requests.html", "profile.html", "student-details.html", "admin.html"]);

const NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>',
  students: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.6-3 2.4-4.5 5.5-4.5s4.9 1.5 5.5 4.5"></path><path d="M16 5.5a3 3 0 0 1 0 5.8M16 14.5c2.6.2 4.1 1.7 4.5 4.5"></path></svg>',
  requests: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v10A1.5 1.5 0 0 1 19 17.5H9l-4.5 3v-3H5A1.5 1.5 0 0 1 3.5 16V6A1.5 1.5 0 0 1 5 4.5Z"></path><path d="M8 9h8M8 12.5h5"></path></svg>',
  profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.7-3.5 3-5.5 7-5.5s6.3 2 7 5.5"></path></svg>',
  admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 3v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"></path></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10"></path><path d="M14 8l4 4-4 4M18 12H8"></path></svg>'
};

function getCurrentPage() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf("/") + 1) || "index.html";
}

function getShellPageTitle(currentPage) {
  return {
    "dashboard.html": "Dashboard",
    "find-students.html": "Find Students",
    "requests.html": "Requests",
    "profile.html": "My Profile",
    "student-details.html": "Student Details",
    "admin.html": "Admin Dashboard"
  }[currentPage] || "SkillSwap Campus";
}

function shellNavLink(href, label, icon, currentPage, badgeId) {
  const active = href === currentPage || (currentPage === "student-details.html" && href === "find-students.html");
  return `<a href="${href}" class="shell-nav-link${active ? " active" : ""}"${active ? ' aria-current="page"' : ""}>
    <span class="shell-nav-icon">${icon}</span><span>${label}</span>
    ${badgeId ? `<span class="badge-counter shell-nav-badge" id="${badgeId}" style="display: none;"></span>` : ""}
  </a>`;
}

/**
 * Renders the public top navigation or the authenticated application shell.
 */
function renderNavbar() {
  const navContainer = document.getElementById("navbar-container");
  if (!navContainer) return;

  const currentUser = getCurrentUser();
  const currentPage = getCurrentPage();
  const isPublicAuthPage = currentPage === "login.html" || currentPage === "register.html";
  const isAppShell = Boolean(currentUser) && APP_SHELL_PAGES.has(currentPage);

  document.body.classList.toggle("app-shell-page", isAppShell);
  document.body.classList.toggle("public-page", !isAppShell);

  if (isAppShell) {
    const isAdmin = isAdminUser(currentUser);
    const firstName = String(currentUser.name || "Student").trim().split(/\s+/)[0] || "Student";
    const initial = firstName.charAt(0).toUpperCase() || "S";
    const links = isAdmin
      ? `${shellNavLink("admin.html", "Admin Dashboard", NAV_ICONS.admin, currentPage)}
         ${shellNavLink("admin.html#admin-students", "Student Directory", NAV_ICONS.students, currentPage)}
         ${shellNavLink("admin.html#admin-skills", "Skills Catalog", NAV_ICONS.dashboard, currentPage)}`
      : `${shellNavLink("dashboard.html", "Dashboard", NAV_ICONS.dashboard, currentPage)}
         ${shellNavLink("find-students.html", "Find Students", NAV_ICONS.students, currentPage)}
         ${shellNavLink("requests.html", "Requests", NAV_ICONS.requests, currentPage, "nav-pending-badge")}
         ${shellNavLink("profile.html", "My Profile", NAV_ICONS.profile, currentPage)}`;

    navContainer.innerHTML = `
      <aside class="app-sidebar" id="app-sidebar" aria-label="Primary navigation">
        <a href="${isAdmin ? "admin.html" : "dashboard.html"}" class="shell-brand">
          <span class="brand-logo-icon">SS</span>
          <span><strong>SkillSwap</strong><small>Campus</small></span>
        </a>
        <nav class="shell-nav">${links}</nav>
        <div class="shell-sidebar-bottom">
          <button type="button" id="btn-theme-toggle" class="shell-action-btn theme-toggle" aria-pressed="false">
            <span class="shell-nav-icon theme-icon">${NAV_ICONS.moon}</span><span class="theme-label">Dark mode</span>
          </button>
          <button type="button" id="btn-logout" class="shell-action-btn btn-logout">
            <span class="shell-nav-icon">${NAV_ICONS.logout}</span><span>Logout</span>
          </button>
        </div>
      </aside>
      <div class="shell-scrim" id="shell-scrim"></div>
      <div class="app-topbar">
        <div class="shell-topbar-left">
          <button type="button" class="shell-menu-toggle" id="nav-toggle" aria-label="Open navigation menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
          <h1 class="shell-page-title">${getShellPageTitle(currentPage)}</h1>
        </div>
        <div class="shell-topbar-actions">
          <form class="shell-search-form" id="shell-search-form" role="search">
            <label class="sr-only" for="shell-search-input">Search students</label>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg>
            <input id="shell-search-input" type="search" placeholder="Search students..." autocomplete="off">
          </form>
          <a href="${isAdmin ? "admin.html" : "profile.html"}" class="shell-user" aria-label="Open profile">
            <span class="user-avatar-small">${escapeHtml(initial)}</span>
            <span class="shell-user-name">${escapeHtml(firstName)}</span>
          </a>
        </div>
      </div>
    `;

    const themeButton = document.getElementById("btn-theme-toggle");
    updateThemeButton(document.body.dataset.theme || "light");
    themeButton?.addEventListener("click", toggleTheme);
    document.getElementById("nav-toggle")?.addEventListener("click", () => {
      const sidebar = document.getElementById("app-sidebar");
      const expanded = document.getElementById("nav-toggle").getAttribute("aria-expanded") === "true";
      document.getElementById("nav-toggle").setAttribute("aria-expanded", String(!expanded));
      sidebar?.classList.toggle("open", !expanded);
      document.getElementById("shell-scrim")?.classList.toggle("open", !expanded);
    });
    document.getElementById("shell-scrim")?.addEventListener("click", closeShellDrawer);
    document.getElementById("shell-search-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = document.getElementById("shell-search-input").value.trim();
      window.location.href = `find-students.html${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    });
    if (!isAdmin) refreshPendingCount(currentUser.id);
    return;
  }

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

  if (currentUser && !isAdminUser(currentUser)) refreshPendingCount(currentUser.id);
}

function closeShellDrawer() {
  document.getElementById("app-sidebar")?.classList.remove("open");
  document.getElementById("shell-scrim")?.classList.remove("open");
  document.getElementById("nav-toggle")?.setAttribute("aria-expanded", "false");
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

function showConfirmModal({ title = "Please confirm", message, confirmLabel = "Confirm" }) {
  return new Promise((resolve) => {
    const existing = document.getElementById("confirmation-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "confirmation-modal";
    modal.className = "modal-overlay active";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "confirmation-modal-title");
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title" id="confirmation-modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="modal-close" data-confirm-cancel aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body">${escapeHtml(message)}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-confirm-cancel>Cancel</button>
          <button type="button" class="btn btn-outline-danger" data-confirm-accept>${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    let settled = false;
    const handleKeydown = (event) => {
      if (event.key === "Escape") close(false);
    };
    const close = (confirmed) => {
      if (settled) return;
      settled = true;
      modal.remove();
      document.removeEventListener("keydown", handleKeydown);
      resolve(confirmed);
    };
    modal.querySelector("[data-confirm-accept]")?.addEventListener("click", () => close(true));
    modal.querySelectorAll("[data-confirm-cancel]").forEach((button) => button.addEventListener("click", () => close(false)));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close(false);
    });
    document.addEventListener("keydown", handleKeydown);
    modal.querySelector("[data-confirm-cancel]")?.focus();
  });
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