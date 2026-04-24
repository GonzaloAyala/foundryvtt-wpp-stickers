/**
 * WhatsApp Stickers for Foundry VTT
 * Main module entry point
 */

const MODULE_ID = "wpp-stickers";

/* -------------------------------------------------- */
/*  Settings Registration                             */
/* -------------------------------------------------- */

function registerSettings() {
  game.settings.register(MODULE_ID, "stickerPacks", {
    name: game.i18n.localize("WPP_STICKERS.Settings.StickerPacks"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.StickerPacksHint"),
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "showOnCanvas", {
    name: game.i18n.localize("WPP_STICKERS.Settings.ShowOnCanvas"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.ShowOnCanvasHint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "canvasDuration", {
    name: game.i18n.localize("WPP_STICKERS.Settings.CanvasDuration"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.CanvasDurationHint"),
    scope: "client",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 15, step: 0.5 }
  });

  game.settings.register(MODULE_ID, "stickerSize", {
    name: game.i18n.localize("WPP_STICKERS.Settings.StickerSize"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.StickerSizeHint"),
    scope: "client",
    config: true,
    type: Number,
    default: 150,
    range: { min: 64, max: 512, step: 16 }
  });

  game.settings.register(MODULE_ID, "stickerCooldown", {
    name: game.i18n.localize("WPP_STICKERS.Settings.StickerCooldown"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.StickerCooldownHint"),
    scope: "world",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0, max: 30, step: 0.5 }
  });

  game.settings.registerMenu(MODULE_ID, "packManager", {
    name: game.i18n.localize("WPP_STICKERS.Settings.ManagePacks"),
    label: game.i18n.localize("WPP_STICKERS.Settings.ManagePacksLabel"),
    hint: game.i18n.localize("WPP_STICKERS.Settings.ManagePacksHint"),
    icon: "fas fa-box-open",
    type: StickerPackManager,
    restricted: true
  });
}

/* -------------------------------------------------- */
/*  Sticker Pack Manager (Settings Application)       */
/* -------------------------------------------------- */

class StickerPackManager extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "wpp-sticker-pack-manager",
    window: {
      title: "WPP_STICKERS.PackManager.Title",
      resizable: true
    },
    classes: ["wpp-stickers", "pack-manager"],
    position: { width: 600, height: "auto" },
    actions: {
      uploadPack: StickerPackManager._onUploadPack,
      uploadStickers: StickerPackManager._onUploadStickers,
      deletePack: StickerPackManager._onDeletePack,
      deleteSticker: StickerPackManager._onDeleteSticker,
      togglePack: StickerPackManager._onTogglePack
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/pack-manager.hbs`
    }
  };

  async _prepareContext() {
    const packs = game.settings.get(MODULE_ID, "stickerPacks");
    return { packs: Object.values(packs) };
  }

  static async _onUploadPack() {
    const name = await _promptDialog(
      game.i18n.localize("WPP_STICKERS.PackManager.NewPackTitle"),
      game.i18n.localize("WPP_STICKERS.PackManager.NewPackPrompt")
    );
    if (!name) return;

    const packId = name.slugify({ strict: true });
    if (!packId) {
      ui.notifications.error(game.i18n.localize("WPP_STICKERS.PackManager.InvalidName"));
      return;
    }

    const packs = foundry.utils.deepClone(game.settings.get(MODULE_ID, "stickerPacks"));
    if (packs[packId]) {
      ui.notifications.warn(game.i18n.localize("WPP_STICKERS.PackManager.PackExists"));
      return;
    }

    // Ensure the base storage directory exists, then create the pack subdirectory
    try {
      await FilePicker.createDirectory("data", `modules/${MODULE_ID}/storage`);
    } catch (e) {
      // Directory may already exist
    }
    const storagePath = `modules/${MODULE_ID}/storage/${packId}`;
    try {
      await FilePicker.createDirectory("data", storagePath);
    } catch (e) {
      // Directory may already exist
    }

    packs[packId] = { id: packId, name, stickers: [] };
    await game.settings.set(MODULE_ID, "stickerPacks", packs);
    this.render();
    ui.notifications.info(game.i18n.format("WPP_STICKERS.PackManager.PackCreated", { name }));
  }

  static async _onUploadStickers(event, target) {
    const packId = target.closest("[data-pack-id]").dataset.packId;
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/png,image/webp,image/gif,image/jpeg,image/avif";

    input.addEventListener("change", async () => {
      const files = Array.from(input.files);
      if (!files.length) return;

      const packs = foundry.utils.deepClone(game.settings.get(MODULE_ID, "stickerPacks"));
      const pack = packs[packId];
      if (!pack) return;

      const storagePath = `modules/${MODULE_ID}/storage/${packId}`;

      // Ensure storage directories exist before uploading
      try {
        await FilePicker.createDirectory("data", `modules/${MODULE_ID}/storage`);
      } catch (e) { /* exists */ }
      try {
        await FilePicker.createDirectory("data", storagePath);
      } catch (e) { /* exists */ }

      let uploaded = 0;

      for (const file of files) {
        try {
          const response = await FilePicker.upload("data", storagePath, file);
          if (response?.path) {
            const stickerId = file.name.replace(/\.[^.]+$/, "").slugify({ strict: true })
              || foundry.utils.randomID();
            // Avoid duplicate sticker IDs in the same pack
            if (!pack.stickers.find(s => s.path === response.path)) {
              pack.stickers.push({
                id: stickerId,
                name: file.name.replace(/\.[^.]+$/, ""),
                path: response.path
              });
              uploaded++;
            }
          }
        } catch (e) {
          console.error(`${MODULE_ID} | Failed to upload ${file.name}:`, e);
        }
      }

      await game.settings.set(MODULE_ID, "stickerPacks", packs);
      this.render();
      ui.notifications.info(
        game.i18n.format("WPP_STICKERS.PackManager.StickersUploaded", { count: uploaded })
      );
    });

    input.click();
  }

  static async _onDeletePack(event, target) {
    const packId = target.closest("[data-pack-id]").dataset.packId;
    const packs = foundry.utils.deepClone(game.settings.get(MODULE_ID, "stickerPacks"));
    const pack = packs[packId];
    if (!pack) return;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("WPP_STICKERS.PackManager.DeletePackTitle") },
      content: game.i18n.format("WPP_STICKERS.PackManager.DeletePackConfirm", { name: pack.name })
    });
    if (!confirm) return;

    delete packs[packId];
    await game.settings.set(MODULE_ID, "stickerPacks", packs);
    this.render();
    ui.notifications.info(game.i18n.format("WPP_STICKERS.PackManager.PackDeleted", { name: pack.name }));
  }

  static async _onDeleteSticker(event, target) {
    const li = target.closest("[data-sticker-id]");
    const packId = target.closest("[data-pack-id]").dataset.packId;
    const stickerId = li.dataset.stickerId;

    const packs = foundry.utils.deepClone(game.settings.get(MODULE_ID, "stickerPacks"));
    const pack = packs[packId];
    if (!pack) return;

    pack.stickers = pack.stickers.filter(s => s.id !== stickerId);
    await game.settings.set(MODULE_ID, "stickerPacks", packs);
    this.render();
  }

  static _onTogglePack(event, target) {
    const details = target.closest(".wpp-pack-section")?.querySelector(".wpp-pack-stickers");
    if (details) details.classList.toggle("collapsed");
  }
}

/* -------------------------------------------------- */
/*  Sticker Picker (Chat UI)                          */
/* -------------------------------------------------- */

class StickerPicker {
  constructor() {
    this.element = null;
    this.visible = false;
    this._onClickOutside = this._onClickOutside.bind(this);
  }

  toggle(anchor) {
    if (this.visible) {
      this.close();
    } else {
      this.open(anchor);
    }
  }

  open(anchor) {
    this.close();
    const packs = game.settings.get(MODULE_ID, "stickerPacks");
    const packList = Object.values(packs);

    if (!packList.length || !packList.some(p => p.stickers.length > 0)) {
      ui.notifications.warn(game.i18n.localize("WPP_STICKERS.Picker.NoPacks"));
      return;
    }

    const el = document.createElement("div");
    el.classList.add("wpp-sticker-picker");
    el.innerHTML = this._buildHTML(packList);

    // Position above the anchor button, clamped to viewport
    const rect = anchor.getBoundingClientRect();
    const pickerWidth = 340;
    let left = rect.left;
    // If the picker would overflow the right edge, align its right edge with the button's right edge
    if (left + pickerWidth > window.innerWidth) {
      left = rect.right - pickerWidth;
    }
    // Clamp to left edge as a safety net
    left = Math.max(4, left);
    el.style.position = "fixed";
    el.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    el.style.left = `${left}px`;

    document.body.appendChild(el);
    this.element = el;
    this.visible = true;

    // Activate listeners
    el.querySelectorAll(".wpp-sticker-item").forEach(item => {
      item.addEventListener("click", (ev) => this._onSelectSticker(ev));
    });
    el.querySelectorAll(".wpp-picker-tab").forEach(tab => {
      tab.addEventListener("click", (ev) => this._onSwitchTab(ev));
    });
    el.querySelector(".wpp-picker-search")?.addEventListener("input", (ev) => this._onSearch(ev));

    setTimeout(() => document.addEventListener("click", this._onClickOutside), 50);
  }

  close() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.visible = false;
    document.removeEventListener("click", this._onClickOutside);
  }

  _buildHTML(packList) {
    const tabs = packList.map((p, i) =>
      `<button class="wpp-picker-tab${i === 0 ? " active" : ""}" data-pack-id="${_escapeHTML(p.id)}" title="${_escapeHTML(p.name)}">${_escapeHTML(p.name)}</button>`
    ).join("");

    const panels = packList.map((p, i) => {
      const stickers = p.stickers.map(s =>
        `<div class="wpp-sticker-item" data-path="${_escapeHTML(s.path)}" data-name="${_escapeHTML(s.name)}" data-pack-id="${_escapeHTML(p.id)}" data-sticker-id="${_escapeHTML(s.id)}" title="${_escapeHTML(s.name)}">
          <img src="${_escapeHTML(s.path)}" alt="${_escapeHTML(s.name)}" loading="lazy" />
        </div>`
      ).join("");
      return `<div class="wpp-picker-panel${i === 0 ? " active" : ""}" data-pack-id="${_escapeHTML(p.id)}">${stickers}</div>`;
    }).join("");

    return `
      <div class="wpp-picker-header">
        <input type="text" class="wpp-picker-search" placeholder="${game.i18n.localize("WPP_STICKERS.Picker.Search")}" />
      </div>
      <div class="wpp-picker-tabs">${tabs}</div>
      <div class="wpp-picker-panels">${panels}</div>
    `;
  }

  _onSwitchTab(event) {
    const packId = event.currentTarget.dataset.packId;
    this.element.querySelectorAll(".wpp-picker-tab").forEach(t => t.classList.toggle("active", t.dataset.packId === packId));
    this.element.querySelectorAll(".wpp-picker-panel").forEach(p => p.classList.toggle("active", p.dataset.packId === packId));
  }

  _onSearch(event) {
    const query = event.currentTarget.value.toLowerCase().trim();
    this.element.querySelectorAll(".wpp-sticker-item").forEach(item => {
      const name = item.dataset.name.toLowerCase();
      item.style.display = (!query || name.includes(query)) ? "" : "none";
    });
    // Show all panels when searching
    if (query) {
      this.element.querySelectorAll(".wpp-picker-panel").forEach(p => p.classList.add("active"));
      this.element.querySelectorAll(".wpp-picker-tab").forEach(t => t.classList.remove("active"));
    }
  }

  _onSelectSticker(event) {
    const item = event.currentTarget;
    const path = item.dataset.path;
    const name = item.dataset.name;
    const packId = item.dataset.packId;
    const stickerId = item.dataset.stickerId;

    sendSticker(path, name, packId, stickerId);
    this.close();
  }

  _onClickOutside(event) {
    if (this.element && !this.element.contains(event.target) &&
        !event.target.closest(".wpp-sticker-button")) {
      this.close();
    }
  }
}

/* -------------------------------------------------- */
/*  Canvas Overlay                                     */
/* -------------------------------------------------- */

class CanvasStickerOverlay {
  constructor() {
    this.container = null;
  }

  init() {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.id = "wpp-canvas-overlay";
    document.getElementById("board")?.parentElement?.appendChild(this.container);
  }

  /**
   * @param {string} path        Sticker image path
   * @param {string} name        Sticker display name
   * @param {object} [speaker]   Speaker data with optional token/scene ids
   */
  show(path, name, speaker = {}) {
    if (!game.settings.get(MODULE_ID, "showOnCanvas")) return;
    this.init();
    if (!this.container) return;

    const size = game.settings.get(MODULE_ID, "stickerSize");
    const duration = game.settings.get(MODULE_ID, "canvasDuration");

    const wrapper = document.createElement("div");
    wrapper.classList.add("wpp-canvas-sticker");
    wrapper.style.setProperty("--duration", `${duration}s`);

    let x, y;
    const token = speaker?.token ? canvas.tokens?.get(speaker.token) : null;

    if (token && canvas.stage) {
      // Convert token center from canvas world coords to screen coords
      const center = token.center;
      const t = canvas.stage.worldTransform;
      const screenX = (t.a * center.x) + (t.c * center.y) + t.tx;
      const screenY = (t.b * center.x) + (t.d * center.y) + t.ty;

      // Adjust relative to the overlay container
      const rect = this.container.getBoundingClientRect();
      // Place sticker above the token with a small random horizontal jitter
      const jitter = (Math.random() - 0.5) * size * 0.4;
      x = screenX - rect.left - (size / 2) + jitter;
      y = screenY - rect.top - size - 10;
    } else {
      // Fallback: random center-biased position
      const maxX = this.container.clientWidth - size;
      const maxY = this.container.clientHeight - size;
      x = Math.max(0, Math.min(maxX, (maxX * 0.5) + (Math.random() - 0.5) * maxX * 0.6));
      y = Math.max(0, Math.min(maxY, (maxY * 0.5) + (Math.random() - 0.5) * maxY * 0.6));
    }

    // Clamp to container bounds
    x = Math.max(0, Math.min(this.container.clientWidth - size, x));
    y = Math.max(0, Math.min(this.container.clientHeight - size, y));

    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;

    const img = document.createElement("img");
    img.src = path;
    img.alt = name;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    wrapper.appendChild(img);

    this.container.appendChild(wrapper);

    // Remove after animation completes
    const totalMs = duration * 1000;
    setTimeout(() => wrapper.remove(), totalMs + 500);
  }
}

/* -------------------------------------------------- */
/*  Module State & Helpers                             */
/* -------------------------------------------------- */

let stickerPicker = null;
let canvasOverlay = null;
let _lastStickerTime = 0;

/**
 * Escape a string for safe insertion into HTML attributes.
 */
function _escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Send a sticker as a chat message and broadcast to canvas.
 */
async function sendSticker(path, name, packId, stickerId) {
  // Cooldown check
  const cooldown = game.settings.get(MODULE_ID, "stickerCooldown") * 1000;
  const now = Date.now();
  if (cooldown > 0 && (now - _lastStickerTime) < cooldown) {
    const remaining = Math.ceil((cooldown - (now - _lastStickerTime)) / 1000);
    ui.notifications.warn(game.i18n.format("WPP_STICKERS.CooldownWarning", { seconds: remaining }));
    return;
  }
  _lastStickerTime = now;

  const stickerSize = game.settings.get(MODULE_ID, "stickerSize");
  const safeName = _escapeHTML(name);
  const safePath = _escapeHTML(path);
  const content = `<div class="wpp-sticker-message">
    <img src="${safePath}" alt="${safeName}" title="${safeName}" width="${stickerSize}" height="${stickerSize}" />
  </div>`;

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker(),
    flags: {
      [MODULE_ID]: {
        isSticker: true,
        packId,
        stickerId,
        stickerPath: path,
        stickerName: name
      }
    }
  });
}

/**
 * Prompt dialog utility.
 */
async function _promptDialog(title, label) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title },
    content: `<div class="form-group">
      <label>${label}</label>
      <input type="text" name="value" autofocus />
    </div>`,
    ok: {
      icon: "fas fa-check",
      label: game.i18n.localize("WPP_STICKERS.OK"),
      callback: (event, button) => button.form.elements.value?.value?.trim() || null
    },
    rejectClose: false
  });
}

/* -------------------------------------------------- */
/*  Hooks                                              */
/* -------------------------------------------------- */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing WhatsApp Stickers module`);
  registerSettings();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Module ready`);
  stickerPicker = new StickerPicker();
  canvasOverlay = new CanvasStickerOverlay();

  // Listen for sticker events from other clients
  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (data.action === "showSticker") {
      canvasOverlay.show(data.path, data.name, data.speaker);
    }
  });
});

/**
 * Add sticker button to chat controls.
 * Supports both v14 (ApplicationV2 + ProseMirror) and v11-v13 (Application v1).
 */
Hooks.on("renderChatLog", (app, html) => {
  const root = (html instanceof HTMLElement) ? html : (html[0] ?? html);
  if (!root) return;

  // Check if button already exists anywhere in the chat panel
  if (root.querySelector(".wpp-sticker-button")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.classList.add("wpp-sticker-button");
  btn.title = game.i18n.localize("WPP_STICKERS.Picker.ButtonTitle");
  btn.innerHTML = '<i class="fas fa-note-sticky"></i>';
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    stickerPicker?.toggle(btn);
  });

  // v14+: ApplicationV2 with ProseMirror input — look for the input part's menu toolbar
  const inputPart = root.querySelector("[data-application-part='input']");
  if (inputPart) {
    const menu = inputPart.querySelector("menu");
    if (menu) {
      menu.appendChild(btn);
    } else {
      inputPart.appendChild(btn);
    }
    return;
  }

  // v11-v13 fallback: old-style chat controls or chat form
  const container = root.querySelector("#chat-controls") ?? root.querySelector("#chat-form");
  if (container) {
    container.appendChild(btn);
  }
});

/**
 * When a sticker message is created, broadcast to show on canvas.
 */
Hooks.on("createChatMessage", (message) => {
  const flags = message.flags?.[MODULE_ID];
  if (!flags?.isSticker) return;

  const speaker = message.speaker ?? {};

  // Show on local canvas, positioned over the speaker's token
  canvasOverlay?.show(flags.stickerPath, flags.stickerName, speaker);

  // Broadcast to other clients (only from the sender)
  if (message.author?.id === game.user.id) {
    game.socket.emit(`module.${MODULE_ID}`, {
      action: "showSticker",
      path: flags.stickerPath,
      name: flags.stickerName,
      speaker: { token: speaker.token, scene: speaker.scene }
    });
  }
});

/**
 * Style sticker messages in the chat log.
 */
Hooks.on("renderChatMessage", (message, html) => {
  const flags = message.flags?.[MODULE_ID];
  if (!flags?.isSticker) return;

  const el = (html instanceof HTMLElement) ? html : (html[0] ?? html);
  el.classList?.add("wpp-sticker-chat-message");
});

export { MODULE_ID, StickerPackManager, StickerPicker, CanvasStickerOverlay };
