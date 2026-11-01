# 🤖 Telegram Summarizer & Podcast Bot

**English** | [Español](README.es.md)

A Telegram bot built on **n8n** that receives a link (web article or YouTube video), extracts its
content, summarizes it with AI, and returns it as **text + podcast-style audio**.

```
Telegram link ──▶ YouTube or web? ──▶ Extraction ──▶ AI summary ──▶ Text + Audio
```

---

## ✨ Features

- **Automatic link classification:** tells YouTube apart from a regular website.
- **Language selection:** the user picks the summary language with inline buttons
  (`Original`, `Spanish`, `English`).
- **Content extraction:** web scraping with **Jina Reader**, YouTube transcription with **Supadata**.
- **AI summary:** **Google Gemini** produces a title and a summary of up to 3 paragraphs in a
  podcast-narrator tone.
- **Text-to-Speech:** **ElevenLabs** (`eleven_multilingual_v2`) turns the summary into audio.
- **Dual reply:** sends the written summary and the audio to the same chat.

---

## 🛠️ Stack

| Component | Role in the flow |
|---|---|
| n8n | Workflow orchestrator |
| Telegram Bot API | Incoming messages, inline buttons and replies |
| Jina Reader (`r.jina.ai`) | Web page text extraction |
| Supadata | YouTube video transcription |
| Google Gemini (`gemini-2.5-flash-lite`) | Summary generation |
| ElevenLabs | Voice synthesis of the summary |

---

## 📁 Repository layout

```
.
├── workflows/
│   └── telegram-resumen-bot.json   # n8n workflow, ready to import
├── assets/                         # Screenshots and media
├── scripts/
│   └── verify-workflow-integrity.js
├── README.md                       # English
├── README.es.md                    # Spanish
└── .gitignore
```

---

## 🚀 Installation

### 1. Import the workflow

In your n8n instance:

1. **Workflows → Import from File**
2. Select `workflows/telegram-resumen-bot.json`
3. Open the imported workflow (it arrives **deactivated** on purpose)

### 2. Configure credentials

Secrets are **not** included in the JSON. There are two kinds of configuration:

**a) Native n8n credentials** (pick them from the node credential selector):

| Nodes | Credential |
|---|---|
| `Telegram Trigger`, `Pedir idioma`, `Saludo / Pedir enlace`, `Avisar procesando`, `Confirmar callback`, `Enviar resumen texto`, `Enviar resumen audio` | **Telegram API** (token from [@BotFather](https://t.me/BotFather)) |
| `Gemini 2.5 Flash Lite` | **Google Gemini (PaLM) API** |

**b) API keys in HTTP headers** (replace the placeholder by hand):

| Node | Header | Placeholder to replace |
|---|---|---|
| `Transcripción (Supadata)` | `x-api-key` | `YOUR_SUPADATA_API_KEY` |
| `Generar audio (ElevenLabs)` | `xi-api-key` | `YOUR_ELEVENLABS_API_KEY` |

> 💡 **Recommended upgrade:** instead of keeping the key in the header, create a **Header Auth**
> credential in n8n and assign it to those two nodes. That keeps the key out of the JSON for good.

### 3. Activate

Activate the workflow and send a link to your bot. If there is no link, the bot greets you and
asks for one.

---

## 🔄 How the flow works

1. `Telegram Trigger` receives either `message` or `callback_query`; `Router de entrada` splits them.
2. **Message path:** `Detectar enlace` looks for a URL in the text.
   - No URL → greeting asking for a link.
   - URL found → inline language menu.
3. **Callback path:** `Resolver idioma` reads the chosen language, recovers the original URL from
   the quoted message, and classifies the type (`opcion_web` / `opcion_youtube`).
4. `Avisar procesando` sends the "give me a moment" notice and `Router Web / YouTube` branches:
   - **Web** → `Extraer web (Jina)` → `Normalizar contenido web`
   - **YouTube** → `Extraer video ID` → `Transcripción (Supadata)` → `Limpiar respuesta Supadata`
     → `Normalizar transcripción`
5. `Unir fuentes` merges both branches into a single `{ texto, url, chat_id }` object.
6. `Agente resumidor` (Gemini) generates the title and summary in the chosen language.
7. `Limpiar Markdown` strips characters that break Telegram parsing.
8. `Generar audio (ElevenLabs)` synthesizes the first 2.000 characters, and then
   `Enviar resumen texto` and `Enviar resumen audio` deliver both messages.

---

## 🔐 Security

This repository **contains no credentials**. If you cloned an older version of the workflow, check
that no keys ended up in the git history and **rotate any exposed API key** (Supadata, ElevenLabs)
from its dashboard.

Contributing rules:

- Never commit `API keys`, bot tokens or an n8n `instanceId`.
- Do not upload exports with embedded credentials: n8n includes them unless you strip them first.
- Use the included `.gitignore` for `.env` files and local n8n data.

### Automated check

The repo ships an integrity check that fails on any leaked key, leftover `instanceId`, or broken
node reference:

```bash
node scripts/verify-workflow-integrity.js
# workflow integrity: OK   (exit 0)
```

Run it before every push, especially after editing the workflow.

---

## 📸 Screenshots

Save your images in `assets/` with these names and uncomment the line in the README:

```markdown
![n8n flow](assets/screenshot-flujo.png)
![Conversation](assets/screenshot-chat.png)
```

---

## 🎥 Demo

A screen recording of the bot in action lives outside the repository (binary media is
`.gitignore`d to keep clones small). Recommended distribution: attach it to a
[GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
and link it here.

---

## 🗺️ Roadmap

- [ ] Summary history in Supabase (planned, no node yet).
- [ ] Free TTS alternative (Edge TTS) to lower costs.
- [ ] Explicit error handling (video without transcript, blocked website, exhausted quota).
- [ ] Summaries over 2.000 characters split into several audio chunks.

---

## 📄 License

[MIT](LICENSE) © Nelio Trivilion
