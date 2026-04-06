let exhibits = [];

const playIcon = `<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>`;

function renderGallery() {
  const gallery = document.getElementById("gallery");

  exhibits.forEach((exhibit) => {
    const card = document.createElement("div");
    card.className = "exhibit";
    const isVideo = exhibit.type === "video";

    const mediaContent = isVideo
      ? `<video src="${exhibit.video}" muted preload="metadata" style="width:100%;display:block;border:1px solid #1a1a1a;"></video>`
      : `<img src="${exhibit.image}" alt="${exhibit.title}">`;

    const meta = [exhibit.author, exhibit.date].filter(Boolean).join(", ");

    card.innerHTML = `
      <div class="exhibit-media${isVideo ? " is-video" : ""}">
        ${mediaContent}
        ${isVideo ? `<div class="play-button">${playIcon}</div>` : ""}
      </div>
      <div class="placard">
        <div class="title">${exhibit.title}</div>
        <div class="description">${exhibit.description}</div>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </div>
    `;

    if (isVideo) {
      card.querySelector(".exhibit-media").addEventListener("click", () => {
        openModal(exhibit.video);
      });
    }

    gallery.appendChild(card);
  });
}

function openModal(videoSrc) {
  const modal = document.getElementById("modal");
  const video = document.getElementById("modal-video");
  video.src = videoSrc;
  modal.classList.add("active");
  video.play();
}

function closeModal() {
  const modal = document.getElementById("modal");
  const video = document.getElementById("modal-video");
  video.pause();
  video.src = "";
  modal.classList.remove("active");
}

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

fetch("exhibits.json")
  .then((res) => res.json())
  .then((data) => {
    data.forEach((item) => {
      const ext = item.file.split(".").pop().toLowerCase();
      const isVideo = ["mp4", "mov", "webm"].includes(ext);
      exhibits.push({
        image: `assets/${item.file}`,
        title: item.title || item.file,
        date: item.date || "",
        author: item.author || "",
        description: item.description || "",
        ...(isVideo ? { type: "video", video: `assets/${item.file}` } : {}),
      });
    });
    renderGallery();
  });
