const API_BASE_URL = window.SKILLSWAP_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8080/api`;
const SESSION_KEY = "skillswap_session";

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const session = getSession();
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error("The backend is unavailable. Please start the API and try again.");
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (response.status === 401 && session?.token && !path.startsWith("/auth/")) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!response.ok) throw new Error(data?.error || `Request failed with HTTP ${response.status}.`);
  return data;
}

function getSession() {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getCurrentUser() {
  return getSession()?.user || null;
}

function setSession(token, user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function logoutUser() {
  const token = getSession()?.token;
  sessionStorage.removeItem(SESSION_KEY);
  if (token) {
    // Revoke server-side so the token cannot be reused. Best effort.
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true
    }).catch(() => {});
  }
}

function isAdminUser(user) {
  return String(user?.role || "").toUpperCase() === "ADMIN";
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

async function loginUser(email, password) {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setSession(response.token, response.user);
  return response.user;
}

async function registerUser(data) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

async function getUsers(skill, role) {
  const params = new URLSearchParams();
  if (skill) params.set("skill", skill);
  if (role) params.set("role", role);
  const query = params.toString();
  return apiRequest(`/users${query ? `?${query}` : ""}`);
}

async function getStats() {
  return apiRequest("/stats");
}

async function getAllUserSkills() {
  return apiRequest("/user-skills");
}

async function getAllRequests() {
  return apiRequest("/requests");
}

async function getUser(userId) {
  return apiRequest(`/users/${userId}`);
}

async function updateUser(userId, data) {
  const user = await apiRequest(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
  const session = getSession();
  if (session?.user?.id === user.id) setSession(session.token, user);
  return user;
}

async function deleteUser(userId) {
  return apiRequest(`/users/${userId}`, { method: "DELETE" });
}

async function getSkills() {
  return apiRequest("/skills");
}

async function createSkill(skillName) {
  return apiRequest("/skills", {
    method: "POST",
    body: JSON.stringify({ skillName })
  });
}

async function deleteSkill(skillId) {
  return apiRequest(`/skills/${skillId}`, { method: "DELETE" });
}

async function getUserSkills(userId) {
  return apiRequest(`/users/${userId}/skills`);
}

async function assignSkill(userId, skillId, skillType) {
  return apiRequest(`/users/${userId}/skills`, {
    method: "POST",
    body: JSON.stringify({ skillId, skillType: skillType.toUpperCase() })
  });
}

async function removeUserSkill(userId, skillId) {
  return apiRequest(`/users/${userId}/skills/${skillId}`, { method: "DELETE" });
}

async function getRequests(userId) {
  return apiRequest(`/requests/user/${userId}`);
}

async function createSwapRequest(data) {
  return apiRequest("/requests", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

async function updateSwapRequest(requestId, status) {
  return apiRequest(`/requests/${requestId}/${status.toLowerCase()}`, { method: "PUT" });
}


async function cancelSwapRequest(requestId) {
  return apiRequest(`/requests/${requestId}/cancel`, { method: "PUT" });
}

async function disconnectSwapRequest(requestId) {
  return apiRequest(`/requests/${requestId}/disconnect`, { method: "PUT" });
}
