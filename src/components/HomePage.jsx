import { motion } from 'framer-motion'
import InstallButton from './InstallButton'

const HomePage = ({ onStart }) => {

    return (
        <motion.div
            className="home-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Animated Background Blobs */}
            <div className="blobs-container">
                <motion.div
                    className="blob blob-4"
                    animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div
                    className="blob blob-5"
                    animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
                    transition={{ duration: 10, repeat: Infinity }}
                />
            </div>

            <motion.div
                className="home-glass-card"
                drag
                dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
                whileHover={{ scale: 1.02 }}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
            >
                <h1 className="app-title-small">Luna Book</h1>
                <h2 className="tagline-small">PADU LECHI NILABADU</h2>

                <div className="home-actions">
                    <motion.button
                        className="btn btn-primary btn-large"
                        onClick={onStart}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Start Coding
                    </motion.button>

                    {/* PWA Install Button - appears conditionally based on platform support */}
                    <InstallButton />
                </div>

                <div className="community-section">
                    <h3>Join our Community</h3>
                    <p>Connect with other learners and developers.</p>
                    <motion.a
                        href="https://chat.whatsapp.com/G5iSjrnLoiR0oKC2jS0uVv"
                        target="_blank"
                        className="btn btn-whatsapp"
                        whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px rgba(37, 211, 102, 0.4)" }}
                    >
                        Join WhatsApp Group
                    </motion.a>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default HomePage
