# WhatsApp Stickers for Foundry VTT

A Foundry Virtual Tabletop module that lets you upload sticker packs (WhatsApp-style or any image collection) and send them in chat. Stickers also pop up on the game canvas with a fun animation before fading away.

![Foundry VTT Version](https://img.shields.io/badge/Foundry_VTT-v12--v14-green)
![Module Version](https://img.shields.io/badge/version-1.0.0-blue)

## Features

- **Sticker Packs** — Organize stickers into named packs. Upload PNG, WebP, GIF, JPEG, or AVIF images.
- **Chat Sticker Picker** — Click the sticker button in the chat sidebar to browse and send stickers.
- **Search** — Filter stickers by name across all packs.
- **Canvas Pop-up** — When a sticker is sent, it pops onto the game canvas for all players with a smooth fade-out animation.
- **Configurable** — Per-client settings for canvas display, sticker size, and animation duration.
- **Multi-user** — Stickers broadcast to all connected players via WebSocket.

## Installation

### Manual Install

1. Download or clone this repository.
2. Copy the `wpp-stickers` folder into your Foundry VTT modules directory:
   ```
   {userData}/Data/modules/wpp-stickers/
   ```
   The `{userData}` path depends on your OS:
   - **Windows:** `%LOCALAPPDATA%/FoundryVTT/`
   - **macOS:** `~/Library/Application Support/FoundryVTT/`
   - **Linux:** `~/.local/share/FoundryVTT/`
3. Restart Foundry VTT or go to **Setup → Add-on Modules** and click **Install Module**.
4. In your world, go to **Settings → Manage Modules** and enable **WhatsApp Stickers**.

### Manifest URL (if hosting the manifest)

```
https://your-host.com/path/to/module.json
```

## How to Use

### 1. Create Sticker Packs (GM only)

1. Go to **Settings → Module Settings → WhatsApp Stickers → Open Manager**.
2. Click **New Pack** and give it a name (e.g., "Memes", "Reactions", "WhatsApp Pack 1").
3. Click the **upload button** (⬆) on the pack to add sticker images.
   - You can select multiple files at once.
   - Supported formats: `.png`, `.webp`, `.gif`, `.jpg`, `.avif`
4. Stickers are uploaded to persistent module storage on the Foundry server.

### 2. Send Stickers in Chat (All players)

1. In the chat sidebar, click the **sticker button** (📝 sticky note icon) next to the chat input.
2. The **Sticker Picker** popup opens:
   - Browse packs using the **tabs** at the top.
   - **Search** by sticker name using the search bar.
3. Click a sticker to send it to chat.
4. The sticker appears as an image in the chat log for all players.

### 3. Canvas Pop-up

When a sticker is sent, it also appears on the **game canvas** with a pop-in + fade-out animation:
- The sticker pops in at a random position on the canvas.
- It stays visible for a configurable duration (default: 4 seconds), then fades away.
- All connected players see the animation.

This can be **disabled per-client** in settings.

## Settings

| Setting | Scope | Default | Description |
|---------|-------|---------|-------------|
| **Show Stickers on Canvas** | Client | `true` | Toggle the canvas pop-up animation on/off |
| **Canvas Display Duration** | Client | `4s` | How long stickers stay on the canvas (1–15 seconds) |
| **Sticker Size** | Client | `150px` | Display size for stickers in chat and on canvas (64–512 px) |
| **Manage Sticker Packs** | World (GM) | — | Opens the sticker pack manager to upload/organize stickers |

## Importing WhatsApp Sticker Packs

WhatsApp sticker packs are typically distributed as `.wastickers` files or as folders of `.webp` images. To use them in Foundry:

1. **Extract the sticker images** from the WhatsApp sticker pack:
   - `.wastickers` files are ZIP archives. Rename to `.zip` and extract.
   - Each sticker is usually a `.webp` image (512×512 px).
   - There may also be a `tray_icon.png` (the pack icon).
2. **Create a pack** in the Sticker Pack Manager.
3. **Upload all the `.webp` images** to the pack.

> **Tip:** You can find WhatsApp sticker packs on sites like [sticker.ly](https://sticker.ly/) or export them from WhatsApp using sticker-making apps.

## File Structure

```
wpp-stickers/
├── module.json              # Module manifest
├── scripts/
│   └── wpp-stickers.mjs     # Main module script (ES module)
├── styles/
│   └── wpp-stickers.css     # All module styles
├── templates/
│   └── pack-manager.hbs     # Handlebars template for the pack manager
├── lang/
│   └── en.json              # English translations
└── README.md
```

Uploaded stickers are stored in persistent module storage:
```
{userData}/Data/modules/wpp-stickers/storage/{packId}/
```

## Technical Details

- **Sticker Picker** is built as a vanilla DOM popup positioned above the chat input button. No Foundry Application window overhead.
- **Pack Manager** is a `FormApplication` registered as a settings menu (GM-only).
- **Canvas overlay** is a `div` layered over the canvas board element with `pointer-events: none` so it doesn't interfere with gameplay.
- **Socket communication** uses Foundry's `game.socket` on channel `module.wpp-stickers` to broadcast canvas sticker events to all clients.
- **Persistent storage** (`FilePicker.upload`) stores sticker images server-side in the module's storage directory, surviving module updates.

## Compatibility

- **Foundry VTT v12 – v14** (verified on v14)
- Works with any game system
- No dependencies on other modules

## License

MIT
