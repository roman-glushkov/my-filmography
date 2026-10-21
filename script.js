"use strict";

// --- НАСТРОЙКИ APPWRITE ---
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6ad858a80004cc2cd83c";
const APPWRITE_DATABASE_ID = "6ad858c30026f7cdb4af"; // Твой реальный ID базы
const APPWRITE_TABLE_ID = "movies"; // ID таблицы

// Инициализация клиента
const client = new Appwrite.Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);

// ИСПОЛЬЗУЕМ КЛАСС DATABASES (он 100% есть в браузерной версии SDK)
const databases = new Appwrite.Databases(client);

// Константы для UI
const TYPE_LABELS = {
  film: "Фильм",
  series: "Сериал",
  anime: "Аниме",
  cartoon: "Мультфильм",
  universe: "Вселенная",
};
const TYPE_ICONS = {
  film: "🎬",
  series: "📺",
  anime: "🌸",
  cartoon: "🧸",
  universe: "🌌",
};
const STATUS_LABELS = {
  watched: "Просмотрено",
  watching: "Смотрю",
  planned: "Буду смотреть",
  dropped: "Брошено",
};
const STATUS_CLASSES = {
  watched: "status-watched",
  watching: "status-watching",
  planned: "status-planned",
  dropped: "status-dropped",
};

// Элементы DOM
const itemGrid = document.querySelector("#itemGrid");
const emptyState = document.querySelector("#emptyState");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyDescription = document.querySelector("#emptyDescription");
const resultCount = document.querySelector("#resultCount");
const totalCountElement = document.querySelector("#totalCount");
const watchingCountElement = document.querySelector("#watchingCount");
const watchedCountElement = document.querySelector("#watchedCount");
const searchInput = document.querySelector("#searchInput");
const typeFilter = document.querySelector("#typeFilter");
const statusFilter = document.querySelector("#statusFilter");
const sortFilter = document.querySelector("#sortFilter");
const modal = document.querySelector("#itemModal");
const itemForm = document.querySelector("#itemForm");
const itemIdInput = document.querySelector("#itemId");
const titleInput = document.querySelector("#titleInput");
const typeInput = document.querySelector("#typeInput");
const statusInput = document.querySelector("#statusInput");
const franchiseInput = document.querySelector("#franchiseInput");
const commentInput = document.querySelector("#commentInput");
const totalCountInput = document.querySelector("#totalCountInput");
const progressInput = document.querySelector("#progressInput");
const ratingInput = document.querySelector("#ratingInput");
const posterInput = document.querySelector("#posterInput");
const modalTitle = document.querySelector("#modalTitle");
const saveItemBtn = document.querySelector("#saveItemBtn");
const addItemBtn = document.querySelector("#addItemBtn");
const resetFiltersBtn = document.querySelector("#resetFiltersBtn");
const toast = document.querySelector("#toast");

let items = [];
let dataLoadError = false;
let toastTimeoutId = null;
let lastFocusedElement = null;

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadFromAppwrite() {
  try {
    // Используем databases.listDocuments
    const response = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID,
      [Appwrite.Query.limit(500)]
    );

    dataLoadError = false;
    // Appwrite возвращает массив в поле documents (а не rows)
    return response.documents.map((doc) =>
      normalizeItem({
        ...doc,
        id: doc.$id,
        createdAt: doc.$createdAt,
      })
    );
  } catch (error) {
    console.error("Ошибка загрузки из Appwrite:", error);
    dataLoadError = true;
    return [];
  }
}

// --- НОРМАЛИЗАЦИЯ ---
function normalizeItem(item) {
  return {
    id: typeof item.id === "string" && item.id ? item.id : generateId(),
    title: String(item.title || "").trim(),
    type: Object.hasOwn(TYPE_LABELS, item.type) ? item.type : "film",
    status: Object.hasOwn(STATUS_LABELS, item.status) ? item.status : "planned",
    franchise: typeof item.franchise === "string" ? item.franchise : "",
    totalCount:
      isOptionalNumber(item.totalCount) && item.totalCount >= 1
        ? item.totalCount
        : null,
    progress:
      isOptionalNumber(item.progress) && item.progress >= 0
        ? item.progress
        : null,
    rating:
      isOptionalNumber(item.rating) && item.rating >= 1 && item.rating <= 10
        ? item.rating
        : null,
    posterUrl: typeof item.posterUrl === "string" ? item.posterUrl : "",
    comment: typeof item.comment === "string" ? item.comment : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
  };
}

function isOptionalNumber(value) {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSafePosterUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function renderCreatedAt(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  const date = new Date(value);
  const shownDate = Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
  return `<p class="card-created">Добавлено: ${escapeHtml(shownDate)}</p>`;
}

// --- РЕНДЕР КАРТОЧКИ ---
function renderCard(item) {
  const posterUrl = getSafePosterUrl(item.posterUrl);
  const typeLabel = TYPE_LABELS[item.type] || TYPE_LABELS.film;
  const statusLabel = STATUS_LABELS[item.status] || STATUS_LABELS.planned;
  const statusClass = STATUS_CLASSES[item.status] || STATUS_CLASSES.planned;
  const icon = TYPE_ICONS[item.type] || TYPE_ICONS.film;
  const title = escapeHtml(item.title);
  const franchise = item.franchise.trim();
  const totalCount =
    isOptionalNumber(item.totalCount) && item.totalCount >= 1
      ? item.totalCount
      : null;
  const progress =
    isOptionalNumber(item.progress) && item.progress >= 0
      ? item.progress
      : null;
  const rating =
    isOptionalNumber(item.rating) && item.rating >= 1 && item.rating <= 10
      ? item.rating
      : null;
  const countText =
    totalCount !== null ? `${totalCount} серий / частей` : typeLabel;

  let progressMarkup = "";
  if (item.status === "watching") {
    const percentage =
      totalCount && progress !== null
        ? Math.min(100, Math.round((progress / totalCount) * 100))
        : 0;
    const progressLabel =
      progress === null
        ? "Прогресс не указан"
        : totalCount !== null
        ? `${progress} из ${totalCount}`
        : `${progress} просмотрено`;
    progressMarkup = `
      <div class="progress-block">
        <div class="progress-label"><span>Прогресс</span><strong>${escapeHtml(
          progressLabel
        )}</strong></div>
        <div class="progress-track" aria-label="Прогресс просмотра"><div class="progress-fill" style="width: ${percentage}%"></div></div>
      </div>`;
  }

  const ratingMarkup =
    rating !== null
      ? `<span class="card-rating" title="Личная оценка ${escapeHtml(
          rating
        )} из 10"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.55 4.43 1.08 6.27L12 17.15l-5.63 2.95 1.08-6.27L2.9 9.4l6.3-.9L12 2.8Z"/></svg>${escapeHtml(
          rating
        )}</span>`
      : "";
  const comment = item.comment.trim();
  const commentMarkup = comment
    ? `<p class="card-comment" title="${escapeHtml(comment)}">${escapeHtml(
        comment
      )}</p>`
    : "";
  const createdMarkup = renderCreatedAt(item.createdAt);

  return `
    <article class="media-card" data-card-id="${escapeHtml(item.id)}">
      <div class="poster${posterUrl ? " has-image" : ""}">
        <div class="poster-placeholder" aria-hidden="true">
          <span class="poster-placeholder-icon">${icon}</span>
          <span class="poster-placeholder-label">${escapeHtml(typeLabel)}</span>
        </div>
        ${
          posterUrl
            ? `<img class="card-poster" src="${escapeHtml(
                posterUrl
              )}" alt="Постер: ${title}" loading="lazy" referrerpolicy="no-referrer" />`
            : ""
        }
        <div class="card-badges">
          <span class="type-badge">${escapeHtml(typeLabel)}</span>
          <span class="status-badge ${statusClass}">${escapeHtml(
    statusLabel
  )}</span>
        </div>
      </div>
      <div class="card-content">
        <div class="card-topline">
          <span class="card-franchise" title="${escapeHtml(
            franchise || "Без франшизы"
          )}">${escapeHtml(franchise || "Личная коллекция")}</span>
          ${ratingMarkup}
        </div>
        <h3 class="card-title" title="${title}">${title}</h3>
        <p class="card-meta">${escapeHtml(countText)}</p>
        ${createdMarkup}
        ${progressMarkup}
        ${commentMarkup}
        <div class="card-actions">
          <button class="card-edit" type="button" data-action="edit" data-id="${escapeHtml(
            item.id
          )}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6 4 4M4 20l4.2-.8L19 8.4a2.12 2.12 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg> Редактировать</button>
          <button class="card-delete" type="button" data-action="delete" data-id="${escapeHtml(
            item.id
          )}" title="Удалить запись"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 12.1a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 7m4 4v5m4-5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </div>
      </div>
    </article>`;
}

// --- ФИЛЬТРАЦИЯ И РЕНДЕР СПИСКА ---
function getFilteredAndSortedItems() {
  const query = searchInput.value.trim().toLocaleLowerCase("ru");
  const selectedType = typeFilter.value;
  const selectedStatus = statusFilter.value;
  const sortMode = sortFilter.value;

  const filteredItems = items.filter((item) => {
    const searchableText = `${item.title} ${item.franchise || ""} ${
      item.comment || ""
    }`.toLocaleLowerCase("ru");
    const matchesSearch = !query || searchableText.includes(query);
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesStatus =
      selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const compareTitles = (first, second) =>
    first.title.localeCompare(second.title, "ru", { sensitivity: "base" });

  switch (sortMode) {
    case "title-desc":
      filteredItems.sort((a, b) => compareTitles(b, a));
      break;
    case "rating-desc":
      filteredItems.sort(
        (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || compareTitles(a, b)
      );
      break;
    case "count-desc":
      filteredItems.sort(
        (a, b) =>
          (b.totalCount ?? -1) - (a.totalCount ?? -1) || compareTitles(a, b)
      );
      break;
    case "franchise":
      filteredItems.sort((a, b) => {
        const fA = a.franchise.trim(),
          fB = b.franchise.trim();
        if (!fA && fB) return 1;
        if (fA && !fB) return -1;
        return (
          fA.localeCompare(fB, "ru", { sensitivity: "base" }) ||
          compareTitles(a, b)
        );
      });
      break;
    default:
      filteredItems.sort(compareTitles);
  }
  return filteredItems;
}

function renderItems() {
  const visibleItems = getFilteredAndSortedItems();
  const isGrouped = sortFilter.value === "franchise";

  totalCountElement.textContent = String(items.length);
  watchingCountElement.textContent = String(
    items.filter((i) => i.status === "watching").length
  );
  watchedCountElement.textContent = String(
    items.filter((i) => i.status === "watched").length
  );
  resultCount.textContent = formatRecordCount(visibleItems.length);

  itemGrid.innerHTML = "";
  emptyState.hidden = visibleItems.length > 0;
  itemGrid.hidden = visibleItems.length === 0;
  addItemBtn.disabled = dataLoadError;
  resetFiltersBtn.disabled = dataLoadError;

  if (visibleItems.length === 0) {
    if (dataLoadError) {
      emptyTitle.textContent = "Ошибка подключения к Appwrite";
      emptyDescription.textContent =
        "Проверьте настройки ID и права доступа (Any) в консоли Appwrite.";
      return;
    }
    emptyTitle.textContent =
      items.length === 0 ? "Коллекция пока пуста" : "Ничего не найдено";
    emptyDescription.textContent =
      items.length === 0
        ? "Добавьте первый фильм, сериал или аниме."
        : "Попробуйте изменить фильтры.";
    return;
  }

  if (!isGrouped) {
    itemGrid.className = "items-layout";
    itemGrid.innerHTML = `<div class="card-grid">${visibleItems
      .map(renderCard)
      .join("")}</div>`;
    return;
  }

  const groups = new Map();
  visibleItems.forEach((item) => {
    const name = item.franchise.trim() || "Без франшизы";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  });

  itemGrid.className = "items-layout grouped-layout";
  itemGrid.innerHTML = Array.from(groups.entries())
    .map(
      ([name, groupItems]) => `
    <section class="franchise-group" aria-label="Франшиза: ${escapeHtml(name)}">
      <h3 class="group-heading"><span>${escapeHtml(
        name
      )}</span><span class="group-count">${groupItems.length}</span></h3>
      <div class="card-grid">${groupItems.map(renderCard).join("")}</div>
    </section>`
    )
    .join("");
}

function formatRecordCount(count) {
  const lastTwo = count % 100,
    lastOne = count % 10;
  let noun = "записей";
  if (lastTwo < 11 || lastTwo > 14) {
    if (lastOne === 1) noun = "запись";
    else if (lastOne >= 2 && lastOne <= 4) noun = "записи";
  }
  return `${count} ${noun}`;
}

// --- ОПЕРАЦИИ С ДАННЫМИ ---
function getFormItemData(id) {
  const existingItem = items.find((i) => i.id === id);
  const readNum = (input) =>
    input.value.trim() === "" ? null : Number(input.value);
  return {
    id,
    title: titleInput.value.trim(),
    type: typeInput.value,
    status: statusInput.value,
    franchise: franchiseInput.value.trim(),
    totalCount: readNum(totalCountInput),
    progress: readNum(progressInput),
    rating: readNum(ratingInput),
    posterUrl: posterInput.value.trim(),
    comment: commentInput.value.trim(),
    createdAt: existingItem?.createdAt || new Date().toISOString(),
  };
}

async function addItem() {
  const formData = getFormItemData(generateId());
  const newItem = normalizeItem(formData);

  const payload = {
    title: newItem.title,
    type: newItem.type,
    status: newItem.status,
    franchise: newItem.franchise,
    totalCount: newItem.totalCount,
    progress: newItem.progress,
    rating: newItem.rating,
    posterUrl: newItem.posterUrl,
    comment: newItem.comment,
  };

  try {
    // Используем databases.createDocument
    const response = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID,
      Appwrite.ID.unique(),
      payload
    );
    items.push(
      normalizeItem({
        ...response,
        id: response.$id,
        createdAt: response.$createdAt,
      })
    );
    renderItems();
    closeModal();
    showToast("Запись добавлена в облако!");
  } catch (error) {
    console.error(error);
    showToast("Ошибка при добавлении. Проверьте консоль.");
  }
}

async function updateItem(id) {
  const itemIndex = items.findIndex((entry) => entry.id === id);
  if (itemIndex === -1) return;

  const formData = getFormItemData(id);
  const payload = {
    title: formData.title,
    type: formData.type,
    status: formData.status,
    franchise: formData.franchise,
    totalCount: formData.totalCount,
    progress: formData.progress,
    rating: formData.rating,
    posterUrl: formData.posterUrl,
    comment: formData.comment,
  };

  try {
    // Используем databases.updateDocument
    const response = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_TABLE_ID,
      id,
      payload
    );
    items[itemIndex] = normalizeItem({
      ...response,
      id: response.$id,
      createdAt: response.$createdAt,
    });
    renderItems();
    closeModal();
    showToast("Изменения сохранены в облаке!");
  } catch (error) {
    console.error(error);
    showToast("Ошибка при обновлении.");
  }
}

async function deleteItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item || !window.confirm(`Удалить «${item.title}»?`)) return;

  try {
    // Используем databases.deleteDocument
    await databases.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_TABLE_ID, id);
    items = items.filter((entry) => entry.id !== id);
    renderItems();
    showToast("Запись удалена из облака.");
  } catch (error) {
    console.error(error);
    showToast("Не удалось удалить запись.");
  }
}

// --- UI ЛОГИКА ---
function openModal() {
  if (dataLoadError) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => titleInput.focus(), 50);
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  itemForm.reset();
  itemIdInput.value = "";
  titleInput.setCustomValidity("");
  posterInput.setCustomValidity("");
  modalTitle.textContent = "Новая запись";
  saveItemBtn.textContent = "Сохранить запись";
  progressInput.removeAttribute("max");
  if (lastFocusedElement?.focus) lastFocusedElement.focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimeoutId) window.clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    toastTimeoutId = null;
  }, 3000);
}

function syncProgressLimit() {
  const total = Number(totalCountInput.value);
  if (totalCountInput.value.trim() && Number.isFinite(total) && total >= 1)
    progressInput.max = String(total);
  else progressInput.removeAttribute("max");
}

function resetFilters() {
  searchInput.value = "";
  typeFilter.value = "all";
  statusFilter.value = "all";
  sortFilter.value = "title-asc";
  renderItems();
}

function editItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  itemIdInput.value = item.id;
  titleInput.value = item.title;
  typeInput.value = item.type;
  statusInput.value = item.status;
  franchiseInput.value = item.franchise;
  commentInput.value = item.comment || "";
  totalCountInput.value = item.totalCount ?? "";
  progressInput.value = item.progress ?? "";
  ratingInput.value = item.rating ?? "";
  posterInput.value = item.posterUrl || "";
  modalTitle.textContent = "Редактировать запись";
  saveItemBtn.textContent = "Сохранить изменения";
  syncProgressLimit();
  openModal();
}

// --- СОБЫТИЯ ---
addItemBtn.addEventListener("click", () => {
  itemForm.reset();
  itemIdInput.value = "";
  modalTitle.textContent = "Новая запись";
  saveItemBtn.textContent = "Сохранить запись";
  openModal();
});

document.querySelector("#closeModalBtn").addEventListener("click", closeModal);
document.querySelector("#cancelModalBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
    return;
  }
  const activeTag = document.activeElement?.tagName;
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) &&
    !modal.classList.contains("is-open")
  ) {
    e.preventDefault();
    searchInput.focus();
  }
});

itemGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !itemGrid.contains(button)) return;
  const { action, id } = button.dataset;
  if (action === "edit") editItem(id);
  if (action === "delete") deleteItem(id);
});

itemGrid.addEventListener(
  "error",
  (event) => {
    if (
      event.target instanceof HTMLImageElement &&
      event.target.classList.contains("card-poster")
    ) {
      event.target.closest(".poster")?.classList.remove("has-image");
      event.target.remove();
    }
  },
  true
);

searchInput.addEventListener("input", renderItems);
typeFilter.addEventListener("change", renderItems);
statusFilter.addEventListener("change", renderItems);
sortFilter.addEventListener("change", renderItems);

titleInput.addEventListener("input", () => titleInput.setCustomValidity(""));
posterInput.addEventListener("input", () => posterInput.setCustomValidity(""));
totalCountInput.addEventListener("input", syncProgressLimit);

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  titleInput.setCustomValidity(
    titleInput.value.trim() ? "" : "Введите название."
  );
  syncProgressLimit();
  if (!itemForm.reportValidity()) return;
  if (posterInput.value.trim() && !getSafePosterUrl(posterInput.value.trim())) {
    posterInput.setCustomValidity("Укажите ссылку с http:// или https://");
    posterInput.reportValidity();
    return;
  }
  posterInput.setCustomValidity("");
  const editingId = itemIdInput.value;
  if (editingId) updateItem(editingId);
  else addItem();
});

resetFiltersBtn.addEventListener("click", () => {
  if (dataLoadError) return;
  if (items.length === 0) {
    itemForm.reset();
    itemIdInput.value = "";
    modalTitle.textContent = "Новая запись";
    saveItemBtn.textContent = "Сохранить запись";
    openModal();
    return;
  }
  resetFilters();
});

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initializeApp() {
  items = await loadFromAppwrite();
  renderItems();
  if (dataLoadError) showToast("Ошибка подключения к базе данных Appwrite.");
}

initializeApp();
