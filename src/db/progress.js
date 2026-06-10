// IndexedDB-backed progress store (via idb).
//
// Two progress signals per section:
//   READ   — manual check-off by the user.
//   SOLVED — auto-derived: true once every problem in the section is marked
//            solved-correctly. We persist per-problem solved state and a
//            per-section { read, solved } record.
//
// Stores:
//   sections : key = sectionId -> { sectionId, read, solved, updatedAt }
//   problems : key = `${sectionId}/${problemId}` -> { sectionId, problemId,
//                solved, updatedAt }

import { openDB } from 'idb'

const DB_NAME = 'quant-prep'
const DB_VERSION = 1

let _dbPromise = null

function db() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('sections')) {
          database.createObjectStore('sections', { keyPath: 'sectionId' })
        }
        if (!database.objectStoreNames.contains('problems')) {
          const store = database.createObjectStore('problems', { keyPath: 'key' })
          store.createIndex('bySection', 'sectionId')
        }
      },
    })
  }
  return _dbPromise
}

const now = () => new Date().toISOString()
const pkey = (sectionId, problemId) => `${sectionId}/${problemId}`

// ---- Section READ signal -------------------------------------------------

export async function getSectionProgress(sectionId) {
  const d = await db()
  const rec = await d.get('sections', sectionId)
  return rec || { sectionId, read: false, solved: false }
}

export async function setRead(sectionId, read) {
  const d = await db()
  const prev = (await d.get('sections', sectionId)) || { sectionId, solved: false }
  const rec = { ...prev, sectionId, read, updatedAt: now() }
  await d.put('sections', rec)
  return rec
}

// ---- Per-problem SOLVED signal ------------------------------------------

export async function getProblemSolved(sectionId, problemId) {
  const d = await db()
  const rec = await d.get('problems', pkey(sectionId, problemId))
  return rec ? rec.solved : false
}

export async function getSolvedSet(sectionId) {
  const d = await db()
  const recs = await d.getAllFromIndex('problems', 'bySection', sectionId)
  return new Set(recs.filter((r) => r.solved).map((r) => r.problemId))
}

// Set a problem's solved state, then recompute the section's SOLVED signal
// against the full list of problem ids for that section. Returns the updated
// section record so callers can reflect the auto-SOLVED change immediately.
export async function setProblemSolved(sectionId, problemId, solved, allProblemIds) {
  const d = await db()
  await d.put('problems', {
    key: pkey(sectionId, problemId),
    sectionId,
    problemId,
    solved,
    updatedAt: now(),
  })

  const solvedSet = await getSolvedSet(sectionId)
  const allSolved =
    allProblemIds.length > 0 && allProblemIds.every((id) => solvedSet.has(id))

  const prev = (await d.get('sections', sectionId)) || { sectionId, read: false }
  const rec = { ...prev, sectionId, solved: allSolved, updatedAt: now() }
  await d.put('sections', rec)
  return { section: rec, solvedCount: solvedSet.size }
}

// ---- Aggregate helpers for the curriculum overview ----------------------

export async function getAllSectionProgress() {
  const d = await db()
  const recs = await d.getAll('sections')
  const map = new Map()
  for (const r of recs) map.set(r.sectionId, r)
  return map
}

export async function getSolvedCountsBySection() {
  const d = await db()
  const recs = await d.getAll('problems')
  const counts = new Map()
  for (const r of recs) {
    if (!r.solved) continue
    counts.set(r.sectionId, (counts.get(r.sectionId) || 0) + 1)
  }
  return counts
}

export async function resetAllProgress() {
  const d = await db()
  await d.clear('sections')
  await d.clear('problems')
}
