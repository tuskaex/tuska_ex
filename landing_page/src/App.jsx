// ============================================
// HOKKAI MARKETS - Main App with Routing
// ============================================

import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Layout Components
import Navbar from './components/Navbar'
import Footer from './components/Footer'

// Pages
import Home from './pages/Home'
import Trading from './pages/Trading'
import Platforms from './pages/Platforms'
import Accounts from './pages/Accounts'
import Pricing from './pages/Pricing'
import ToolsResearch from './pages/ToolsResearch'
import Education from './pages/Education'
import About from './pages/About'
import Contact from './pages/Contact'

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

// Animated routes wrapper
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/platforms" element={<Platforms />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/tools-research" element={<ToolsResearch />} />
        <Route path="/education" element={<Education />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-dark-900 flex flex-col">
        {/* Navigation */}
        <Navbar />

        {/* Main Content */}
        <main className="flex-1">
          <AnimatedRoutes />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  )
}

export default App
