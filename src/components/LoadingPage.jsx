import { motion } from 'framer-motion'
import '../index.css'

const LoadingPage = () => {
    return (
        <motion.div
            className="loading-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
            <div className="blobs-container">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <motion.div
                className="loading-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <h1 className="app-title">Luna Book</h1>
                <h2 className="tagline">PADU LECHI NILABADU</h2>

                <div className="loader-container">
                    <motion.div
                        className="loader-bar"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>
            </motion.div>
        </motion.div>
    )
}

export default LoadingPage
