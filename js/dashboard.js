document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = requireAuth();
  if (!currentUser) return;
  renderDashboardTopbar(currentUser);
  try {
    await renderDashboard(currentUser);
    initAddSkillModal(currentUser);
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function renderDashboard(user) {
  const [students, allSkills, requests] = await Promise.all([
    getUsers(null, "STUDENT"),
    getAllUserSkills(),
    getRequests(user.id)
  ]);
  const skillMap = new Map();
  allSkills.forEach((item) => {
    if (!skillMap.has(item.userId)) skillMap.set(item.userId, []);
    skillMap.get(item.userId).push(item);
  });
  const userSkills = skillMap.get(user.id) || [];
  const welcomeTitle = document.getElementById("welcome-title");
  if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${user.name}!`;
  document.getElementById("summary-avatar").textContent = user.name.charAt(0);
  document.getElementById("summary-name").textContent = user.name;
  document.getElementById("summary-dept").textContent = `${user.department} • ${formatYear(user.year)}`;
  document.getElementById("summary-email").textContent = user.email;
  document.getElementById("summary-bio").textContent = user.bio || "No bio added yet.";
  renderSkillsList(userSkills.filter((skill) => skill.skillType === "TEACH"), "dashboard-teach-skills", "skill-tag-teach", "No teaching skills added yet.");
  renderSkillsList(userSkills.filter((skill) => skill.skillType === "LEARN"), "dashboard-learn-skills", "skill-tag-learn", "No learning skills added yet.");
  renderMatchesAndRecommendations(user, students, skillMap, requests);
  renderRequestsAndConnections(user, requests, students);
}

function formatYear(year) {
  const value = Number(year);
  if (Number.isNaN(value)) return year;
  return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`;
}

function renderDashboardTopbar(user) {
  const actions = document.getElementById("dashboard-topbar-actions");
  if (!actions || actions.querySelector(".dashboard-profile-menu")) return;
  const menu = document.createElement("div");
  menu.className = "dashboard-profile-menu";
  menu.innerHTML = `
    <button type="button" class="dashboard-profile-trigger" id="dashboard-user-trigger" aria-haspopup="true" aria-expanded="false">
      <span class="user-avatar-small">${escapeHtml(user.name.charAt(0))}</span>
      <span>${escapeHtml(user.name)}</span>
      <span class="dashboard-profile-arrow" aria-hidden="true">&#9662;</span>
    </button>
    <div class="dashboard-profile-dropdown" id="dashboard-user-dropdown" role="menu" aria-labelledby="dashboard-user-trigger">
      <div class="dashboard-profile-summary">
        <strong>${escapeHtml(user.name)}</strong>
        <small>${escapeHtml(user.email)}</small>
      </div>
      <div class="dashboard-profile-divider" role="separator"></div>
      <a href="profile.html" role="menuitem">My Profile</a>
      <button type="button" class="dashboard-menu-action btn-logout dashboard-menu-logout" role="menuitem">Logout</button>
    </div>
  `;
  actions.appendChild(menu);
}

function skillNamesFor(skillMap, userId, type) {
  return (skillMap.get(userId) || []).filter((skill) => skill.skillType === type).map((skill) => skill.skillName);
}

function overlapNames(first, second) {
  const lookup = new Set(second.map((name) => name.toLowerCase()));
  return first.filter((name) => lookup.has(name.toLowerCase()));
}

function requestButtonHtml(student, pendingIds, connectedIds, incomingIds) {
  if (connectedIds.has(student.id)) return `<button type="button" class="btn btn-secondary btn-sm" disabled>Connected</button>`;
  if (incomingIds.has(student.id)) return `<a href="requests.html" class="btn btn-secondary btn-sm">Respond to Request</a>`;
  if (pendingIds.has(student.id)) return `<button type="button" class="btn btn-secondary btn-sm" disabled>Request Sent</button>`;
  return `<a href="student-details.html?id=${student.id}" class="btn btn-primary btn-sm">Send Request</a>`;
}

function renderMatchesAndRecommendations(user, students, skillMap, requests) {
  const myTeach = skillNamesFor(skillMap, user.id, "TEACH");
  const myLearn = skillNamesFor(skillMap, user.id, "LEARN");
  const others = students.filter((student) => student.id !== user.id && String(student.role).toUpperCase() !== "ADMIN");
  const pendingIds = new Set(requests.filter((request) => request.status === "PENDING" && request.senderId === user.id).map((request) => request.receiverId));
  const incomingIds = new Set(requests.filter((request) => request.status === "PENDING" && request.receiverId === user.id).map((request) => request.senderId));
  const connectedIds = new Set(requests.filter((request) => request.status === "ACCEPTED").map((request) => (request.senderId === user.id ? request.receiverId : request.senderId)));

  const matches = others
    .map((student) => ({
      student,
      theyCanTeach: overlapNames(skillNamesFor(skillMap, student.id, "TEACH"), myLearn),
      youCanTeach: overlapNames(myTeach, skillNamesFor(skillMap, student.id, "LEARN"))
    }))
    .filter((match) => match.theyCanTeach.length || match.youCanTeach.length)
    .sort((first, second) => (second.theyCanTeach.length + second.youCanTeach.length) - (first.theyCanTeach.length + first.youCanTeach.length));

  const matchCount = document.getElementById("dashboard-match-count");
  if (matchCount) matchCount.textContent = matches.length;

  const matchContainer = document.getElementById("dashboard-potential-matches");
  if (matchContainer) {
    matchContainer.innerHTML = matches.length ? matches.slice(0, 3).map(({ student, theyCanTeach, youCanTeach }) => `
      <article class="potential-match-card">
        <div class="student-card-header">
          <div class="student-avatar">${escapeHtml(student.name.charAt(0))}</div>
          <div class="student-header-info">
            <h3 class="student-card-name">${escapeHtml(student.name)}</h3>
            <div class="student-card-dept">${escapeHtml(student.department)} &bull; ${escapeHtml(formatYear(student.year))}</div>
          </div>
        </div>
        <div class="match-reason">
          ${youCanTeach.length ? `<span>You can teach: <strong>${escapeHtml(youCanTeach.join(", "))}</strong></span>` : ""}
          ${theyCanTeach.length ? `<span>They can teach: <strong>${escapeHtml(theyCanTeach.join(", "))}</strong></span>` : ""}
        </div>
        <div class="student-card-actions">
          <a href="student-details.html?id=${student.id}" class="btn btn-secondary btn-sm">View Profile</a>
          ${requestButtonHtml(student, pendingIds, connectedIds, incomingIds)}
        </div>
      </article>`).join("") : `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 24px 20px;">
        <div class="empty-state-title">No skill matches found</div>
        <p class="empty-state-desc">Add more teaching or learning skills to discover compatible students.</p>
      </div>`;
  }

  const matchedIds = new Set(matches.map((match) => match.student.id));
  const recommended = others.filter((student) => !matchedIds.has(student.id)).slice(0, 3);
  const container = document.getElementById("dashboard-recommended-students");
  if (!container) return;
  container.innerHTML = recommended.length ? recommended.map((student) => `
    <article class="recommended-student">
      <div class="student-avatar">${escapeHtml(student.name.charAt(0))}</div>
      <strong>${escapeHtml(student.name)}</strong>
      <small>${escapeHtml(student.department)} &bull; ${escapeHtml(formatYear(student.year))}</small>
      <span class="recommended-label">Can teach</span>
      <span class="recommended-skills">${escapeHtml(skillNamesFor(skillMap, student.id, "TEACH").join(", ") || "None listed")}</span>
      <span class="recommended-label">Wants to learn</span>
      <span class="recommended-skills">${escapeHtml(skillNamesFor(skillMap, student.id, "LEARN").join(", ") || "None listed")}</span>
      <span class="recommended-actions">
        <a href="student-details.html?id=${student.id}" class="btn btn-secondary btn-sm">View Profile</a>
        ${requestButtonHtml(student, pendingIds, connectedIds, incomingIds)}
      </span>
    </article>`).join("") : `
    <div class="empty-state" style="grid-column: 1 / -1; padding: 24px 20px;">
      <div class="empty-state-title">No other students to recommend</div>
      <p class="empty-state-desc">Visit Find Students to explore the campus directory.</p>
    </div>`;
}

function renderSkillsList(skills, containerId, badgeClass, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = skills.length ? skills.map((skill) => `<span class="skill-tag ${badgeClass}">${escapeHtml(skill.skillName)}</span>`).join("") : `<span class="text-muted" style="font-size: 13px; color: var(--color-text-muted);">${emptyMessage}</span>`;
}

function renderRequestsAndConnections(user, requests, students) {
  const incoming = requests.filter((request) => request.receiverId === user.id && request.status === "PENDING");
  const pendingBadge = document.getElementById("pending-count-badge");
  if (pendingBadge) { pendingBadge.textContent = incoming.length; pendingBadge.className = incoming.length ? "badge badge-warning" : "badge badge-neutral"; }
  const pendingContainer = document.getElementById("dashboard-pending-requests");
  if (pendingContainer) pendingContainer.innerHTML = incoming.length ? incoming.map((request) => `<div class="request-item"><div class="request-item-main"><div class="request-item-title">${escapeHtml(request.senderName)}</div><div class="request-exchange-info"><span>Wants: <strong>${escapeHtml(request.requestedSkill || "None")}</strong></span><span class="exchange-arrow">&harr;</span><span>Offers: <strong>${escapeHtml(request.offeredSkill || "None")}</strong></span></div></div><div class="request-actions"><button class="btn btn-sm btn-success" onclick="handleDashboardRequest(${request.id}, 'accept')">Accept</button><button class="btn btn-sm btn-secondary" onclick="handleDashboardRequest(${request.id}, 'reject')">Reject</button></div></div>`).join("") : `<div class="empty-state" style="padding: 20px 0;"><p class="empty-state-desc">You have no pending requests right now.</p></div>`;

  const accepted = requests.filter((request) => request.status === "ACCEPTED");
  const connectionBadge = document.getElementById("connections-count-badge");
  if (connectionBadge) { connectionBadge.textContent = accepted.length; connectionBadge.className = accepted.length ? "badge badge-success" : "badge badge-neutral"; }
  const connectionContainer = document.getElementById("dashboard-connections");
  if (connectionContainer) connectionContainer.innerHTML = accepted.length ? accepted.map((request) => {
    const peerId = request.senderId === user.id ? request.receiverId : request.senderId;
    const peer = students.find((student) => student.id === peerId);
    return `<div class="request-item"><div class="request-item-main"><div class="request-item-title">${escapeHtml(peer?.name || "Peer Student")}</div><div class="request-exchange-info"><span>${escapeHtml(peer ? `${peer.department} • ${formatYear(peer.year)}` : "Peer Student")}</span><span>Exchanging: <strong>${escapeHtml(request.requestedSkill || "None")}</strong> &amp; <strong>${escapeHtml(request.offeredSkill || "None")}</strong></span></div></div><div class="request-actions"><a href="student-details.html?id=${peerId}" class="btn btn-sm btn-secondary">View Profile</a><button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnect(${request.id})">Disconnect</button></div></div>`;
  }).join("") : `<div class="empty-state" style="padding: 20px 0;"><p class="empty-state-desc">No accepted connections yet. Discover peers in <a href="find-students.html">Find Students</a>.</p></div>`;
}

async function handleDashboardRequest(requestId, action) {
  try {
    const user = getCurrentUser();
    let peerName = "Student";
    if (action === "accept" && user) {
      try {
        const requests = await getRequests(user.id);
        const targetReq = requests.find((r) => r.id === Number(requestId));
        if (targetReq) {
          peerName = targetReq.senderName || "Student";
        }
      } catch {}
    }
    await updateSwapRequest(requestId, action);
    await renderDashboard(getCurrentUser());
    renderNavbar();
    if (action === "accept") {
      showConnectionSuccessModal({ peerName });
    }
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleDisconnect(requestId) {
  if (!confirm("Disconnect from this student? You can send a new request later.")) return;
  try {
    await disconnectSwapRequest(requestId);
    await renderDashboard(getCurrentUser());
    renderNavbar();
    showToast("Disconnected.", "info");
  } catch (error) { showToast(error.message, "error"); }
}

function initAddSkillModal(user) {
  const modal = document.getElementById("add-skill-modal");
  const openButton = document.getElementById("btn-open-add-skill");
  const closeButton = document.getElementById("btn-close-modal");
  const cancelButton = document.getElementById("btn-cancel-modal");
  const form = document.getElementById("add-skill-form");
  const select = document.getElementById("skill-selection");
  if (!modal || !openButton) return;
  const loadOptions = () => populateSkillSelect(select).catch((error) => showToast(error.message, "error"));
  loadOptions();
  openButton.addEventListener("click", () => modal.classList.add("active"));
  const close = () => { modal.classList.remove("active"); form?.reset(); resetCustomSkillGroup(); };
  closeButton?.addEventListener("click", close);
  cancelButton?.addEventListener("click", close);
  select?.addEventListener("change", () => { document.getElementById("custom-skill-group").style.display = select.value === "__custom__" ? "block" : "none"; });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    try {
      const type = document.querySelector('input[name="skillType"]:checked').value;
      const wasCustom = select.value === "__custom__";
      let skillId = select.value;
      if (wasCustom) skillId = await resolveCustomSkillId(document.getElementById("custom-skill-name").value);
      if (!skillId) throw new Error("Please choose a skill.");
      await assignSkill(user.id, Number(skillId), type);
      close();
      if (wasCustom) loadOptions();
      await renderDashboard(getCurrentUser());
      showToast("Skill added successfully.", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}