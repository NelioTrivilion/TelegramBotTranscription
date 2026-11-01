# 🤖 Bot Inteligente de Resúmenes y Podcasts para Telegram

[English](README.md) | **Español**

Bot de Telegram construido en **n8n** que recibe un enlace (artículo web o video de YouTube),
extrae su contenido, lo resume con IA y lo devuelve como **texto + audio estilo podcast**.

```
Enlace de Telegram ──▶ ¿YouTube o web? ──▶ Extracción ──▶ Resumen IA ──▶ Texto + Audio
```

---

## ✨ Características

- **Detección automática del tipo de enlace:** distingue YouTube de un sitio web.
- **Selección de idioma:** el usuario elige el idioma del resumen con botones inline
  (`Original`, `Español`, `Inglés`).
- **Extracción de contenido:** scraping de webs con **Jina Reader** y transcripción de YouTube
  con **Supadata**.
- **Resumen con IA:** **Google Gemini** genera título y resumen de hasta 3 párrafos con tono de
  podcast.
- **Text-to-Speech:** **ElevenLabs** (`eleven_multilingual_v2`) convierte el resumen en audio.
- **Respuesta doble:** envía el resumen escrito y el audio en el mismo chat.

---

## 🛠️ Stack

| Componente | Uso en el flujo |
|---|---|
| n8n | Orquestador del workflow |
| Telegram Bot API | Entrada de mensajes, botones inline y respuestas |
| Jina Reader (`r.jina.ai`) | Extracción de texto de páginas web |
| Supadata | Transcripción de videos de YouTube |
| Google Gemini (`gemini-2.5-flash-lite`) | Generación del resumen |
| ElevenLabs | Síntesis de voz del resumen |

---

## 📁 Estructura del repositorio

```
.
├── workflows/
│   └── telegram-resumen-bot.json   # Workflow de n8n listo para importar
├── assets/                         # Capturas y material de difusión
├── scripts/
│   └── verify-workflow-integrity.js
├── README.md                       # Inglés
├── README.es.md                    # Español
└── .gitignore
```

---

## 🚀 Instalación

### 1. Importar el workflow

En tu instancia de n8n:

1. **Workflows → Import from File**
2. Selecciona `workflows/telegram-resumen-bot.json`
3. Abre el workflow importado (llega **desactivado** a propósito)

### 2. Configurar las credenciales

Los secretos **no** están incluidos en el JSON. Hay dos tipos de configuración:

**a) Credenciales nativas de n8n** (se eligen desde el selector de credenciales del nodo):

| Nodos | Credencial |
|---|---|
| `Telegram Trigger`, `Pedir idioma`, `Saludo / Pedir enlace`, `Avisar procesando`, `Confirmar callback`, `Enviar resumen texto`, `Enviar resumen audio` | **Telegram API** (token de tu bot de [@BotFather](https://t.me/BotFather)) |
| `Gemini 2.5 Flash Lite` | **Google Gemini (PaLM) API** |

**b) API keys en cabeceras HTTP** (hay que reemplazar el placeholder a mano):

| Nodo | Cabecera | Placeholder a reemplazar |
|---|---|---|
| `Transcripción (Supadata)` | `x-api-key` | `YOUR_SUPADATA_API_KEY` |
| `Generar audio (ElevenLabs)` | `xi-api-key` | `YOUR_ELEVENLABS_API_KEY` |

> 💡 **Mejora recomendada:** en lugar de dejar la key en el header, crea una credencial
> **Header Auth** en n8n y asígnala a esos dos nodos. Así la key queda fuera del JSON para siempre.

### 3. Activar

Activa el workflow y mándale un enlace a tu bot. Si no hay enlace, el bot responde con un saludo
y te pide uno.

---

## 🔄 Cómo funciona el flujo

1. `Telegram Trigger` recibe `message` o `callback_query` y `Router de entrada` separa ambos casos.
2. **Mensaje:** `Detectar enlace` busca una URL en el texto.
   - Sin URL → saludo pidiendo un enlace.
   - Con URL → menú inline de idioma.
3. **Callback:** `Resolver idioma` lee el idioma elegido, recupera la URL original del mensaje
   citado y clasifica el tipo (`opcion_web` / `opcion_youtube`).
4. `Avisar procesando` manda el aviso "dame un momento" y `Router Web / YouTube` bifurca:
   - **Web** → `Extraer web (Jina)` → `Normalizar contenido web`
   - **YouTube** → `Extraer video ID` → `Transcripción (Supadata)` → `Limpiar respuesta Supadata`
     → `Normalizar transcripción`
5. `Unir fuentes` converge ambas ramas en un único objeto `{ texto, url, chat_id }`.
6. `Agente resumidor` (Gemini) genera título + resumen, respetando el idioma elegido.
7. `Limpiar Markdown` elimina caracteres que rompen el parseo de Telegram.
8. `Generar audio (ElevenLabs)` sintetiza los primeros 2.000 caracteres y se envían
   `Enviar resumen texto` y `Enviar resumen audio`.

---

## 🔐 Seguridad

Este repositorio **no contiene credenciales**. Si clonaste una versión anterior del workflow,
revisa que no haya keys en el historial de git y **rota las API keys** expuestas (Supadata,
ElevenLabs) desde sus paneles.

Buenas prácticas al contribuir:

- Nunca hagas commit de `API keys`, tokens de bot ni `instanceId` de n8n.
- No subas exports con credenciales embebidas: n8n las incluye si no las quitas antes.
- Usa el `.gitignore` incluido para `.env` y datos locales de n8n.

### Verificación automática

El repo incluye un chequeo de integridad que falla si aparece una key, un `instanceId` o una
referencia de nodo rota:

```bash
node scripts/verify-workflow-integrity.js
# workflow integrity: OK   (exit 0)
```

Corrélo antes de cada push, sobre todo si editaste el workflow.

---

## 📸 Capturas

Guarda tus imágenes en `assets/` con estos nombres y descomenta la línea del README:

```markdown
![Flujo en n8n](assets/screenshot-flujo.png)
![Conversación](assets/screenshot-chat.png)
```

---

## 🎥 Demo

La grabación de pantalla del bot funcionando vive fuera del repositorio (los binarios de video
están en `.gitignore` para mantener los clones livianos). Forma recomendada de publicarla:
adjuntarla a un
[GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
y enlazarla acá.

---

## 🗺️ Roadmap

- [ ] Historial de resúmenes en Supabase (la idea está, el nodo aún no existe).
- [ ] Alternativa TTS gratuita (Edge TTS) para abaratar costos.
- [ ] Manejo de errores explícito (video sin transcripción, web bloqueada, cuota agotada).
- [ ] Resúmenes de más de 2.000 caracteres divididos en varios audios.

---

## 📄 Licencia

[MIT](LICENSE) © Nelio Trivilion
