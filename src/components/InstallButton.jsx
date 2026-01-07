import { useState, useEffect } from 'react'
import IOSInstallModal from './IOSInstallModal'

/**
 * InstallButton Component
 * Handles PWA installation across different platforms:
 * - Android/Desktop Chrome/Edge: Uses beforeinstallprompt API
 * - iOS Safari: Shows installation instructions modal
 */
function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [showIOSInstructions, setShowIOSInstructions] = useState(false)

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(isIOSDevice)

        // Check if already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        if (isStandalone) {
            setIsInstallable(false)
            return
        }

        // For iOS, show install button if not in standalone mode
        if (isIOSDevice) {
            setIsInstallable(true)
            return
        }

        // Check if app.js already captured the prompt (event fired before React mounted)
        const checkExistingPrompt = () => {
            if (window.lunaBook && window.lunaBook.deferredPrompt) {
                console.log('Found existing deferred prompt from app.js')
                setDeferredPrompt(window.lunaBook.deferredPrompt)
                setIsInstallable(true)
                return true
            }
            return false
        }

        // Check immediately
        if (checkExistingPrompt()) {
            return
        }

        // Poll for deferred prompt (in case app.js is still loading)
        const pollInterval = setInterval(() => {
            if (checkExistingPrompt()) {
                clearInterval(pollInterval)
            }
        }, 500)

        // Listen for beforeinstallprompt event (Chrome, Edge, Android)
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault()
            // Stash the event so it can be triggered later
            setDeferredPrompt(e)
            // Show install button
            setIsInstallable(true)
            console.log('InstallButton: Captured beforeinstallprompt event')
        }

        // Listen for successful installation
        const handleAppInstalled = () => {
            // Hide install button
            setIsInstallable(false)
            setDeferredPrompt(null)
            console.log('Luna Book installed successfully!')
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            clearInterval(pollInterval)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (isIOS) {
            // Show iOS instructions modal
            setShowIOSInstructions(true)
            return
        }

        // Check both React state and app.js global
        const prompt = deferredPrompt || (window.lunaBook && window.lunaBook.deferredPrompt)

        if (!prompt) {
            console.log('No deferred prompt available')
            return
        }

        // Show the install prompt
        prompt.prompt()

        // Wait for the user to respond to the prompt
        const { outcome } = await prompt.userChoice

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt')
        } else {
            console.log('User dismissed the install prompt')
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null)
        if (window.lunaBook) {
            window.lunaBook.deferredPrompt = null
        }
    }

    // Don't render if not installable
    if (!isInstallable) {
        return null
    }

    return (
        <>
            <button
                onClick={handleInstallClick}
                className="btn-large btn-primary"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <span style={{ fontSize: '1.2rem' }}>📥</span>
                Install App
            </button>

            {/* iOS Instructions Modal */}
            {showIOSInstructions && (
                <IOSInstallModal onClose={() => setShowIOSInstructions(false)} />
            )}
        </>
    )
}

export default InstallButton
