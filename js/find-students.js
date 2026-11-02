let selectedTargetStudent = null;
let directoryStudents = [];
let directoryRequests = [];
let directorySkills = [];
let directoryPage = 1;
const DIRECTORY_PAGE_SIZE = 12;

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  try {
    await loadDirectoryData();
    initFilters();
    renderStudentDirectory();
    initSendRequestModal();
    document.getElementById("search-input")?.addEventListener("input", () => { directoryPage = 1; renderStudentDirectory(); });
    document.getElementById("filter-skill")?.addEventListener("change", () => { directoryPage = 1; renderStudentDirectory(); });
    document.getElementById("filter-department")?.addEventListener("change", () => { directoryPage = 1; renderStudentDirectory(); });
    document.getElementById("btn-clear-filters")?.addEventListener("click", () => { document.getElementById("search-input").value = ""; document.getElementById("filter-skill").value = ""; document.getElementById("filter-department").value = ""; directoryPage = 1; renderStudentDirectory(); });
  } catch (error) {
    const count = document.getElementById("results-count");
    if (count) count.textContent = "Could not load students.";
    showToast(error.message, "error");
  }
});

// One fetch round-trip (4 requests total). Search and filters then run client-side on this cache.
async function loadDirectoryData() {
  const user = getCurrentUser();
  const [skills, students, assignments, requests] = await Promise.all([
    getSkills(), getUsers(null, "STUDENT"), getAllUserSkills(), getRequests(user.id).catch(() => [])
  ]);
  const byUser = new Map();
  assignments.forEach((item) => {
    if (!byUser.has(item.userId)) byUser.set(item.userId, []);
    byUser.get(item.userId).push(item);
  });
  directorySkills = skills;
  directoryRequests = requests;
  directoryStudents = students.map((student) => ({ ...student, skills: byUser.get(student.id) || [] }));
}

function initFilters() {
  const skills = directorySkills;
  const students = directoryStudents;
  const skillFilter = document.getElementById("filter-skill");
  const departmentFilter = document.getElementById("filter-department");
  if (skillFilter) skillFilter.innerHTML = `<option value="">All Skills</option>${skills.map((skill) => `<option value="${skill.id}">${escapeHtml(skill.skillName)}</option>`).join("")}`;
  if (departmentFilter) {
    const departments = [...new Set(students.map((student) => student.department))];
    departmentFilter.innerHTML = `<option value="">All Departments</option>${departments.map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`).join("")}`;
  }
}

function renderStudentDirectory() {
  const container = document.getElementById("students-grid");
  if (!container) return;
  const user = getCurrentUser();
  const userRequests = directoryRequests;
  const enriched = directoryStudents;
  const term = (document.getElementById("search-input")?.value || "").toLowerCase().trim();
  const skillId = document.getElementById("filter-skill")?.value || "";
  const department = document.getElementById("filter-department")?.value || "";
  const filtered = enriched.filter((student) => {
    if (user && student.id === user.id) return false;
    if (department && student.department !== department) return false;
    if (skillId && !student.skills.some((skill) => String(skill.skillId) === skillId)) return false;
    const searchable = `${student.name} ${student.department} ${student.skills.map((skill) => skill.skillName).join(" ")}`.toLowerCase();
    return !term || searchable.includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  directoryPage = Math.min(directoryPage, totalPages);
  const pageStart = (directoryPage - 1) * DIRECTORY_PAGE_SIZE;
  const visibleStudents = filtered.slice(pageStart, pageStart + DIRECTORY_PAGE_SIZE);
  document.getElementById("results-count").textContent = filtered.length
    ? `Showing ${pageStart + 1}-${pageStart + visibleStudents.length} of ${filtered.length} students`
    : "Showing 0 students";
  document.getElementById("btn-clear-filters").hidden = !(term || skillId || department);
  renderDirectoryPagination(totalPages);
  if (!filtered.length) { container.innerHTML = `<div class="card empty-state" style="grid-column: 1 / -1;"><div class="empty-state-title">No students found</div><p class="empty-state-desc">Try another skill or department.</p></div>`; return; }
  container.innerHTML = visibleStudents.map((student) => {
    const teach = student.skills.filter((skill) => skill.skillType === "TEACH");
    const learn = student.skills.filter((skill) => skill.skillType === "LEARN");

    let actionButtonHtml = `<button type="button" class="btn btn-primary btn-sm request-card-button" onclick="openRequestModalForStudent(${student.id})" style="flex: 1;">Send Request</button>`;
    if (user) {
      const isConnected = userRequests.some((r) => r.status === "ACCEPTED" && ((r.senderId === user.id && r.receiverId === student.id) || (r.receiverId === user.id && r.senderId === student.id)));
      const outgoing = userRequests.find((r) => r.status === "PENDING" && r.senderId === user.id && r.receiverId === student.id);
      const incoming = userRequests.some((r) => r.status === "PENDING" && r.receiverId === user.id && r.senderId === student.id);
      if (isConnected) {
        actionButtonHtml = `<button type="button" class="btn btn-secondary btn-sm" disabled style="flex: 1; opacity: 0.85;">Connected</button>`;
      } else if (outgoing) {
        actionButtonHtml = `<button type="button" class="btn btn-outline-danger btn-sm" onclick="handleCancelFromDirectory(${outgoing.id})" style="flex: 1;">Cancel Request</button>`;
      } else if (incoming) {
        actionButtonHtml = `<a href="requests.html" class="btn btn-secondary btn-sm" style="flex: 1;">Respond to Request</a>`;
      }
    }

    return `<article class="student-card"><div><div class="student-card-header"><div class="student-avatar">${escapeHtml(student.name.charAt(0))}</div><div class="student-header-info"><h3 class="student-card-name">${escapeHtml(student.name)}</h3><div class="student-card-dept">${escapeHtml(student.department)} &bull; ${escapeHtml(formatDirectoryYear(student.year))}</div></div></div><div class="student-skills-section"><div class="skills-subgroup"><div class="skills-subgroup-label">Can Teach</div><div class="skill-tag-group">${skillTags(teach, "skill-tag-teach")}</div></div><div class="skills-subgroup" style="margin-top: 10px;"><div class="skills-subgroup-label">Wants to Learn</div><div class="skill-tag-group">${skillTags(learn, "skill-tag-learn")}</div></div></div></div><div class="student-card-actions"><a href="student-details.html?id=${student.id}" class="btn btn-secondary btn-sm" style="flex: 1;">View Profile</a>${actionButtonHtml}</div></article>`;
  }).join("");
}

function renderDirectoryPagination(totalPages) {
  const pagination = document.getElementById("directory-pagination");
  if (!pagination) return;
  if (totalPages <= 1) { pagination.innerHTML = ""; return; }
  pagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button type="button" class="btn btn-sm ${page === directoryPage ? "btn-primary" : "btn-secondary"}" aria-label="Page ${page}" aria-current="${page === directoryPage ? "page" : "false"}">${page}</button>`;
  }).join("");
  pagination.querySelectorAll("button").forEach((button, index) => {
    button.addEventListener("click", () => {
      directoryPage = index + 1;
      renderStudentDirectory();
      document.getElementById("students-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function formatDirectoryYear(year) { const value = Number(year); return Number.isNaN(value) ? year : `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`; }
function skillTags(skills, className) { return skills.length ? skills.map((skill) => `<span class="skill-tag ${className}">${escapeHtml(skill.skillName)}</span>`).join("") : `<span style="font-size: 12px; color: var(--color-text-muted);">None listed</span>`; }

async function refreshDirectoryRequests() {
  directoryRequests = await getRequests(getCurrentUser().id).catch(() => []);
  renderStudentDirectory();
  renderNavbar();
}

async function handleCancelFromDirectory(requestId) {
  if (!confirm("Cancel this request?")) return;
  try {
    await cancelSwapRequest(requestId);
    await refreshDirectoryRequests();
    showToast("Request cancelled.", "info");
  } catch (error) { showToast(error.message, "error"); }
}

async function openRequestModalForStudent(studentId) {
  const user = requireAuth();
  if (!user) return;
  selectedTargetStudent = directoryStudents.find((student) => student.id === Number(studentId));
  if (!selectedTargetStudent) return;
  let ownSkills;
  try { ownSkills = await getUserSkills(user.id); } catch (error) { showToast(error.message, "error"); return; }
  document.getElementById("modal-request-receiver-name").textContent = selectedTargetStudent.name;

  const targetTeach = selectedTargetStudent.skills.filter((skill) => skill.skillType === "TEACH");
  const wantedOptions = targetTeach.length
    ? targetTeach.map((skill) => `<option value="${skill.skillId}">${escapeHtml(skill.skillName)}</option>`).concat([`<option value="">None / No skill</option>`])
    : [`<option value="">None / No skill</option>`];
  document.getElementById("request-skill-wanted").innerHTML = wantedOptions.join("");

  const ownTeach = ownSkills.filter((skill) => skill.skillType === "TEACH");
  const offeredOptions = ownTeach.length
    ? ownTeach.map((skill) => `<option value="${skill.skillId}">${escapeHtml(skill.skillName)}</option>`).concat([`<option value="">None / No skill</option>`])
    : [`<option value="">None / No skill</option>`];
  document.getElementById("request-skill-offered").innerHTML = offeredOptions.join("");

  document.getElementById("send-request-modal").classList.add("active");
}

function initSendRequestModal() {
  const modal = document.getElementById("send-request-modal");
  const close = () => { modal?.classList.remove("active"); selectedTargetStudent = null; };
  document.getElementById("btn-close-request-modal")?.addEventListener("click", close);
  document.getElementById("btn-cancel-request-modal")?.addEventListener("click", close);
  document.getElementById("send-request-modal-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = requireAuth();
    if (!user || !selectedTargetStudent) return;
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    // close() clears selectedTargetStudent, so keep our own reference.
    const target = selectedTargetStudent;
    try {
      const wantedVal = document.getElementById("request-skill-wanted").value;
      const offeredVal = document.getElementById("request-skill-offered").value;
      await createSwapRequest({
        senderId: user.id,
        receiverId: target.id,
        skillId: wantedVal ? Number(wantedVal) : null,
        offeredSkillId: offeredVal ? Number(offeredVal) : null
      });
      close();
      showToast(`Request sent to ${target.name}!`, "success");
      await refreshDirectoryRequests();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}