# How Images Are Resolved from Lessons (Self-Contained Summary)

Copy this into another project to understand or reimplement the lesson→image logic.

---

## R2 path and locale conventions

- **Path segment:** Use the two-letter language code as the first path segment.
  - French: `fr/` (e.g. `fr/dialog1/lesson1.mp3`, `fr/dialog1/image.jpeg`).
  - German: `de/` (e.g. `de/dialog1/lesson1.mp3`, `de/dialog1/image.jpeg`).
- **Intro JSON keys:** Use `_fr` / `_de` (or the code) in field names for the locale:
  - French: `title_fr`, `description_fr`.
  - German: `title_de`, `description_de`.
  - Always include `title_en` (and optionally `description_en`) as fallback.

---

## 1. Data model

- **Lesson** has: `lesson` (number), `dialog`, `block`, `language`, `audio` (path or null), **`image`** (path or null).
- **Image path** is always relative to a CDN/storage base URL (e.g. R2). Example: `fr/dialog1/image.jpeg`.
- There is **one image per folder**, not per lesson. Multiple lessons can share the same folder and thus the same image.

---

## 2. Source of truth: lesson → folder mapping

A **single table** maps each lesson number to a **folder name**:

| lesson | folder  |
| ------ | ------- |
| 1      | dialog1 |
| 2      | dialog2 |
| …      | …       |
| 5      | lesson5 |
| 6      | dialog1 |
| …      | …       |
| 21     | dialog5 |
| …      | …       |

- **Audio** for a lesson: `{language}/{folder}/lesson{lesson}.mp3`  
  e.g. `fr/dialog1/lesson1.mp3`
- **Image** for a lesson: `{language}/{folder}/image.jpeg`  
  e.g. `fr/dialog1/image.jpeg`

So the image path is derived from the same `(language, folder)`; the filename is always `image.jpeg` in that folder.

---

## 3. Building the lesson list

1. For the current **language** (e.g. `fr`), take the full lesson→folder table.
2. For each row `(lesson, folder)`:
   - Set `audio = "{language}/{folder}/lesson{lesson}.mp3"`.
   - Set `image = "{language}/{folder}/image.jpeg"`.
   - Optionally set `dialog` / `block` from the folder name (e.g. `dialog` from `dialogN`, `block` from occurrence count).
3. The result is an array of **Lesson** objects, each with an `image` path (relative to the CDN base).

---

## 4. Resolving the full image URL

- **Base URL** comes from config (e.g. env): `EXPO_PUBLIC_R2_PUBLIC_URL` or equivalent.
- **Rule:** `fullImageUrl = baseUrl + "/" + lesson.image`, with no double slash (trim trailing slash from base if needed).
- If `lesson.image` or base URL is missing, treat as “no image” and show a placeholder.

Pseudocode:

```
function buildMediaUrl(path, baseUrl):
  if path is null/empty or baseUrl is null/empty:
    return null
  base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  return base + "/" + path
```

Use the same helper for both audio and image URLs if they share the same base.

---

## 5. Where the image is used

- **List/catalogue:** For each lesson, `imageUrl = buildMediaUrl(lesson.image)`. Use `imageUrl` in an `<Image source={{ uri: imageUrl }} />`; if null, show a “Lesson N” (or similar) placeholder.
- **Lesson player:** The current lesson is passed in (e.g. via route params). Again `imageUrl = buildMediaUrl(lesson.image)` and render with `<Image source={{ uri: imageUrl }} />` or a placeholder.

Navigation should pass the **whole Lesson object** (including `image`) so the player doesn’t need to look it up again.

---

## 6. Checklist for another project

- [ ] Define a lesson→folder table (lesson number → folder name).
- [ ] For each lesson, set `image = "{language}/{folder}/image.jpeg"` when building the lesson list.
- [ ] Store the CDN base URL in env (e.g. `EXPO_PUBLIC_R2_PUBLIC_URL`).
- [ ] Implement `buildMediaUrl(path, baseUrl)` (or equivalent) and use it for `lesson.image`.
- [ ] In list and player, use the resulting URL in your image component, with a fallback when the URL is null.

---

## 7. Summary in one sentence

**Images are determined by a lesson→folder table; each lesson’s image path is `{language}/{folder}/image.jpeg`; the app prepends the CDN base URL to that path to get the final image URL used in the list and in the lesson player.**
