document.addEventListener("DOMContentLoaded", async () => {
  const user = requireAuth();
  if (!user) return;
  initTabs();
  try { await renderAllRequests(user); } catch (error) { showToast(error.message, "error"); }
});

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((button) => button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-tab");
    buttons.forEach((item) => { item.classList.remove("active"); item.setAttribute("aria-selected", "false"); });
    document.querySelectorAll(".tab-panel").forEach((panel) => (panel.style.display = "none"));
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    document.getElementById(targetId)?.style.setProperty("display", "block");
  }));
}

async function renderAllRequests(user) {
  const requests = await getRequests(user.id);
  const received = requests.filter((request) => request.receiverId === user.id);
  const sent = requests.filter((request) => request.senderId === user.id);
  const connections = requests.filter((request) => request.status === "ACCEPTED");
  document.getElementById("badge-received-count").textContent = received.length;
  document.getElementById("badge-sent-count").textContent = sent.length;
  document.getElementById("badge-connections-count").textContent = connections.length;
  renderReceivedList(received);
  renderSentList(sent);
  renderConnectionsList(connections, user);
}

function statusBadge(status) {
  const labels = {
    PENDING: ["Pending", "badge-warning"],
    ACCEPTED: ["Accepted", "badge-success"],
    REJECTED: ["Rejected", "badge-danger"],
    CANCELLED: ["Cancelled", "badge-neutral"],
    DISCONNECTED: ["Disconnected", "badge-neutral"]
  };
  const [label, className] = labels[status] || [String(status || "Unknown"), "badge-neutral"];
  const statusClass = String(status || "").toLowerCase();
  return `<span class="request-status-chip request-status-${statusClass}"><span class="status-dot"></span>${label}</span>`;
}

function requestDetails(request) {
  return `<div class="request-skill-chips"><span class="request-skill-chip">Wants to learn: <strong>${escapeHtml(request.requestedSkill || "None")}</strong></span><span class="request-skill-chip">Offers to teach: <strong>${escapeHtml(request.offeredSkill || "None")}</strong></span></div><time class="request-date">${escapeHtml(formatRequestDate(request.createdAt))}</time>`;
}

function formatRequestDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function requestAvatars(request, currentUserId, peerName, peerId) {
  const myInitial = String(getCurrentUser()?.name || "You").trim().charAt(0).toUpperCase() || "Y";
  const peerInitial = String(peerName || "Student").trim().charAt(0).toUpperCase() || "S";
  const incoming = request.receiverId === currentUserId;
  const first = incoming ? peerInitial : myInitial;
  const second = incoming ? myInitial : peerInitial;
  return `<div class="request-people"><span class="request-avatar">${escapeHtml(first)}</span><span class="request-arrow" aria-hidden="true">&rarr;</span><span class="request-avatar request-avatar-secondary">${escapeHtml(second)}</span></div>`;
}

function emptyRequestState(title, message) {
  return `<div class="requests-empty"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 18h30a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H30l-10 7v-7h-3a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z"></path><path d="M23 31h18M23 38h11"></path></svg><div class="empty-state-title">${escapeHtml(title)}</div><p class="empty-state-desc">${escapeHtml(message)}</p><a href="find-students.html" class="btn btn-primary btn-sm">Find Students</a></div>`;
}

function requestCard(request, currentUserId, peerName, peerId, actions) {
  return `<article class="request-card">${requestAvatars(request, currentUserId, peerName, peerId)}<div class="request-card-main"><div class="request-card-heading"><h3>${escapeHtml(peerName || "Student")}</h3>${statusBadge(request.status)}</div>${requestDetails(request)}</div><div class="request-card-actions">${actions}</div></article>`;
}

function renderReceivedList(requests) {
  const container = document.getElementById("received-requests-list");
  if (!container) return;
  container.innerHTML = requests.length ? requests.map((request) => requestCard(request, getCurrentUser().id, request.senderName, request.senderId, request.status === "PENDING" ? `<button type="button" class="btn btn-sm btn-success" onclick="handleAcceptRequest(${request.id})">Accept</button><button type="button" class="btn btn-sm btn-outline-danger" onclick="handleRejectRequest(${request.id})">Reject</button>` : `<a href="student-details.html?id=${request.senderId}" class="btn btn-sm btn-secondary">View Student</a>${request.status === "ACCEPTED" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnectRequest(${request.id})">Disconnect</button>` : ""}`)).join("") : emptyRequestState("No incoming requests", "When students propose a skill exchange, their requests will appear here.");
}

function renderSentList(requests) {
  const container = document.getElementById("sent-requests-list");
  if (!container) return;
  container.innerHTML = requests.length ? requests.map((request) => requestCard(request, getCurrentUser().id, request.receiverName, request.receiverId, `<a href="student-details.html?id=${request.receiverId}" class="btn btn-sm btn-secondary">View Profile</a>${request.status === "PENDING" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleCancelRequest(${request.id})">Cancel</button>` : ""}${request.status === "ACCEPTED" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnectRequest(${request.id})">Disconnect</button>` : ""}`)).join("") : emptyRequestState("No sent requests", "Your skill exchange proposals will appear here after you contact a student.");
}

function renderConnectionsList(requests, user) {
  const container = document.getElementById("connections-requests-list");
  if (!container) return;
  container.innerHTML = requests.length ? requests.map((request) => {
    const peerId = request.senderId === user.id ? request.receiverId : request.senderId;
    const peerName = request.senderId === user.id ? request.receiverName : request.senderName;
    return requestCard(request, user.id, peerName, peerId, `<a href="student-details.html?id=${peerId}" class="btn btn-sm btn-secondary">View Profile</a><button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnectRequest(${request.id})">Disconnect</button>`);
  }).join("") : emptyRequestState("No connections yet", "Accept a request to start exchanging skills with a peer.");
}

async function handleAcceptRequest(requestId) {
  const user = requireAuth();
  let peerName = "Student";
  if (user) {
    try {
      const requests = await getRequests(user.id);
      const targetReq = requests.find((r) => r.id === Number(requestId));
      if (targetReq) {
        peerName = targetReq.senderName || "Student";
      }
    } catch {}
  }
  if (await changeRequest(requestId, "accept")) showConnectionSuccessModal({ peerName });
}

async function handleCancelRequest(requestId) {
  if (!await showConfirmModal({ title: "Cancel request", message: "Cancel this request?", confirmLabel: "Cancel request" })) return;
  try { await cancelSwapRequest(requestId); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); showToast("Request cancelled.", "info"); }
  catch (error) { showToast(error.message, "error"); }
}

async function handleDisconnectRequest(requestId) {
  if (!await showConfirmModal({ title: "Disconnect student", message: "Disconnect from this student? You can send a new request later.", confirmLabel: "Disconnect" })) return;
  try { await disconnectSwapRequest(requestId); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); showToast("Disconnected.", "info"); }
  catch (error) { showToast(error.message, "error"); }
}

async function handleRejectRequest(requestId) { await changeRequest(requestId, "reject"); }
async function changeRequest(requestId, action) {
  try { await updateSwapRequest(requestId, action); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); return true; }
  catch (error) { showToast(error.message, "error"); return false; }
}