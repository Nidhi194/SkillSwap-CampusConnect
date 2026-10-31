document.addEventListener("DOMContentLoaded", async () => {
  const user = requireAuth();
  if (!user) return;
  try {
    await renderProfile(user);
    initEditProfileModal(user);
    initAddSkillModal(user);
  } catch (error) { showToast(error.message, "error"); }
});

async function renderProfile(user) {
  const skills = await getUserSkills(user.id);
  document.getElementById("profile-header-name").textContent = user.name;
  document.getElementById("profile-header-avatar").textContent = user.name.charAt(0);
  document.getElementById("profile-header-dept").textContent = `${user.department} • ${formatProfileYear(user.year)}`;
  document.getElementById("profile-view-email").textContent = user.email;
  document.getElementById("profile-view-dept").textContent = user.department;
  document.getElementById("profile-view-year").textContent = formatProfileYear(user.year);
  document.getElementById("profile-view-bio").textContent = user.bio || "No biography provided yet.";
  renderSkills(skills.filter((skill) => skill.skillType === "TEACH"), "profile-teach-skills", "teach", "No teaching skills added.");
  renderSkills(skills.filter((skill) => skill.skillType === "LEARN"), "profile-learn-skills", "learn", "No learning skills added.");
}

function formatProfileYear(year) {
  const value = Number(year);
  return Number.isNaN(value) ? year : `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`;
}

function renderSkills(skills, containerId, type, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = skills.length ? skills.map((skill) => `<span class="skill-tag ${type === "teach" ? "skill-tag-teach" : "skill-tag-learn"}">${escapeHtml(skill.skillName)} <button type="button" class="skill-tag-remove" onclick="handleRemoveSkill('${type}', ${skill.skillId})" aria-label="Remove skill">&times;</button></span>`).join("") : `<span style="font-size: 13px; color: var(--color-text-muted);">${emptyMessage}</span>`;
}

async function handleRemoveSkill(type, skillId) {
  const user = requireAuth();
  if (!user) return;
  try { await removeUserSkill(user.id, Number(skillId)); await renderProfile(user); showToast("Skill removed.", "info"); }
  catch (error) { showToast(error.message, "error"); }
}

// Backend stores department as free text, so keep any value the dropdown does not list.
function setSelectValue(id, value) {
  const select = document.getElementById(id);
  if (!select) return;
  if (value && ![...select.options].some((option) => option.value === value)) select.add(new Option(value, value));
  select.value = value || "";
}

function initEditProfileModal(user) {
  const modal = document.getElementById("edit-profile-modal");
  const form = document.getElementById("edit-profile-form");
  if (!modal || !form) return;
  const close = () => modal.classList.remove("active");
  document.getElementById("btn-open-edit-profile")?.addEventListener("click", () => {
    document.getElementById("edit-name").value = user.name;
    setSelectValue("edit-department", user.department);
    setSelectValue("edit-year", formatProfileYear(user.year));
    document.getElementById("edit-bio").value = user.bio || "";
    modal.classList.add("active");
  });
  document.getElementById("btn-close-edit-modal")?.addEventListener("click", close);
  document.getElementById("btn-cancel-edit-modal")?.addEventListener("click", close);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const name = document.getElementById("edit-name").value.trim();
      if (name.length < 2) throw new Error("Name must be at least 2 characters.");
      const updated = await updateUser(user.id, {
        name,
        email: user.email,
        department: document.getElementById("edit-department").value,
        year: Number(document.getElementById("edit-year").value.replace(/\D/g, "")),
        bio: document.getElementById("edit-bio").value.trim()
      });
      Object.assign(user, updated); close(); await renderProfile(user); renderNavbar(); showToast("Profile updated successfully.", "success");
    } catch (error) { showToast(error.message, "error"); }
  });
}

function initAddSkillModal(user) {
  const modal = document.getElementById("add-skill-modal");
  const form = document.getElementById("add-skill-form");
  const select = document.getElementById("skill-selection");
  if (!modal || !form) return;
  const loadOptions = () => populateSkillSelect(select).catch((error) => showToast(error.message, "error"));
  loadOptions();
  select.addEventListener("change", () => { document.getElementById("custom-skill-group").style.display = select.value === "__custom__" ? "block" : "none"; });
  const open = (type) => { document.querySelector(`input[name="skillType"][value="${type}"]`).checked = true; modal.classList.add("active"); };
  document.getElementById("btn-add-teach-skill")?.addEventListener("click", () => open("teach"));
  document.getElementById("btn-add-learn-skill")?.addEventListener("click", () => open("learn"));
  const close = () => { modal.classList.remove("active"); form.reset(); resetCustomSkillGroup(); };
  document.getElementById("btn-close-skill-modal")?.addEventListener("click", close); document.getElementById("btn-cancel-skill-modal")?.addEventListener("click", close);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const type = document.querySelector('input[name="skillType"]:checked').value;
      const wasCustom = select.value === "__custom__";
      let skillId = select.value;
      if (wasCustom) skillId = await resolveCustomSkillId(document.getElementById("custom-skill-name").value);
      if (!skillId) throw new Error("Please choose a skill.");
      await assignSkill(user.id, Number(skillId), type); close(); if (wasCustom) loadOptions(); await renderProfile(user); showToast("Skill added.", "success");
    } catch (error) { showToast(error.message, "error"); }
  });
}