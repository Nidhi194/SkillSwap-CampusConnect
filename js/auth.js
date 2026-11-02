/**
 * SkillSwap Campus - Authentication Logic
 * Handles login, registration, and session storage using the backend REST API.
 */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Already signed in: skip the auth pages.
  const existingUser = getCurrentUser();
  if (existingUser && (loginForm || registerForm)) {
    window.location.replace(isAdminUser(existingUser) ? "admin.html" : "dashboard.html");
    return;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }

  initPasswordToggles();
});

function initPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "Hide" : "Show";
      button.setAttribute("aria-pressed", String(isPassword));
    });
  });
}

/**
 * Handle student login submission
 */
async function handleLoginSubmit(e) {
  e.preventDefault();

  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const errorBox = document.getElementById("login-error");
  const submitButton = loginFormButton(e.currentTarget);

  // Reset errors
  hideError(errorBox);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Simple Frontend Validation
  if (!email) {
    showError(errorBox, "Please enter your campus email address.");
    emailInput.focus();
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorBox, "Please provide a valid email address (e.g., name@university.edu).");
    emailInput.focus();
    return;
  }

  if (!password) {
    showError(errorBox, "Please enter your password.");
    passwordInput.focus();
    return;
  }

  setFormLoading(submitButton, true, "Signing in...");
  try {
    const user = await loginUser(email, password);
    showToast(`Welcome back, ${user.name}!`, "success");
    setTimeout(() => {
      window.location.href = isAdminUser(user) ? "admin.html" : "dashboard.html";
    }, 600);
  } catch (error) {
    setFormLoading(submitButton, false, "Sign In");
    showError(errorBox, error.message);
  }
}

/**
 * Handle student registration submission
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("reg-name");
  const emailInput = document.getElementById("reg-email");
  const passwordInput = document.getElementById("reg-password");
  const departmentSelect = document.getElementById("reg-department");
  const yearSelect = document.getElementById("reg-year");
  const errorBox = document.getElementById("reg-error");
  const submitButton = loginFormButton(e.currentTarget);

  // Reset errors
  hideError(errorBox);

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const department = departmentSelect.value;
  const year = yearSelect.value;

  // Validation
  if (!name || name.length < 2) {
    showError(errorBox, "Please enter your full name (minimum 2 characters).");
    nameInput.focus();
    return;
  }

  if (!email || !isValidEmail(email)) {
    showError(errorBox, "Please enter a valid campus email address.");
    emailInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    showError(errorBox, "Password must be at least 6 characters long.");
    passwordInput.focus();
    return;
  }

  if (!department) {
    showError(errorBox, "Please select your academic department.");
    departmentSelect.focus();
    return;
  }

  if (!year) {
    showError(errorBox, "Please select your current year of study.");
    yearSelect.focus();
    return;
  }

  setFormLoading(submitButton, true, "Creating profile...");
  try {
    await registerUser({ name, email, password, department, year: Number(year.replace(/\D/g, "")) });
    const user = await loginUser(email, password);
    showToast("Registration successful! Add your skills from the dashboard.", "success");
    setTimeout(() => {
      window.location.href = isAdminUser(user) ? "admin.html" : "dashboard.html";
    }, 600);
  } catch (error) {
    setFormLoading(submitButton, false, "Complete Registration");
    showError(errorBox, error.message);
  }
}

function loginFormButton(form) {
  return form ? form.querySelector('button[type="submit"]') : null;
}

function setFormLoading(button, isLoading, label) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) button.textContent = label;
}

/**
 * Validate email format with standard regex
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Helper to show an error message
 */
function showError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.classList.add("visible");
}

/**
 * Helper to hide an error message
 */
function hideError(element) {
  if (!element) return;
  element.textContent = "";
  element.classList.remove("visible");
}