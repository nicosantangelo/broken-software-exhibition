let exhibits = [];
let showOnlyFavorites = false;

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

function parseDate(dateString) {
  if (!dateString) return 0;

  const parts = dateString.toLowerCase().split(" ");
  const month = MONTHS[parts[0]] || 0;
  const year = parseInt(parts[1]) || 0;

  return year * 12 + month;
}

function sortExhibits(field, direction) {
  exhibits.sort((a, b) => {
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

const PLAY_ICON = `<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>`;

function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  const visibleExhibits = showOnlyFavorites
    ? exhibits.filter((exhibit) => exhibit.starred)
    : exhibits;

  for (const exhibit of visibleExhibits) {
    const card = document.createElement("div");
    card.className = "exhibit";
    const isVideo = exhibit.type === "video";

    const mediaContent = isVideo
      ? `<video src="${exhibit.video}" muted preload="metadata"></video>`
      : `<img src="${exhibit.image}" alt="${exhibit.title}">`;

    const meta = [exhibit.author, exhibit.date].filter(Boolean).join(", ");

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
      if (isVideo) {
        openModal("video", exhibit.video);
      } else {
        openModal("image", exhibit.image);
      }
    });

    gallery.appendChild(card);
  }
}

function openModal(type, source) {
  const modal = document.getElementById("modal");
  const image = document.getElementById("modal-image");
  const video = document.getElementById("modal-video");

  if (type === "video") {
    image.style.display = "none";
    video.style.display = "block";
    video.src = source;
    video.play();
  } else {
    video.style.display = "none";
    image.style.display = "block";
    image.src = source;
  }

  modal.classList.add("active");
}

function closeModal() {
  const modal = document.getElementById("modal");
  const image = document.getElementById("modal-image");
  const video = document.getElementById("modal-video");

  video.pause();
  video.src = "";
  video.style.display = "none";
  image.src = "";
  image.style.display = "none";
  modal.classList.remove("active");
}

document.getElementById("modal").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

for (const button of document.querySelectorAll(".sort-btn")) {
  button.addEventListener("click", () => {
    const field = button.dataset.sort;
    let direction = button.dataset.dir;

    if (button.classList.contains("active")) {
      direction = direction === "asc" ? "desc" : "asc";
      button.dataset.dir = direction;
    }

    for (const sortButton of document.querySelectorAll(".sort-btn")) {
      sortButton.classList.remove("active");
    }

    button.classList.add("active");

    const arrow = direction === "asc" ? "↑" : "↓";
    const label = field.charAt(0).toUpperCase() + field.slice(1);
    button.textContent = `${label} ${arrow}`;

    sortExhibits(field, direction);
  });
}

document.getElementById("favorite-filter").addEventListener("click", (event) => {
  showOnlyFavorites = !showOnlyFavorites;
  event.currentTarget.classList.toggle("active", showOnlyFavorites);
  renderGallery();
});

fetch("exhibits.json")
  .then((response) => response.json())
  .then((data) => {
    for (const item of data) {
      const extension = item.file.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "mov", "webm"].includes(extension);

      exhibits.push({
        image: `assets/${item.file}`,
        title: item.title || item.file,
        date: item.date || "",
        author: item.author || "",
        description: item.description || "",
        starred: !!item.starred,
        ...(isVideo ? { type: "video", video: `assets/${item.file}` } : {}),
      });
    }

    sortExhibits("date", "desc");
  });
