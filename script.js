let exhibits = [];

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

function parseDate(str) {
  if (!str) return 0;
  const parts = str.toLowerCase().split(" ");
  const month = MONTHS[parts[0]] || 0;
  const year = parseInt(parts[1]) || 0;
  return year * 12 + month;
}

function sortExhibits(field, dir) {
  exhibits.sort((a, b) => {
    let cmp;
    if (field === "favorite") {
      cmp =
        a.starred === b.starred
          ? parseDate(a.date) - parseDate(b.date)
          : a.starred
            ? 1
            : -1;
    } else if (field === "date") {
      cmp = parseDate(a.date) - parseDate(b.date);
    } else {
      cmp = (a[field] || "").localeCompare(b[field] || "");
    }
    return dir === "desc" ? -cmp : cmp;
  });
  renderGallery();
}

const playIcon = `<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>`;

function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  for (const exhibit of exhibits) {
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
        ${isVideo ? `<div class="play-button">${playIcon}</div>` : ""}
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

function openModal(type, src) {
  const modal = document.getElementById("modal");
  const image = document.getElementById("modal-image");
  const video = document.getElementById("modal-video");

  if (type === "video") {
    image.style.display = "none";
    video.style.display = "block";
    video.src = src;
    video.play();
  } else {
    video.style.display = "none";
    image.style.display = "block";
    image.src = src;
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

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

for (const btn of document.querySelectorAll(".sort-btn")) {
  btn.addEventListener("click", () => {
    const field = btn.dataset.sort;
    let dir = btn.dataset.dir;

    if (field === "favorite") {
      if (btn.classList.contains("active")) return;
    } else if (btn.classList.contains("active")) {
      dir = dir === "asc" ? "desc" : "asc";
      btn.dataset.dir = dir;
    }

    for (const b of document.querySelectorAll(".sort-btn")) {
      b.classList.remove("active");
    }

    btn.classList.add("active");
    if (field !== "favorite") {
      const arrow = dir === "asc" ? "↑" : "↓";
      const label = field.charAt(0).toUpperCase() + field.slice(1);
      btn.textContent = `${label} ${arrow}`;
    }

    sortExhibits(field, dir);
  });
}

fetch("exhibits.json")
  .then((res) => res.json())
  .then((data) => {
    for (const item of data) {
      const ext = item.file.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "mov", "webm"].includes(ext);
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
