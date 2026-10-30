let targetStudent = null;
let targetSkills = [];
let currentSkills = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { window.location.href = "find-students.html"; return; }
  try {
    const currentUser = getCurrentUser();
    targetStudent = await getUser(id);
    targetSkills = await getUserSkills(targetStudent.id);
    currentSkills = currentUser ? await getUserSkills(currentUser.id) : [];
    renderStudentDetails(targetStudent, currentUser);
    initDetailRequestModal(targetStudent, currentUser);
  } catch (error) {
    document.getElementById("student-details-container").innerHTML = `<div class="card empty-state"><div class="empty-state-title">Student Not Found</div><p class="empty-state-desc">${escapeHtml(error.message)}</p><a href="find-students.html" class="btn btn-primary" style="margin-top: 14px;">Back to Student Directory</a></div>`;
  }
});

function renderStudentDetails(target, currentUser) {
  document.getElementById("detail-avatar").textContent = target.name.charAt(0);
  document.getElementById("detail-name").textContent = target.name;
  document.getElementById("detail-dept-year").textContent = `${target.department} • ${formatDetailsYear(target.year)}`;
  document.getElementById("detail-email").textContent = target.email;
  document.getElementById("detail-bio").textContent = target.bio || "No biography provided.";
  renderSkillsGroup(targetSkills.filter((skill) => skill.skillType === "TEACH"), "detail-teach-skills", "skill-tag-teach", "None listed");
  renderSkillsGroup(targetSkills.filter((skill) => skill.skillType === "LEARN"), "detail-learn-skills", "skill-tag-learn", "None listed");
  const compatibility = document.getElementById("compatibility-container");
  if (!currentUser || currentUser.id === target.id) { compatibility.innerHTML = `<div class="compatibility-banner compatibility-none"><div class="compatibility-title">${currentUser ? "Your Own Profile" : "Login to View Skill Compatibility"}</div></div>`; return; }
  const wanted = new Set(currentSkills.filter((skill) => skill.skillType === "LEARN").map((skill) => skill.skillName.toLowerCase()));
  const offered = new Set(currentSkills.filter((skill) => skill.skillType === "TEACH").map((skill) => skill.skillName.toLowerCase()));
  const canLearn = targetSkills.filter((skill) => skill.skillType === "TEACH" && wanted.has(skill.skillName.toLowerCase())).map((skill) => skill.skillName);
  const canTeach = targetSkills.filter((skill) => skill.skillType === "LEARN" && offered.has(skill.skillName.toLowerCase())).map((skill) => skill.skillName);
  compatibility.innerHTML = canLearn.length || canTeach.length ? `<div class="compatibility-banner compatibility-match"><div class="compatibility-title">Potential Skill Match</div><p class="compatibility-desc">You and ${escapeHtml(target.name)} have overlapping learning interests.</p></div>` : `<div class="compatibility-banner compatibility-none"><div class="compatibility-title">No Direct Match Found</div></div>`;
}

function formatDetailsYear(year) { const value = Number(year); return Number.isNaN(value) ? year : `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`; }
function renderSkillsGroup(skills, id, className, emptyMessage) { const container = document.getElementById(id); container.innerHTML = skills.length ? skills.map((skill) => `<span class="skill-tag ${className}">${escapeHtml(skill.skillName)}</span>`).join("") : `<span style="font-size: 13px; color: var(--color-text-muted);">${emptyMessage}</span>`; }

async function initDetailRequestModal(target, currentUser) {
  const modal = document.getElementById("detail-request-modal");
  const openButton = document.getElementById("btn-open-detail-request");
  const form = document.getElementById("detail-request-form");
  if (!modal || !openButton) return;
  if (currentUser?.id === target.id) { openButton.style.display = "none"; return; }

  if (currentUser) {
    const userRequests = await getRequests(currentUser.id).catch(() => []);
    const isConnected = userRequests.some((r) => r.status === "ACCEPTED" && ((r.senderId === currentUser.id && r.receiverId === target.id) || (r.receiverId === currentUser.id && r.senderId === target.id)));
    const isPending = userRequests.some((r) => r.status === "PENDING" && ((r.senderId === currentUser.id && r.receiverId === target.id) || (r.receiverId === currentUser.id && r.senderId === target.id)));

    if (isConnected) {
      openButton.textContent = "Connected";
      openButton.disabled = true;
      openButton.className = "btn btn-secondary btn-block";
      openButton.style.opacity = "0.85";
      return;
    }
    const outgoing = userRequests.find((r) => r.status === "PENDING" && r.senderId === currentUser.id && r.receiverId === target.id);
    if (outgoing) {
      showCancelState(openButton, outgoing.id, target.name);
      return;
    }
    if (isPending) {
      openButton.textContent = "Respond in Requests";
      openButton.className = "btn btn-secondary btn-block";
      openButton.onclick = () => { window.location.href = "requests.html"; };
      return;
    }
  }

  const targetTeach = targetSkills.filter((skill) => skill.skillType === "TEACH");
  const wantedOptions = targetTeach.length
    ? targetTeach.map((skill) => `<option value="${skill.skillId}">${escapeHtml(skill.skillName)}</option>`).concat([`<option value="">None / No skill</option>`])
    : [`<option value="">None / No skill</option>`];
  document.getElementById("detail-skill-wanted").innerHTML = wantedOptions.join("");

  const ownTeach = currentSkills.filter((skill) => skill.skillType === "TEACH");
  const offeredOptions = ownTeach.length
    ? ownTeach.map((skill) => `<option value="${skill.skillId}">${escapeHtml(skill.skillName)}</option>`).concat([`<option value="">None / No skill</option>`])
    : [`<option value="">None / No skill</option>`];
  document.getElementById("detail-skill-offered").innerHTML = offeredOptions.join("");

  openButton.onclick = () => {
    if (!getCurrentUser()) { window.location.href = "login.html"; return; }
    modal.classList.add("active");
  };
  const close = () => modal.classList.remove("active");
  document.getElementById("btn-close-detail-modal")?.addEventListener("click", close);
  document.getElementById("btn-cancel-detail-modal")?.addEventListener("click", close);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const wantedVal = document.getElementById("detail-skill-wanted").value;
      const offeredVal = document.getElementById("detail-skill-offered").value;
      const created = await createSwapRequest({
        senderId: currentUser.id,
        receiverId: target.id,
        skillId: wantedVal ? Number(wantedVal) : null,
        offeredSkillId: offeredVal ? Number(offeredVal) : null
      });
      close();
      showCancelState(openButton, created.id, target.name);
      showToast(`Request sent to ${target.name}!`, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function showCancelState(button, requestId, targetName) {
  button.textContent = "Cancel Request";
  button.disabled = false;
  button.className = "btn btn-outline-danger btn-block";
  button.style.opacity = "";
  button.onclick = async () => {
    if (!confirm(`Cancel your request to ${targetName}?`)) return;
    try {
      await cancelSwapRequest(requestId);
      showToast("Request cancelled.", "info");
      window.location.reload();
    } catch (error) { showToast(error.message, "error"); }
  };
}
