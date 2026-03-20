const STORAGE_KEY = "gestion-usuarios-app";
const THEME_STORAGE_KEY = "gestion-usuarios-theme";
const DEFAULT_PAGE_SIZE = 5;
const DELETE_ANIMATION_MS = 240;

const elements = {
  themeToggleButton: document.getElementById("themeToggleButton"),
  formPanel: document.getElementById("formPanel"),
  form: document.getElementById("userForm"),
  userId: document.getElementById("userId"),
  nombre: document.getElementById("nombre"),
  email: document.getElementById("email"),
  rol: document.getElementById("rol"),
  estado: document.getElementById("estado"),
  submitButton: document.getElementById("submitButton"),
  resetButton: document.getElementById("resetButton"),
  formTitle: document.getElementById("formTitle"),
  searchInput: document.getElementById("searchInput"),
  roleFilter: document.getElementById("roleFilter"),
  statusFilter: document.getElementById("statusFilter"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  resultsSummary: document.getElementById("resultsSummary"),
  statsTotal: document.getElementById("statsTotal"),
  statsAdmin: document.getElementById("statsAdmin"),
  statsUser: document.getElementById("statsUser"),
  statsActive: document.getElementById("statsActive"),
  statsInactive: document.getElementById("statsInactive"),
  tableBody: document.getElementById("usersTableBody"),
  cards: document.getElementById("usersCards"),
  table: document.querySelector(".table-wrapper table"),
  pagination: document.getElementById("pagination"),
  loader: document.getElementById("loader"),
  confirmModal: document.getElementById("confirmModal"),
  closeModalButton: document.getElementById("closeModalButton"),
  cancelDeleteButton: document.getElementById("cancelDeleteButton"),
  confirmDeleteButton: document.getElementById("confirmDeleteButton"),
  confirmMessage: document.getElementById("confirmMessage"),
  toastContainer: document.getElementById("toastContainer"),
  sortHeaders: Array.from(document.querySelectorAll("th[data-sort-key]"))
};

const validators = {
  nombre(value) {
    if (!value.trim()) return "El nombre es obligatorio";
    if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres";
    return "";
  },
  email(value, currentId) {
    const email = value.trim().toLowerCase();

    if (!email) return "El email es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Introduce un email valido";

    const exists = state.users.some(
      (user) => user.email === email && user.id !== currentId
    );

    return exists ? "Ya existe un usuario con ese email" : "";
  }
};

const initialUsers = [
  { id: crypto.randomUUID(), nombre: "Ana García", email: "ana.garcia@email.com", rol: "admin", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Luis Martín", email: "luis.martin@email.com", rol: "user", estado: "inactivo" },
  { id: crypto.randomUUID(), nombre: "Carlos Romero", email: "carlos.romero@email.com", rol: "admin", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Marta López", email: "marta.lopez@email.com", rol: "user", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Javier Sánchez", email: "javier.sanchez@email.com", rol: "user", estado: "inactivo" },
  { id: crypto.randomUUID(), nombre: "Lucía Fernández", email: "lucia.fernandez@email.com", rol: "admin", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Pablo Navarro", email: "pablo.navarro@email.com", rol: "user", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Elena Ruiz", email: "elena.ruiz@email.com", rol: "user", estado: "inactivo" },
  { id: crypto.randomUUID(), nombre: "Eva Castellano", email: "eva.castellano@email.com", rol: "admin", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Sofía Castro", email: "sofia.castro@email.com", rol: "user", estado: "activo" },
  { id: crypto.randomUUID(), nombre: "Raúl Ortega", email: "raul.ortega@email.com", rol: "user", estado: "inactivo" }
];

const state = {
  users: [],
  filters: {
    search: "",
    role: "",
    status: ""
  },
  pagination: {
    currentPage: 1,
    pageSize: DEFAULT_PAGE_SIZE
  },
  sorting: {
    key: "createdAt",
    direction: "desc",
    source: "select"
  },
  pendingDeleteId: null,
  animatedUserId: null
};

let searchDebounce;

function showLoader(show) {
  elements.loader.classList.toggle("hidden", !show);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  elements.themeToggleButton.setAttribute(
    "aria-label",
    theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"
  );
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
  applyTheme(storedTheme);
}

function showToast(message, type = "info") {
  const toast = document.createElement("article");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3400);
}

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      const seededUsers = initialUsers.map((user, index) => ({
        ...user,
        createdAt: Date.now() - (initialUsers.length - index) * 1000
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seededUsers));
      return seededUsers;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((user, index) => ({
      ...user,
      createdAt: user.createdAt || Date.now() - (parsed.length - index) * 1000
    }));
  } catch {
    return [];
  }
}

function persistUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.users));
}

function setFieldError(field, message) {
  const errorElement = document.querySelector(`[data-error-for="${field}"]`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((item) => {
    item.textContent = "";
  });
}

function validateForm() {
  clearErrors();
  const currentId = elements.userId.value;
  let valid = true;

  const nameMessage = validators.nombre(elements.nombre.value);
  const emailMessage = validators.email(elements.email.value, currentId);

  if (nameMessage) {
    setFieldError("nombre", nameMessage);
    valid = false;
  }

  if (emailMessage) {
    setFieldError("email", emailMessage);
    valid = false;
  }

  return valid;
}

function createBadge(content, className) {
  return `<span class="badge ${className}">${content}</span>`;
}

function updateSummaryStats() {
  const total = state.users.length;
  const admin = state.users.filter((user) => user.rol === "admin").length;
  const standard = state.users.filter((user) => user.rol === "user").length;
  const active = state.users.filter((user) => user.estado === "activo").length;
  const inactive = state.users.filter((user) => user.estado === "inactivo").length;

  elements.statsTotal.textContent = String(total);
  elements.statsAdmin.textContent = String(admin);
  elements.statsUser.textContent = String(standard);
  elements.statsActive.textContent = String(active);
  elements.statsInactive.textContent = String(inactive);
}

function measureTextWidth(text, font) {
  const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  return context.measureText(text).width;
}

function updateTableColumnWidths() {
  if (!elements.table || !state.users.length) return;

  const tableStyle = window.getComputedStyle(elements.table);
  const font = `${tableStyle.fontWeight} ${tableStyle.fontSize} ${tableStyle.fontFamily}`;
  const longestName = state.users.reduce(
    (current, user) => (user.nombre.length > current.length ? user.nombre : current),
    "Nombre"
  );
  const longestEmail = state.users.reduce(
    (current, user) => (user.email.length > current.length ? user.email : current),
    "Email"
  );

  const nameWidth = Math.ceil(measureTextWidth(longestName, font) + 40);
  const emailWidth = Math.ceil(measureTextWidth(longestEmail, font) + 40);

  elements.table.style.setProperty("--name-col-width", `${nameWidth}px`);
  elements.table.style.setProperty("--email-col-width", `${emailWidth}px`);
}

function getVisibleState() {
  const filteredUsers = state.users.filter((user) => {
    const matchesSearch =
      !state.filters.search ||
      user.nombre.toLowerCase().includes(state.filters.search) ||
      user.email.toLowerCase().includes(state.filters.search);
    const matchesRole = !state.filters.role || user.rol === state.filters.role;
    const matchesStatus = !state.filters.status || user.estado === state.filters.status;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => compareUsers(a, b));
  const total = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pagination.pageSize));

  if (state.pagination.currentPage > totalPages) {
    state.pagination.currentPage = totalPages;
  }

  const startIndex = total === 0 ? 0 : (state.pagination.currentPage - 1) * state.pagination.pageSize;
  const endIndex = Math.min(startIndex + state.pagination.pageSize, total);

  return {
    filteredUsers: sortedUsers,
    paginatedUsers: sortedUsers.slice(startIndex, endIndex),
    total,
    totalPages,
    startIndex,
    endIndex
  };
}

function compareUsers(a, b) {
  const { key, direction } = state.sorting;
  const factor = direction === "asc" ? 1 : -1;

  if (key === "createdAt") {
    return (a.createdAt - b.createdAt) * factor;
  }

  if (key === "nombre" || key === "email" || key === "rol" || key === "estado") {
    return a[key].localeCompare(b[key], "es") * factor;
  }

  return 0;
}

function updateSortIndicators() {
  elements.sortHeaders.forEach((header) => {
    const key = header.dataset.sortKey;
    const indicator = header.querySelector(".sort-indicator");
    const isActive = state.sorting.key === key;

    header.classList.toggle("is-sorted", isActive);

    if (!indicator) return;
    indicator.textContent = isActive ? (state.sorting.direction === "asc" ? "↑" : "↓") : "";
  });
}

function renderResultsSummary({ total, startIndex, endIndex }) {
  const start = total === 0 ? 0 : startIndex + 1;
  const end = total === 0 ? 0 : endIndex;
  elements.resultsSummary.textContent = `Mostrando ${start}–${end} de ${total} usuarios`;
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    elements.pagination.innerHTML = "";
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  elements.pagination.innerHTML = `
    <button class="page-button" data-page-nav="prev" ${state.pagination.currentPage === 1 ? "disabled" : ""}>
      Anterior
    </button>
    <div class="page-numbers">
      ${pages
        .map(
          (page) => `
            <button class="page-button ${page === state.pagination.currentPage ? "is-active" : ""}" data-page="${page}">
              ${page}
            </button>
          `
        )
        .join("")}
    </div>
    <button class="page-button" data-page-nav="next" ${state.pagination.currentPage === totalPages ? "disabled" : ""}>
      Siguiente
    </button>
  `;
}

function renderEmptyState(total = 0) {
  elements.tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-state">No se encontraron usuarios.</td>
    </tr>
  `;
  elements.cards.innerHTML = `<div class="empty-state">No se encontraron usuarios.</div>`;
  elements.pagination.innerHTML = "";
  renderResultsSummary({ total, startIndex: 0, endIndex: 0 });
}

function renderTableRows(users) {
  elements.tableBody.innerHTML = users
    .map((user) => {
      const animatedClass = state.animatedUserId === user.id ? "is-entering" : "";
      return `
        <tr class="${animatedClass}" data-user-id="${user.id}">
          <td class="table-name">${user.nombre}</td>
          <td>${user.email}</td>
          <td>${createBadge(user.rol, `role-${user.rol}`)}</td>
          <td>${createBadge(user.estado, `status-${user.estado}`)}</td>
          <td>
            <div class="actions">
              <button class="action-button action-edit" data-action="edit" data-id="${user.id}">
                Editar
              </button>
              <button class="action-button action-delete" data-action="delete" data-id="${user.id}">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderCards(users) {
  elements.cards.innerHTML = users
    .map((user) => {
      const animatedClass = state.animatedUserId === user.id ? "is-entering" : "";
      return `
        <article class="user-card ${animatedClass}" data-user-id="${user.id}">
          <div class="user-card-header">
            <h3 class="user-card-title">${user.nombre}</h3>
            ${createBadge(user.estado, `status-${user.estado}`)}
          </div>
          <p class="user-card-email">${user.email}</p>
          <div class="user-card-meta">
            ${createBadge(user.rol, `role-${user.rol}`)}
          </div>
          <div class="actions">
            <button class="action-button action-edit" data-action="edit" data-id="${user.id}">
              Editar
            </button>
            <button class="action-button action-delete" data-action="delete" data-id="${user.id}">
              Eliminar
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function clearEntryAnimation() {
  if (!state.animatedUserId) return;

  requestAnimationFrame(() => {
    document
      .querySelectorAll(`[data-user-id="${state.animatedUserId}"]`)
      .forEach((element) => element.classList.remove("is-entering"));
    state.animatedUserId = null;
  });
}

function renderUsers() {
  const visibleState = getVisibleState();
  const { paginatedUsers, total, totalPages, startIndex, endIndex } = visibleState;

  updateSortIndicators();
  renderResultsSummary({ total, startIndex, endIndex });
  updateSummaryStats();

  if (!paginatedUsers.length) {
    renderEmptyState(total);
    return;
  }

  renderTableRows(paginatedUsers);
  renderCards(paginatedUsers);
  renderPagination(totalPages);
  updateTableColumnWidths();
  clearEntryAnimation();
}

function resetForm() {
  elements.form.reset();
  elements.userId.value = "";
  elements.rol.value = "user";
  elements.estado.value = "activo";
  elements.formTitle.textContent = "Crear usuario";
  elements.submitButton.textContent = "Guardar usuario";
  elements.resetButton.textContent = "Limpiar";
  clearErrors();
}

function fillForm(user) {
  elements.userId.value = user.id;
  elements.nombre.value = user.nombre;
  elements.email.value = user.email;
  elements.rol.value = user.rol;
  elements.estado.value = user.estado;
  elements.formTitle.textContent = "Editar usuario";
  elements.submitButton.textContent = "Actualizar usuario";
  elements.resetButton.textContent = "Cancelar";
  elements.formPanel.classList.remove("form-panel-highlight");
  void elements.formPanel.offsetWidth;
  elements.formPanel.classList.add("form-panel-highlight");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openDeleteModal(user) {
  state.pendingDeleteId = user.id;
  elements.confirmMessage.textContent = `¿Seguro que quieres eliminar a ${user.nombre}? Esta acción no se puede deshacer.`;
  elements.confirmModal.classList.remove("hidden");
  elements.confirmModal.setAttribute("aria-hidden", "false");
}

function closeDeleteModal() {
  state.pendingDeleteId = null;
  elements.confirmModal.classList.add("hidden");
  elements.confirmModal.setAttribute("aria-hidden", "true");
}

function saveUser(payload) {
  const currentId = elements.userId.value;

  if (currentId) {
    state.users = state.users.map((user) =>
      user.id === currentId ? { ...user, ...payload } : user
    );
    showToast("Usuario actualizado correctamente", "success");
  } else {
    const newUser = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...payload
    };
    state.users.unshift(newUser);
    state.pagination.currentPage = 1;
    state.animatedUserId = newUser.id;
    showToast("Usuario creado correctamente", "success");
  }

  persistUsers();
  resetForm();
  renderUsers();
}

function removeUser(id) {
  state.users = state.users.filter((user) => user.id !== id);
  persistUsers();

  if (elements.userId.value === id) {
    resetForm();
  }

  renderUsers();
  showToast("Usuario eliminado correctamente", "success");
  closeDeleteModal();
}

function waitForRemovalAnimation(id) {
  const targets = document.querySelectorAll(`[data-user-id="${id}"]`);

  if (!targets.length) {
    removeUser(id);
    return;
  }

  let resolved = false;
  let completed = 0;
  const totalTargets = targets.length;

  const finish = () => {
    if (resolved) return;
    completed += 1;
    if (completed >= totalTargets) {
      resolved = true;
      removeUser(id);
    }
  };

  targets.forEach((target) => {
    const onAnimationEnd = () => {
      target.removeEventListener("animationend", onAnimationEnd);
      finish();
    };

    target.addEventListener("animationend", onAnimationEnd, { once: true });
    target.classList.add("is-removing");
  });

  setTimeout(() => {
    if (!resolved && completed < totalTargets) {
      resolved = true;
      removeUser(id);
    }
  }, DELETE_ANIMATION_MS + 60);
}

function handleSubmit(event) {
  event.preventDefault();

  if (!validateForm()) {
    showToast("Revisa los campos del formulario", "error");
    return;
  }

  const payload = {
    nombre: elements.nombre.value.trim(),
    email: elements.email.value.trim().toLowerCase(),
    rol: elements.rol.value,
    estado: elements.estado.value
  };

  showLoader(true);

  setTimeout(() => {
    saveUser(payload);
    showLoader(false);
  }, 180);
}

function handleActionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const user = state.users.find((item) => item.id === id);
  if (!user) return;

  if (action === "edit") {
    fillForm(user);
    showToast("Usuario cargado para edición", "info");
  }

  if (action === "delete") {
    openDeleteModal(user);
  }
}

function handleHeaderSort(event) {
  const header = event.target.closest("th[data-sort-key]");
  if (!header) return;

  const key = header.dataset.sortKey;
  const isSameKey = state.sorting.key === key;
  const nextDirection = isSameKey && state.sorting.direction === "asc" ? "desc" : "asc";

  state.sorting = {
    key,
    direction: nextDirection,
    source: "header"
  };

  state.pagination.currentPage = 1;
  renderUsers();
}

function initializeApp() {
  showLoader(true);
  elements.pageSizeSelect.value = String(state.pagination.pageSize);

  setTimeout(() => {
    state.users = getStoredUsers();
    renderUsers();
    resetForm();
    showLoader(false);
  }, 240);
}

elements.form.addEventListener("submit", handleSubmit);
elements.themeToggleButton.addEventListener("click", toggleTheme);
elements.resetButton.addEventListener("click", resetForm);
elements.tableBody.addEventListener("click", handleActionClick);
elements.cards.addEventListener("click", handleActionClick);
elements.sortHeaders.forEach((header) => header.addEventListener("click", handleHeaderSort));

["nombre", "email"].forEach((field) => {
  elements[field].addEventListener("input", () => {
    const currentId = elements.userId.value;
    const message =
      field === "email"
        ? validators.email(elements[field].value, currentId)
        : validators.nombre(elements[field].value);
    setFieldError(field, message);
  });
});

elements.searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.filters.search = elements.searchInput.value.trim().toLowerCase();
    state.pagination.currentPage = 1;
    renderUsers();
  }, 180);
});

elements.roleFilter.addEventListener("change", () => {
  state.filters.role = elements.roleFilter.value;
  state.pagination.currentPage = 1;
  renderUsers();
});

elements.statusFilter.addEventListener("change", () => {
  state.filters.status = elements.statusFilter.value;
  state.pagination.currentPage = 1;
  renderUsers();
});

elements.pageSizeSelect.addEventListener("change", () => {
  state.pagination.pageSize = Number(elements.pageSizeSelect.value);
  state.pagination.currentPage = 1;
  renderUsers();
});

elements.pagination.addEventListener("click", (event) => {
  const pageButton = event.target.closest("button[data-page]");
  const navButton = event.target.closest("button[data-page-nav]");
  const { total } = getVisibleState();
  const totalPages = Math.max(1, Math.ceil(total / state.pagination.pageSize));

  if (pageButton) {
    state.pagination.currentPage = Number(pageButton.dataset.page);
    renderUsers();
  }

  if (navButton) {
    if (navButton.dataset.pageNav === "prev" && state.pagination.currentPage > 1) {
      state.pagination.currentPage -= 1;
    }

    if (navButton.dataset.pageNav === "next" && state.pagination.currentPage < totalPages) {
      state.pagination.currentPage += 1;
    }

    renderUsers();
  }
});

elements.closeModalButton.addEventListener("click", closeDeleteModal);
elements.cancelDeleteButton.addEventListener("click", closeDeleteModal);
elements.confirmDeleteButton.addEventListener("click", () => {
  if (state.pendingDeleteId) {
    waitForRemovalAnimation(state.pendingDeleteId);
  }
});

elements.confirmModal.addEventListener("click", (event) => {
  if (event.target === elements.confirmModal) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.confirmModal.classList.contains("hidden")) {
    closeDeleteModal();
  }
});

initializeTheme();
initializeApp();
