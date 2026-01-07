import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'app.js', 'worker.js', 'line.png'], // Ensure app.js and worker.js are cached
            manifest: {
                name: 'Luna Book',
                short_name: 'LunaBook',
                description: 'Advanced Offline-Capable Python Notebook Environment',
                theme_color: '#6c5ce7',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'any',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'jsdelivr-cdn',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/unpkg\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'unpkg-cdn',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/pyodide-cdn2\.iodide\.io\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'pyodide-cdn',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 1 month
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: true,
                type: 'module'
            }
        })
    ],
    server: {
        port: 5173,
        proxy: {
            '/ws': {
                target: 'ws://127.0.0.1:8020',
                ws: true
            },
            '/upload': 'http://127.0.0.1:8020',
            '/.+': { // Proxy other assets if needed (e.g. storage)
                target: 'http://127.0.0.1:8020',
                bypass: (req) => {
                    if (req.headers.accept?.includes('html')) {
                        return false; // Let Vite handle HTML
                    }
                }
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})
