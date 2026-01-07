/**
 * IOSInstallModal Component
 * Displays installation instructions for iOS Safari users
 */
function IOSInstallModal({ onClose }) {
    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{
                    fontFamily: 'Unbounded',
                    fontSize: '1.3rem',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #6c5ce7, #a55eea)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Install Luna Book
                </h3>

                <p style={{
                    marginBottom: '1.5rem',
                    color: '#636e72',
                    lineHeight: '1.6'
                }}>
                    To install Luna Book on your iOS device:
                </p>

                <ol style={{
                    textAlign: 'left',
                    paddingLeft: '1.5rem',
                    marginBottom: '1.5rem',
                    lineHeight: '2',
                    color: '#2d3436'
                }}>
                    <li>
                        Tap the <strong>Share</strong> button
                        <span style={{
                            fontSize: '1.2rem',
                            marginLeft: '8px',
                            verticalAlign: 'middle'
                        }}>⎙</span>
                        <br />
                        <small style={{ color: '#636e72' }}>(Usually at the bottom or top of Safari)</small>
                    </li>
                    <li>
                        Scroll down and tap <strong>"Add to Home Screen"</strong>
                        <span style={{
                            fontSize: '1.2rem',
                            marginLeft: '8px',
                            verticalAlign: 'middle'
                        }}>➕</span>
                    </li>
                    <li>
                        Tap <strong>"Add"</strong> to confirm
                        <span style={{
                            fontSize: '1.2rem',
                            marginLeft: '8px',
                            verticalAlign: 'middle'
                        }}>✓</span>
                    </li>
                </ol>

                <button
                    onClick={onClose}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600'
                    }}
                >
                    Got it!
                </button>
            </div>
        </div>
    )
}

export default IOSInstallModal
