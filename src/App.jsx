import { useEffect, useState, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { loadContent } from './content/loadContent.js'
import Home from './pages/Home.jsx'
import Section from './pages/Section.jsx'
import Problem from './pages/Problem.jsx'
import Lesson from './pages/Lesson.jsx'

const ContentCtx = createContext(null)
export const useContent = () => useContext(ContentCtx)

export default function App() {
  const [content, setContent] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadContent().then(setContent).catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-hard">
        <h1 className="font-display text-lg font-semibold">Couldn’t load content</h1>
        <p className="mt-2 text-sm text-faint">{error}</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="font-mono text-sm tracking-widest text-faint animate-fade-in">
          loading…
        </span>
      </div>
    )
  }

  return (
    <ContentCtx.Provider value={content}>
      <div className="min-h-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chapter/:chapterId" element={<Lesson />} />
          <Route path="/section/:sectionId" element={<Section />} />
          <Route
            path="/section/:sectionId/problem/:problemId"
            element={<Problem />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ContentCtx.Provider>
  )
}
