// PetCare – simple pet tracker (data saved in LocalStorage)
const KEY = "petcare-data";
const ICONS = { Dog: "🐶", Cat: "🐱", Bird: "🐦", Rabbit: "🐰" };

// ---------- Dates ----------
const pad = n => String(n).padStart(2, "0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const offset = days => { const d = today(); d.setDate(d.getDate() + days); return toISO(d); };
const daysFrom = s => Math.round((parseDate(s) - today()) / 86400000); // negative = past
const fmtDate = s => s ? parseDate(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}
// Small badge showing how far away a date is
function dueBadge(s) {
  const n = daysFrom(s);
  if (n < 0) return `<span class="badge b-late">Overdue by ${-n} day${n === -1 ? "" : "s"}</span>`;
  if (n === 0) return `<span class="badge b-soon">Today</span>`;
  if (n <= 7) return `<span class="badge b-soon">In ${n} day${n === 1 ? "" : "s"}</span>`;
  return `<span class="badge b-ok">In ${n} days</span>`;
}

// ---------- Sample data (dates are relative to today) ----------
function sampleData() {
  return {
    pets: [
      { id: 1, name: "Mochi", species: "Dog", breed: "Shih Tzu", age: 3, gender: "Female", owner: "Maria Santos", contact: "0917 555 0142" },
      { id: 2, name: "Luna", species: "Cat", breed: "Persian", age: 2, gender: "Female", owner: "Maria Santos", contact: "0917 555 0142" },
      { id: 3, name: "Bruno", species: "Dog", breed: "Labrador", age: 5, gender: "Male", owner: "Jose Reyes", contact: "0928 555 0177" },
      { id: 4, name: "Coco", species: "Dog", breed: "Poodle", age: 1, gender: "Female", owner: "Ana Cruz", contact: "0935 555 0119" }
    ],
    appointments: [
      { id: 1, petId: 1, type: "Grooming", date: offset(2), time: "10:00", status: "Upcoming", notes: "Full groom and haircut" },
      { id: 2, petId: 3, type: "Checkup", date: offset(5), time: "14:30", status: "Upcoming", notes: "Yearly checkup" },
      { id: 3, petId: 2, type: "Vaccination", date: offset(9), time: "09:00", status: "Upcoming", notes: "" },
      { id: 4, petId: 4, type: "Dental", date: offset(-12), time: "11:00", status: "Completed", notes: "Teeth cleaning done" },
      { id: 5, petId: 1, type: "Consultation", date: offset(-30), time: "16:00", status: "Cancelled", notes: "Rescheduled by owner" }
    ],
    vaccinations: [
      { id: 1, petId: 1, vaccine: "Anti-Rabies", given: offset(-350), due: offset(15), notes: "Yearly booster" },
      { id: 2, petId: 2, vaccine: "FVRCP", given: offset(-180), due: offset(185), notes: "" },
      { id: 3, petId: 3, vaccine: "Bordetella", given: offset(-170), due: offset(10), notes: "Needed for boarding" },
      { id: 4, petId: 4, vaccine: "DHPP", given: offset(-60), due: offset(20), notes: "2nd dose" }
    ],
    reminders: [
      { id: 1, petId: 1, text: "Nail Trim", due: offset(1), status: "Pending" },
      { id: 2, petId: 3, text: "Bath", due: offset(3), status: "Pending" },
      { id: 3, petId: 2, text: "Medication Reminder", due: offset(7), status: "Pending" },
      { id: 4, petId: 4, text: "Grooming", due: offset(-3), status: "Completed" }
    ]
  };
}
function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.pets && saved.appointments && saved.vaccinations && saved.reminders) return saved;
  } catch (e) { /* ignore broken data */ }
  const fresh = sampleData();
  localStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}
let data = loadData();
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const nextId = list => list.reduce((max, x) => Math.max(max, x.id), 0) + 1;

// ---------- Helpers ----------
const $ = id => document.getElementById(id);
const esc = t => { const d = document.createElement("div"); d.textContent = t ?? ""; return d.innerHTML; };
const petName = id => (data.pets.find(p => p.id === id) || { name: "Unknown pet" }).name;
let toastTimer;
function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200);
}

// ---------- Forms (one modal, built from a description of each record type) ----------
const SCHEMA = {
  pet: { label: "Pet", list: "pets", fields: [
    { key: "name", label: "Pet name", type: "text", required: true },
    { key: "species", label: "Species", type: "select", options: ["Dog", "Cat", "Bird", "Rabbit", "Other"] },
    { key: "breed", label: "Breed", type: "text", required: true },
    { key: "age", label: "Age (years)", type: "number", required: true },
    { key: "gender", label: "Gender", type: "select", options: ["Female", "Male"] },
    { key: "owner", label: "Owner name", type: "text", required: true },
    { key: "contact", label: "Contact number", type: "tel", required: true }
  ] },
  appt: { label: "Appointment", list: "appointments", fields: [
    { key: "petId", label: "Pet", type: "pet" },
    { key: "type", label: "Appointment type", type: "select", options: ["Checkup", "Vaccination", "Grooming", "Dental", "Consultation", "Other"] },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "time", label: "Time", type: "time", required: true },
    { key: "status", label: "Status", type: "select", options: ["Upcoming", "Completed", "Cancelled"] },
    { key: "notes", label: "Notes", type: "textarea" }
  ] },
  vacc: { label: "Vaccination", list: "vaccinations", fields: [
    { key: "petId", label: "Pet", type: "pet" },
    { key: "vaccine", label: "Vaccine", type: "text", required: true, suggest: ["Anti-Rabies", "DHPP", "FVRCP", "Bordetella"] },
    { key: "given", label: "Date given", type: "date", required: true },
    { key: "due", label: "Next due date", type: "date" },
    { key: "notes", label: "Notes", type: "textarea" }
  ] },
  rem: { label: "Reminder", list: "reminders", fields: [
    { key: "petId", label: "Pet", type: "pet" },
    { key: "text", label: "Reminder", type: "text", required: true, suggest: ["Grooming", "Nail Trim", "Bath", "Medication Reminder", "Vaccination"] },
    { key: "due", label: "Due date", type: "date", required: true },
    { key: "status", label: "Status", type: "select", options: ["Pending", "Completed"] }
  ] }
};
let editing = null; // { kind, id }

function fieldHTML(f, value) {
  const v = value ?? "";
  const req = f.required ? "required" : "";
  const id = `f_${f.key}`;
  let input;
  if (f.type === "select" || f.type === "pet") {
    const opts = f.type === "pet"
      ? data.pets.map(p => ({ value: p.id, label: p.name }))
      : f.options.map(o => ({ value: o, label: o }));
    input = `<select id="${id}">${opts.map(o => `<option value="${esc(String(o.value))}" ${String(o.value) === String(v) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
  } else if (f.type === "textarea") {
    input = `<textarea id="${id}" rows="2" maxlength="150">${esc(v)}</textarea>`;
  } else {
    const extra = f.type === "number" ? 'min="0" step="any"' : 'maxlength="60"';
    const list = f.suggest ? `list="${id}_list"` : "";
    input = `<input id="${id}" type="${f.type}" value="${esc(String(v))}" ${req} ${extra} ${list}>` +
      (f.suggest ? `<datalist id="${id}_list">${f.suggest.map(s => `<option value="${s}">`).join("")}</datalist>` : "");
  }
  return `<label>${f.label}${input}</label>`;
}

function openForm(kind, id) {
  const schema = SCHEMA[kind];
  if (kind !== "pet" && data.pets.length === 0) return toast("Add a pet first");
  const record = id ? data[schema.list].find(r => r.id === id) : null;
  editing = { kind, id: id || null };
  $("formTitle").textContent = `${id ? "Edit" : "Add"} ${schema.label}`;
  const defaults = { petId: data.pets[0]?.id, status: kind === "rem" ? "Pending" : "Upcoming", due: kind === "vacc" ? "" : offset(1), date: offset(1) };
  $("formFields").innerHTML = schema.fields.map(f => fieldHTML(f, record ? record[f.key] : defaults[f.key])).join("");
  $("modal").hidden = false;
  $("formFields").querySelector("input, select").focus();
}
function closeForm() { $("modal").hidden = true; editing = null; }

$("form").addEventListener("submit", e => {
  e.preventDefault();
  const schema = SCHEMA[editing.kind];
  const values = {};
  for (const f of schema.fields) {
    let v = $(`f_${f.key}`).value.trim();
    if (f.required && !v) return toast(`${f.label} is required`);
    if (f.type === "pet") v = Number(v);
    if (f.type === "number") { v = parseFloat(v); if (isNaN(v) || v < 0) return toast("Enter a valid age"); }
    values[f.key] = v;
  }
  const list = data[schema.list];
  if (editing.id) {
    Object.assign(list.find(r => r.id === editing.id), values);
    toast(`${schema.label} updated`);
  } else {
    list.push({ id: nextId(list), ...values });
    toast(`${schema.label} added`);
  }
  save(); closeForm(); renderAll();
});
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeForm));
$("modal").addEventListener("click", e => { if (e.target === $("modal")) closeForm(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeForm(); });

// ---------- Navigation & button actions (one click listener for all buttons) ----------
document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".nav-btn, .view").forEach(el => el.classList.remove("active"));
  btn.classList.add("active");
  $(btn.dataset.view).classList.add("active");
}));

document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const { act, kind } = b.dataset;
  const id = Number(b.dataset.id);
  const schema = SCHEMA[kind];
  if (act === "add") openForm(kind);
  if (act === "edit") openForm(kind, id);
  if (act === "done") {
    data[schema.list].find(r => r.id === id).status = "Completed";
    save(); renderAll(); toast(`${schema.label} marked as completed`);
  }
  if (act === "del") {
    const msg = kind === "pet" ? "Delete this pet and all of its records?" : `Delete this ${schema.label.toLowerCase()}?`;
    if (!confirm(msg)) return;
    data[schema.list] = data[schema.list].filter(r => r.id !== id);
    if (kind === "pet") ["appointments", "vaccinations", "reminders"].forEach(l => (data[l] = data[l].filter(r => r.petId !== id)));
    save(); renderAll(); toast(`${schema.label} deleted`);
  }
});

const tools = (kind, id, canComplete) => `
  ${canComplete ? `<button class="small ok" data-act="done" data-kind="${kind}" data-id="${id}">Mark completed</button>` : ""}
  <button class="small" data-act="edit" data-kind="${kind}" data-id="${id}">Edit</button>
  <button class="small del" data-act="del" data-kind="${kind}" data-id="${id}">Delete</button>`;

// ---------- Dashboard ----------
function renderDashboard() {
  const upcomingAppts = data.appointments.filter(a => a.status === "Upcoming").length;
  const pending = data.reminders.filter(r => r.status === "Pending").length;
  $("stats").innerHTML = [
    ["Total Pets", data.pets.length], ["Upcoming Appointments", upcomingAppts],
    ["Vaccinations", data.vaccinations.length], ["Care Reminders", pending]
  ].map(([label, n]) => `<div class="card"><span>${label}</span><strong>${n}</strong></div>`).join("");

  // Combine appointments, vaccinations and reminders, then sort by date
  const items = [
    ...data.appointments.filter(a => a.status === "Upcoming").map(a => ({ kind: "Appointment", title: `${a.type} – ${petName(a.petId)}`, date: a.date, extra: fmtTime(a.time) })),
    ...data.vaccinations.filter(v => v.due).map(v => ({ kind: "Vaccination", title: `${v.vaccine} – ${petName(v.petId)}`, date: v.due, extra: "Booster due" })),
    ...data.reminders.filter(r => r.status === "Pending").map(r => ({ kind: "Reminder", title: `${r.text} – ${petName(r.petId)}`, date: r.due, extra: "" }))
  ].filter(i => daysFrom(i.date) >= -7) // show overdue items from the last week too
   .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  $("upcomingList").innerHTML = items.length
    ? items.map(i => `<li><span class="kind">${i.kind}</span>
        <div class="grow"><b>${esc(i.title)}</b><span>${fmtDate(i.date)}${i.extra ? " · " + i.extra : ""}</span></div>
        ${dueBadge(i.date)}</li>`).join("")
    : `<li class="empty">Nothing coming up. Add an appointment, vaccination or reminder.</li>`;
}

// ---------- Pets ----------
function renderPets() {
  const q = $("searchPet").value.trim().toLowerCase();
  const pets = data.pets.filter(p => [p.name, p.breed, p.species, p.owner].join(" ").toLowerCase().includes(q));
  $("petGrid").innerHTML = pets.length ? pets.map(p => `
    <div class="pet">
      <div class="icon">${ICONS[p.species] || "🐾"}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.species)} · ${esc(p.breed)}</p>
      <p>${p.age} yr${p.age === 1 ? "" : "s"} · ${p.gender}</p>
      <p>Owner: ${esc(p.owner)}</p>
      <p>${esc(p.contact)}</p>
      <div class="tools">${tools("pet", p.id)}</div>
    </div>`).join("") : `<p class="empty">No pets found. Add a pet to get started.</p>`;
}

// ---------- Appointments ----------
function renderAppointments() {
  const q = $("searchAppt").value.trim().toLowerCase();
  const status = $("filterStatus").value;
  const rows = data.appointments
    .filter(a => (!status || a.status === status) && [petName(a.petId), a.type, a.notes].join(" ").toLowerCase().includes(q))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $("apptBody").innerHTML = rows.length ? rows.map(a => `<tr>
      <td>${esc(petName(a.petId))}</td><td>${a.type}</td>
      <td>${fmtDate(a.date)}<br>${a.status === "Upcoming" ? dueBadge(a.date) : ""}</td>
      <td>${fmtTime(a.time)}</td>
      <td><span class="badge b-${a.status}">${a.status}</span></td>
      <td>${esc(a.notes) || "—"}</td>
      <td>${tools("appt", a.id, a.status === "Upcoming")}</td></tr>`).join("")
    : `<tr><td colspan="7" class="empty">No appointments found.</td></tr>`;
}

// ---------- Vaccinations ----------
function renderVaccinations() {
  const rows = [...data.vaccinations].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  $("vaccBody").innerHTML = rows.length ? rows.map(v => `<tr>
      <td>${esc(petName(v.petId))}</td><td>${esc(v.vaccine)}</td><td>${fmtDate(v.given)}</td>
      <td>${fmtDate(v.due)}<br>${v.due ? dueBadge(v.due) : ""}</td>
      <td>${esc(v.notes) || "—"}</td><td>${tools("vacc", v.id)}</td></tr>`).join("")
    : `<tr><td colspan="6" class="empty">No vaccination records yet.</td></tr>`;
}

// ---------- Reminders ----------
function renderReminders() {
  const rows = [...data.reminders].sort((a, b) => (a.status === b.status ? a.due.localeCompare(b.due) : a.status === "Pending" ? -1 : 1));
  $("remList").innerHTML = rows.length ? rows.map(r => `
    <li class="${r.status === "Completed" ? "done" : ""}">
      <div class="grow"><b>${esc(r.text)}</b><span>${esc(petName(r.petId))} · ${fmtDate(r.due)}</span></div>
      ${r.status === "Pending" ? dueBadge(r.due) : ""}
      <span class="badge b-${r.status}">${r.status}</span>
      <div>${tools("rem", r.id, r.status === "Pending")}</div></li>`).join("")
    : `<li class="empty">No reminders yet. Add one to stay on top of care.</li>`;
}

function renderAll() { renderDashboard(); renderPets(); renderAppointments(); renderVaccinations(); renderReminders(); }
$("searchPet").addEventListener("input", renderPets);
$("searchAppt").addEventListener("input", renderAppointments);
$("filterStatus").addEventListener("change", renderAppointments);
renderAll();
