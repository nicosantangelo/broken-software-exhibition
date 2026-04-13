// Requires ALL_EXHIBITS and BASE_PATH from constants.js loaded before

// ----------------------------------------
// State & constants

const exhibits = [];
let showOnlyFavorites = false;
let currentModalIndex = -1;
let currentSort = { field: "random", direction: null };

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

// ----------------------------------------
// Path

function resolvePath(path) {
  return `${BASE_PATH}/${path}`;
}

// ----------------------------------------
// Date parsing & sorting

function parseDate(dateString) {
  if (!dateString) {
    return 0;
  }

  const parts = dateString.toLowerCase().split(" ");
  const month = MONTHS[parts[0]] || 0;
  const year = parseInt(parts[1]) || 0;

  return year * 12 + month;
}

function sortExhibits(field, direction) {
  exhibits.sort((a, b) => {
    if (field === "random") {
      return a.randomOrder - b.randomOrder;
    }

    let comparison;

    if (field === "date") {
      comparison = parseDate(a.date) - parseDate(b.date);
    } else {
      comparison = (a[field] || "").localeCompare(b[field] || "");
    }

    return direction === "desc" ? -comparison : comparison;
  });

  renderGallery();
}

// ----------------------------------------
// Gallery rendering

const PLAY_ICON = `<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>`;

function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  const visibleExhibits = getVisibleExhibits();

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < visibleExhibits.length; index++) {
    const exhibit = visibleExhibits[index];
    const isVideo = exhibit.type === "video";
    const loadingAttr = index < 6 ? 'fetchpriority="high"' : 'loading="lazy"';
    const videoPath = resolvePath(
      `assets/posters/${exhibit.file.replace(/\.mp4$/, ".jpg")}`,
    );
    const card = document.createElement("div");

    const mediaContent = isVideo
      ? `<video src="${exhibit.video}" muted preload="none" poster="${videoPath}"></video>`
      : `<img src="${exhibit.thumb}" alt="${exhibit.title}" ${loadingAttr} decoding="async">`;

    const meta = [exhibit.author, exhibit.date].filter(Boolean).join(", ");

    card.className = "exhibit";
    card.innerHTML = `
      <div class="exhibit-media${isVideo ? " is-video" : ""}">
        ${mediaContent}
        ${isVideo ? `<div class="play-button">${PLAY_ICON}</div>` : ""}
      </div>
      <div class="placard">
        <div class="title-row">
          <span class="title">${exhibit.title}</span>
          ${exhibit.starred ? `<span class="star-icon">★</span>` : ""}
        </div>
        <div class="description">${exhibit.description}</div>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </div>
    `;

    card.querySelector(".exhibit-media").addEventListener("click", () => {
      openModal(index);
    });

    fragment.appendChild(card);
  }

  gallery.appendChild(fragment);
}

// ----------------------------------------
// Modal

function getVisibleExhibits() {
  return showOnlyFavorites
    ? exhibits.filter((exhibit) => exhibit.starred)
    : exhibits;
}

function updateHash(filename) {
  history.pushState(null, "", "#" + encodeURIComponent(filename));
}

function replaceHash(filename) {
  history.replaceState(null, "", "#" + encodeURIComponent(filename));
}

function clearHash() {
  const sortHash = buildSortHash();
  if (sortHash) {
    history.pushState(null, "", "#" + sortHash);
  } else {
    history.pushState(null, "", window.location.pathname);
  }
}

const SORT_TOKENS = new Set([
  "date-asc",
  "date-desc",
  "author-asc",
  "author-desc",
]);

function parseHash(hash) {
  if (!hash) {
    return { sort: null, filename: null };
  }

  if (hash.includes(".")) {
    return { sort: null, filename: hash };
  }

  if (SORT_TOKENS.has(hash)) {
    const separatorIndex = hash.lastIndexOf("-");
    return {
      sort: {
        field: hash.slice(0, separatorIndex),
        direction: hash.slice(separatorIndex + 1),
      },
      filename: null,
    };
  }

  return { sort: null, filename: null };
}

function buildSortHash() {
  if (currentSort.field === "random") {
    return "";
  }

  return currentSort.field + "-" + currentSort.direction;
}

function pushSortHash() {
  const sortHash = buildSortHash();
  if (sortHash) {
    history.pushState(null, "", "#" + sortHash);
  } else {
    history.pushState(null, "", window.location.pathname);
  }
}

function applySortFromHash(field, direction) {
  for (const button of document.querySelectorAll(".sort-btn")) {
    button.classList.remove("active");
  }

  const matchingButton = document.querySelector(
    `.sort-btn[data-sort="${field}"]`,
  );
  if (matchingButton) {
    matchingButton.classList.add("active");

    if (field !== "random") {
      matchingButton.dataset.dir = direction;

      const arrow = direction === "asc" ? "↑" : "↓";
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      matchingButton.textContent = `${arrow} ${label}`;
    }
  }

  currentSort = { field, direction };
  sortExhibits(field, direction);
}

function openModal(index) {
  currentModalIndex = index;
  showModalContent();
  document.getElementById("modal").classList.add("active");

  const visibleExhibits = getVisibleExhibits();
  updateHash(visibleExhibits[currentModalIndex].file);
}

function showModalContent() {
  const visibleExhibits = getVisibleExhibits();
  const exhibit = visibleExhibits[currentModalIndex];
  const image = document.getElementById("modal-image");
  const video = document.getElementById("modal-video");

  document.getElementById("modal-title").textContent = exhibit.title;
  document.getElementById("modal-description").textContent =
    exhibit.description;

  video.pause();
  video.src = "";

  if (exhibit.type === "video") {
    image.style.display = "none";
    video.style.display = "block";
    video.src = exhibit.video;
    video.play();
  } else {
    video.style.display = "none";
    image.style.display = "block";
    image.src = exhibit.image;
  }
}

function navigateModal(direction) {
  const visibleExhibits = getVisibleExhibits();
  const count = visibleExhibits.length;
  if (count === 0) {
    return;
  }

  currentModalIndex = (currentModalIndex + direction + count) % count;
  showModalContent();

  replaceHash(visibleExhibits[currentModalIndex].file);
}

function silentCloseModal() {
  const modal = document.getElementById("modal");
  const image = document.getElementById("modal-image");
  const video = document.getElementById("modal-video");

  video.pause();
  video.src = "";
  video.style.display = "none";
  image.src = "";
  image.style.display = "none";
  modal.classList.remove("active");

  const cards = document.getElementById("gallery").children;
  if (currentModalIndex >= 0 && currentModalIndex < cards.length) {
    cards[currentModalIndex].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }
}

function closeModal() {
  silentCloseModal();
  clearHash();
}

function openModalByFile(filename) {
  const exhibit = exhibits.find((e) => e.file === filename);
  if (!exhibit) {
    return;
  }

  if (showOnlyFavorites && !exhibit.starred) {
    showOnlyFavorites = false;
    document.getElementById("favorite-filter").classList.remove("active");
    renderGallery();
  }

  const visibleExhibits = getVisibleExhibits();
  const index = visibleExhibits.indexOf(exhibit);
  if (index === -1) {
    return;
  }

  currentModalIndex = index;
  showModalContent();
  document.getElementById("modal").classList.add("active");
}

// ----------------------------------------
// Event listeners

document.getElementById("modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    closeModal();
  }
});

document.getElementById("modal-image").addEventListener("click", () => {
  if (window.innerWidth <= 560) {
    closeModal();
  }
});

document.getElementById("modal-prev").addEventListener("click", () => {
  navigateModal(-1);
});

document.getElementById("modal-next").addEventListener("click", () => {
  navigateModal(1);
});

document.addEventListener("keydown", (event) => {
  if (!document.getElementById("modal").classList.contains("active")) {
    return;
  }
  if (event.key === "Escape") {
    closeModal();
  }
  if (event.key === "ArrowLeft") {
    navigateModal(-1);
  }
  if (event.key === "ArrowRight") {
    navigateModal(1);
  }
});

window.addEventListener("popstate", () => {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const { sort, filename } = parseHash(hash);

  if (sort) {
    if (
      sort.field !== currentSort.field ||
      sort.direction !== currentSort.direction
    ) {
      applySortFromHash(sort.field, sort.direction);
    }
    silentCloseModal();
  } else if (filename) {
    openModalByFile(filename);
  } else {
    silentCloseModal();

    if (currentSort.field !== "random") {
      applySortFromHash("random", null);
    }
  }
});

// ----------------------------------------
// Sort & filter controls

for (const button of document.querySelectorAll(".sort-btn")) {
  button.addEventListener("click", () => {
    const field = button.dataset.sort;

    if (button.classList.contains("active")) {
      if (field === "random") {
        return;
      }

      let direction = button.dataset.dir === "asc" ? "desc" : "asc";
      button.dataset.dir = direction;

      const arrow = direction === "asc" ? "↑" : "↓";
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      button.textContent = `${arrow} ${label}`;

      currentSort = { field, direction };
      sortExhibits(field, direction);
      pushSortHash();
      return;
    }

    for (const sortButton of document.querySelectorAll(".sort-btn")) {
      sortButton.classList.remove("active");
    }
    button.classList.add("active");

    const direction = button.dataset.dir || null;
    currentSort = { field, direction };
    sortExhibits(field, direction);
    pushSortHash();
  });
}

document
  .getElementById("favorite-filter")
  .addEventListener("click", (event) => {
    showOnlyFavorites = !showOnlyFavorites;
    event.currentTarget.classList.toggle("active", showOnlyFavorites);
    renderGallery();
  });

// ----------------------------------------
// Initialization

function loadExhibits(allExhibits) {
  for (const item of allExhibits) {
    const extension = item.file.split(".").pop().toLowerCase();
    const isVideo = ["mp4", "mov", "webm"].includes(extension);
    const baseName = item.file.substring(0, item.file.lastIndexOf("."));

    exhibits.push({
      file: item.file,
      image: resolvePath(`assets/${item.file}`),
      thumb: resolvePath(`assets/thumbs/${baseName}.jpg`),
      title: item.title || item.file,
      date: item.date || "",
      author: item.author || "",
      description: item.description || "",
      starred: !!item.starred,
      randomOrder: Math.random(),
      ...(isVideo
        ? { type: "video", video: resolvePath(`assets/${item.file}`) }
        : {}),
    });
  }

  const initialHash = decodeURIComponent(window.location.hash.slice(1));
  const { sort: initialSort, filename: initialFilename } =
    parseHash(initialHash);

  if (initialFilename) {
    const hashExhibit = exhibits.find((e) => e.file === initialFilename);
    if (hashExhibit) {
      hashExhibit.randomOrder = -1;
    }
  }

  document.getElementById("exhibit-count").textContent =
    `Exhibiting ${exhibits.length} pieces`;

  if (initialSort) {
    applySortFromHash(initialSort.field, initialSort.direction);
  } else {
    sortExhibits("random");
  }

  if (initialFilename) {
    openModalByFile(initialFilename);
  }
}

if (ALL_EXHIBITS) {
  loadExhibits(ALL_EXHIBITS);
} else {
  fetch("exhibits.json")
    .then((response) => response.json())
    .then(loadExhibits);
}
