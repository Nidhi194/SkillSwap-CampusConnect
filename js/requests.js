document.addEventListener("DOMContentLoaded", async () => {
  const user = requireAuth();
  if (!user) return;
  initTabs();
  try { await renderAllRequests(user); } catch (error) { showToast(error.message, "error"); }
});

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-tab");
    document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => (panel.style.display = "none"));
    button.classList.add("active");
    document.getElementById(targetId)?.style.setProperty("display", "block");
  }));
}

async function renderAllRequests(user) {
  const requests = await getRequests(user.id);
  const received = requests.filter((request) => request.receiverId === user.id);
  const sent = requests.filter((request) => request.senderId === user.id);
  document.getElementById("badge-received-count").textContent = received.length;
  document.getElementById("badge-sent-count").textContent = sent.length;
  renderReceivedList(received);
  renderSentList(sent);
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
  return `<span class="badge ${className}">${label}</span>`;
}

function requestDetails(request) {
  return `<div class="request-exchange-info"><span>Wants to learn: <strong>${escapeHtml(request.requestedSkill || "None")}</strong></span><span class="exchange-arrow">&harr;</span><span>Offers to teach: <strong>${escapeHtml(request.offeredSkill || "None")}</strong></span><span style="color: var(--color-text-light); font-size: 12px; margin-left: 8px;">Date: ${escapeHtml(request.createdAt || "")}</span></div>`;
}

function renderReceivedList(requests) {
  const container = document.getElementById("received-requests-list");
  if (!container) return;
  container.innerHTML = requests.length ? requests.map((request) => `<div class="request-item"><div class="request-item-main"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span class="request-item-title">${escapeHtml(request.senderName)}</span>${statusBadge(request.status)}</div>${requestDetails(request)}</div><div class="request-actions">${request.status === "PENDING" ? `<button type="button" class="btn btn-sm btn-success" onclick="handleAcceptRequest(${request.id})">Accept</button><button type="button" class="btn btn-sm btn-outline-danger" onclick="handleRejectRequest(${request.id})">Reject</button>` : `<a href="student-details.html?id=${request.senderId}" class="btn btn-sm btn-secondary">View Student</a>${request.status === "ACCEPTED" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnectRequest(${request.id})">Disconnect</button>` : ""}`}</div></div>`).join("") : `<div class="card empty-state"><div class="empty-state-title">No Received Requests</div><p class="empty-state-desc">When other students request to exchange skills with you, they will appear here.</p></div>`;
}

function renderSentList(requests) {
  const container = document.getElementById("sent-requests-list");
  if (!container) return;
  container.innerHTML = requests.length ? requests.map((request) => `<div class="request-item"><div class="request-item-main"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span class="request-item-title">${escapeHtml(request.receiverName)}</span>${statusBadge(request.status)}</div>${requestDetails(request)}</div><div class="request-actions"><a href="student-details.html?id=${request.receiverId}" class="btn btn-sm btn-secondary">View Profile</a>${request.status === "PENDING" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleCancelRequest(${request.id})">Cancel</button>` : ""}${request.status === "ACCEPTED" ? `<button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnectRequest(${request.id})">Disconnect</button>` : ""}</div></div>`).join("") : `<div class="card empty-state"><div class="empty-state-title">No Sent Requests</div><p class="empty-state-desc">You haven't sent any skill exchange proposals yet. Visit <a href="find-students.html">Find Students</a> to reach out.</p></div>`;
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
  if (!confirm("Cancel this request?")) return;
  try { await cancelSwapRequest(requestId); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); showToast("Request cancelled.", "info"); }
  catch (error) { showToast(error.message, "error"); }
}

async function handleDisconnectRequest(requestId) {
  if (!confirm("Disconnect from this student? You can send a new request later.")) return;
  try { await disconnectSwapRequest(requestId); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); showToast("Disconnected.", "info"); }
  catch (error) { showToast(error.message, "error"); }
}

async function handleRejectRequest(requestId) { await changeRequest(requestId, "reject"); }
async function changeRequest(requestId, action) {
  try { await updateSwapRequest(requestId, action); const user = requireAuth(); if (user) await renderAllRequests(user); renderNavbar(); return true; }
  catch (error) { showToast(error.message, "error"); return false; }
}