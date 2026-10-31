document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = requireAuth();
  if (!currentUser) return;
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
  renderRecommendedStudents(user, students, skillMap);
  renderRequestsAndConnections(user, requests, students);
}

function formatYear(year) {
  const value = Number(year);
  if (Number.isNaN(value)) return year;
  return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`;
}

function renderRecommendedStudents(user, students, skillMap) {
  const container = document.getElementById("dashboard-recommended-students");
  if (!container) return;
  const namesOf = (id, type) => (skillMap.get(id) || []).filter((skill) => skill.skillType === type).map((skill) => String(skill.skillName).toLowerCase());
  const myTeach = namesOf(user.id, "TEACH");
  const myLearn = namesOf(user.id, "LEARN");
  const matchCount = (student) => namesOf(student.id, "TEACH").filter((name) => myLearn.includes(name)).length + namesOf(student.id, "LEARN").filter((name) => myTeach.includes(name)).length;
  const recommendations = students
    .filter((student) => student.id !== user.id && String(student.role).toUpperCase() !== "ADMIN")
    .map((student) => ({ student, matches: matchCount(student) }))
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 3);
  container.innerHTML = recommendations.length ? recommendations.map(({ student, matches }) => {
    const teaching = (skillMap.get(student.id) || []).filter((skill) => skill.skillType === "TEACH").slice(0, 2).map((skill) => skill.skillName).join(" / ");
    const pill = matches ? `<span class="match-pill">${matches} skill match${matches === 1 ? "" : "es"}</span>` : "";
    return `<a class="recommended-student" href="student-details.html?id=${student.id}"><span class="student-avatar">${escapeHtml(student.name.charAt(0))}</span><span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(teaching || "No skills offered yet")}</small>${pill}</span></a>`;
  }).join("") : `<p class="form-help">No other students are available yet.</p>`;
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
    return `<div class="request-item"><div class="request-item-main"><div class="request-item-title">${escapeHtml(peer?.name || "Peer Student")}</div><div class="request-exchange-info"><span>${escapeHtml(peer ? `${peer.department} • ${formatYear(peer.year)}` : "Peer Student")}</span> &bull; <span>Exchanging: <strong>${escapeHtml(request.requestedSkill || "None")}</strong> & <strong>${escapeHtml(request.offeredSkill || "None")}</strong></span></div></div><div class="request-actions"><a href="student-details.html?id=${peerId}" class="btn btn-sm btn-secondary">View Profile</a><button type="button" class="btn btn-sm btn-outline-danger" onclick="handleDisconnect(${request.id})">Disconnect</button></div></div>`;
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
  getSkills().then((skills) => { if (select) select.innerHTML = `<option value="">-- Choose from available skills --</option>${skills.map((skill) => `<option value="${skill.id}">${escapeHtml(skill.skillName)}</option>`).join("")}<option value="__custom__">+ Enter a new skill</option>`; }).catch((error) => showToast(error.message, "error"));
  openButton.addEventListener("click", () => modal.classList.add("active"));
  const close = () => { modal.classList.remove("active"); form?.reset(); };
  closeButton?.addEventListener("click", close); cancelButton?.addEventListener("click", close);
  select?.addEventListener("change", () => { document.getElementById("custom-skill-group").style.display = select.value === "__custom__" ? "block" : "none"; });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const type = document.querySelector('input[name="skillType"]:checked').value;
      let skillId = select.value;
      if (skillId === "__custom__") skillId = await resolveCustomSkillId(document.getElementById("custom-skill-name").value);
      if (!skillId) return;
      await assignSkill(user.id, Number(skillId), type);
      close(); await renderDashboard(getCurrentUser()); showToast("Skill added successfully.", "success");
    } catch (error) { showToast(error.message, "error"); }
  });
}