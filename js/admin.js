let adminStudents = [];

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user || !isAdminUser(user)) { window.location.href = user ? "dashboard.html" : "login.html"; return; }
  initAdminTableActions();
  initAddSkillCatalogForm();
  initStudentSearch();
  try { await renderAdminDashboard(); } catch (error) { showToast(error.message, "error"); }
});

async function renderAdminDashboard() {
  // 4 requests total, regardless of how many students exist.
  const [students, skills, requests, assignments] = await Promise.all([
    getUsers(null, "STUDENT"), getSkills(), getAllRequests(), getAllUserSkills()
  ]);
  document.getElementById("admin-stat-students").textContent = students.length;
  document.getElementById("admin-stat-skills").textContent = skills.length;
  document.getElementById("admin-stat-requests").textContent = requests.length;
  document.getElementById("admin-requests-breakdown").textContent = `${requests.filter((request) => request.status === "PENDING").length} pending`;
  renderStudentTable(students);
  renderSkillsTable(skills, assignments);
}

function formatAdminYear(year) {
  const value = Number(year);
  if (Number.isNaN(value)) return year;
  return `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`;
}

function renderStudentTable(students) {
  adminStudents = students;
  const search = document.getElementById("admin-student-search");
  const term = String(search?.value || "").trim().toLowerCase();
  const filteredStudents = term
    ? students.filter((student) => `${student.name} ${student.email} ${student.department} ${formatAdminYear(student.year)}`.toLowerCase().includes(term))
    : students;
  const tbody = document.getElementById("admin-students-tbody");
  if (!filteredStudents.length) {
    const message = term ? "No students match your search." : "No students currently registered.";
    tbody.innerHTML = `<tr><td colspan="5"><div class="admin-table-empty"><div class="empty-state-title">${message}</div><p class="empty-state-desc">${term ? "Try a different name, email, or department." : "Registered students will appear here."}</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filteredStudents.map((student) => {
    const initial = String(student.name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<tr><td><div class="admin-student-cell"><span class="student-avatar user-avatar-small">${escapeHtml(initial)}</span><div><strong>${escapeHtml(student.name)}</strong><div class="admin-student-email">${escapeHtml(student.email)}</div></div></div></td><td>${escapeHtml(student.department)}</td><td>${escapeHtml(formatAdminYear(student.year))}</td><td><span class="badge badge-primary">Student</span></td><td><button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-student" data-id="${Number(student.id)}" data-name="${escapeHtml(student.name)}">Remove</button></td></tr>`;
  }).join("");
  colorizeAvatars(tbody);
}

function initStudentSearch() {
  document.getElementById("admin-student-search")?.addEventListener("input", () => renderStudentTable(adminStudents));
}

function renderSkillsTable(skills, assignments) {
  const tbody = document.getElementById("admin-skills-tbody");
  if (!skills.length) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 24px;">No skills in the catalog.</td></tr>`; return; }
  tbody.innerHTML = skills.map((skill) => {
    const teach = assignments.filter((item) => item.skillId === skill.id && item.skillType === "TEACH").length;
    const learn = assignments.filter((item) => item.skillId === skill.id && item.skillType === "LEARN").length;
    return `<tr><td><strong>${escapeHtml(skill.skillName)}</strong></td><td><span class="badge badge-success">${teach} student${teach === 1 ? "" : "s"}</span></td><td><span class="badge badge-primary">${learn} student${learn === 1 ? "" : "s"}</span></td><td><button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-skill" data-id="${Number(skill.id)}" data-name="${escapeHtml(skill.skillName)}">Remove</button></td></tr>`;
  }).join("");
}

// Names live in data- attributes (set via escapeHtml) and are read back with dataset,
// so quotes in a name can never break out of a JS string.
function initAdminTableActions() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    if (button.dataset.action === "remove-student") handleRemoveStudent(id, button.dataset.name);
    if (button.dataset.action === "remove-skill") handleRemoveSkill(id, button.dataset.name);
  });
}

async function handleRemoveStudent(studentId, studentName) {
  if (studentId === getCurrentUser()?.id) { showToast("You cannot remove your own account.", "error"); return; }
  if (!await showConfirmModal({ title: "Remove student", message: `Are you sure you want to remove student "${studentName}" from the platform?`, confirmLabel: "Remove" })) return;
  try { await deleteUser(studentId); await renderAdminDashboard(); showToast(`Student "${studentName}" removed.`, "info"); } catch (error) { showToast(error.message, "error"); }
}

async function handleRemoveSkill(skillId, skillName) {
  if (!await showConfirmModal({ title: "Remove skill", message: `Remove skill "${skillName}" from the global catalog?`, confirmLabel: "Remove" })) return;
  try { await deleteSkill(skillId); await renderAdminDashboard(); showToast(`Skill "${skillName}" removed from catalog.`, "info"); } catch (error) { showToast(error.message, "error"); }
}

function initAddSkillCatalogForm() {
  const form = document.getElementById("admin-add-skill-form");
  form?.addEventListener("submit", async (event) => { event.preventDefault(); const input = document.getElementById("admin-new-skill-input"); if (!input.value.trim()) return; try { await createSkill(input.value.trim()); input.value = ""; await renderAdminDashboard(); showToast("Skill added.", "success"); } catch (error) { showToast(error.message, "error"); } });
}