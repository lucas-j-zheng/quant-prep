// Loads the static, bundled content.json. There is NO runtime API: the file is
// precached by the service worker, so this fetch succeeds offline after first
// load. We resolve the URL against import.meta.env.BASE_URL so it works under
// any deploy base path (GitHub Pages project sites, etc.).

let _cache = null

export async function loadContent() {
  if (_cache) return _cache
  const url = `${import.meta.env.BASE_URL}content.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load content.json (${res.status})`)
  const data = await res.json()
  _cache = normalize(data)
  return _cache
}

// Build lookup indexes and a flat problem list once, so pages can resolve
// chapter/section/problem by id in O(1).
function normalize(data) {
  const chapters = data.chapters || []
  const sectionById = new Map()
  const chapterById = new Map()
  const problemByKey = new Map() // `${sectionId}/${problemId}` -> problem

  for (const ch of chapters) {
    chapterById.set(ch.id, ch)
    for (const sec of ch.sections || []) {
      sec._chapterId = ch.id
      sectionById.set(sec.id, sec)
      for (const p of sec.problems || []) {
        problemByKey.set(`${sec.id}/${p.id}`, p)
      }
    }
  }

  return { ...data, chapters, sectionById, chapterById, problemByKey }
}

export function getChapter(content, chapterId) {
  return content.chapterById.get(chapterId) || null
}

export function getSection(content, sectionId) {
  return content.sectionById.get(sectionId) || null
}

export function getProblem(content, sectionId, problemId) {
  return content.problemByKey.get(`${sectionId}/${problemId}`) || null
}
