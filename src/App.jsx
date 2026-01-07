import { useState, useEffect } from 'react'
import LoadingPage from './components/LoadingPage'
import HomePage from './components/HomePage'
import Footer from './components/Footer'
import NotebookWrapper from './components/NotebookWrapper'
import { AnimatePresence, motion } from 'framer-motion'

function App() {
    const [currentPage, setCurrentPage] = useState('loading') // loading | home | notebook

    useEffect(() => {
        // Simulate initial loading
        const timer = setTimeout(() => {
            setCurrentPage('home')
        }, 2500)
        return () => clearTimeout(timer)
    }, [])

    const handleStartCoding = () => {
        setCurrentPage('notebook')
    }

    const handleBackHome = () => {
        setCurrentPage('home')
    }

    return (
        <div className="app-container">
            <AnimatePresence mode="wait">
                {currentPage === 'loading' && (
                    <LoadingPage key="loading" />
                )}

                {currentPage === 'home' && (
                    <HomePage key="home" onStart={handleStartCoding} />
                )}

            </AnimatePresence>

            {/* Notebook is always mounted but hidden to preserve state if needed, 
          OR mounted conditionally. Vanilla app.js expects persistence.
          If we unmount, we lose Pyodide/WebSocket state.
          BETTER: Always render it, but use CSS to hide it when not active.
      */}
            <div style={{ display: currentPage === 'notebook' ? 'block' : 'none', height: '100%', width: '100%' }}>
                <NotebookWrapper active={currentPage === 'notebook'} onBack={handleBackHome} />
            </div>

            {/* Footer valid for Loading and Home */}
            {currentPage !== 'notebook' && <Footer />}
        </div>
    )
}

export default App
