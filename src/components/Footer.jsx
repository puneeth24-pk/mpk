import { motion } from 'framer-motion'

const Footer = () => {
    return (
        <motion.footer
            className="footer"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
            <div className="footer-content">
                <div className="footer-section">
                    <h4>M Puneeth Kumar</h4>
                    <p>Email: <a href="mailto:mandlapuneethkumar2005@gmail.com">mandlapuneethkumar2005@gmail.com</a></p>
                    <p>LinkedIn: <a href="https://www.linkedin.com/in/puneeth-kumar-mandla-a03525326" target="_blank">Puneeth Kumar Mandla</a></p>
                </div>
                <div className="footer-section">
                    <h4>Support & Contribution</h4>
                    <p>Support: 9391098736</p>
                    <p>PhonePe: 9391098736</p>
                </div>
                <div className="footer-section">
                    <p>&copy; 2026 Luna Book</p>
                    <p>PADU LECHI NILABADU</p>
                </div>
            </div>
        </motion.footer>
    )
}

export default Footer
