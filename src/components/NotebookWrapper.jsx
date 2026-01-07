import { useEffect, useRef } from 'react'

const NotebookWrapper = ({ active, onBack }) => {
    const initialized = useRef(false)

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        console.log("Initializing Legacy Luna Notebook Engine...");

        // Inject the legacy script dynamically
        const script = document.createElement('script');
        script.src = "/app.js"; // Served from public/
        script.async = true;
        script.onload = () => {
            console.log("Legacy app.js loaded. Engine should be starting...");
            // app.js handles 'DOMContentLoaded', but since we are SPA, that event fired long ago.
            // We need to manually trigger initiation if app.js relies on it.
            // Ideally, app.js should expose a function `window.initLunaBook()`.
            // Inspecting app.js: It does `lunaBook = new LunaBook()` on DOMContentLoaded.
            // Since we missed it, we must instantiate manually.

            if (window.LunaBook && !window.lunaBook) {
                window.lunaBook = new window.LunaBook();
            }
        };
        document.body.appendChild(script);

        // Inject styles.css logic (handled by index.css mostly, but legacy styles might be needed)
        // We moved styles.css to index.css or we can load it here. 
        // Better to have migrated styles to src/index.css for React control.
    }, [])

    return (
        <div id="notebook-page" className={active ? "main-page" : "main-page hidden"}>
            {/* Header - Recreated here or Legacy? 
                Existing app.js expects #notebook-page to CONTAIN the header.
                We must recreate the EXACT DOM structure app.js expects.
            */}
            <header className="header">
                <div className="header-left">
                    <button id="back-home-btn" className="btn btn-secondary" onClick={onBack}>← Home</button>
                    <h1>Luna Book</h1>
                    <span className="status" id="status">Ready</span>
                </div>
                <div className="header-right">
                    <input type="file" id="file-upload" hidden />
                    <button id="new-notebook-btn" className="btn btn-secondary">📄 New</button>
                    <button id="upload-btn" className="btn btn-secondary">Upload Data</button>
                    <button id="open-btn" className="btn btn-secondary">Open</button>
                    <button id="run-all-btn" className="btn btn-primary">Run all</button>
                    <button id="clear-all-btn" className="btn btn-secondary">Clear outputs</button>
                    <button id="restart-btn" className="btn btn-secondary">Restart runtime</button>
                    <button id="save-btn" className="btn btn-accent">Save</button>
                    <button id="export-btn" className="btn btn-accent">Export</button>
                    <button id="share-btn" className="btn btn-accent">Share</button>
                </div>
            </header>

            <div className="notebook-container">
                <div id="cells-container" className="cells-container">
                    {/* Cells added dynamically by app.js */}
                </div>
                <button id="add-cell-btn" className="add-cell-btn">+ Code</button>
            </div>

            {/* Helpers required by app.js logic */}
            <div id="loading-page" className="hidden"></div> {/* Dummy for app.js references */}
            <div id="home-page" className="hidden"></div> {/* Dummy for app.js references */}
            <div id="global-footer" className="hidden"></div>

            {/* Modals required by app.js */}
            <div id="export-modal" className="modal hidden">
                <div className="modal-content">
                    <h3>Export Notebook</h3>
                    <div className="export-options">
                        <button className="btn btn-primary export-btn" data-format="json">Save as JSON</button>
                        <button className="btn btn-primary export-btn" data-format="ipynb">Save as Jupyter (.ipynb)</button>
                        <button className="btn btn-primary export-btn" data-format="py">Save as Python (.py)</button>
                        <button className="btn btn-primary export-btn" data-format="html">Save as HTML</button>
                        <button className="btn btn-primary export-btn" data-format="pdf">Save as PDF</button>
                    </div>
                    <button id="close-export" className="btn btn-secondary">Close</button>
                </div>
            </div>

            <div id="share-modal" className="modal hidden">
                <div className="modal-content">
                    <h3>Share Notebook</h3>
                    <div className="share-options"> <label><input type="radio" name="share-mode" value="view" defaultChecked /> View Only</label> <label><input type="radio" name="share-mode" value="edit" /> Edit Access</label> </div>
                    <div className="share-link-container"> <input type="text" id="share-link" className="share-link" readOnly /> <button id="copy-link" className="btn btn-primary">Copy Link</button> </div>
                    <button id="close-share" className="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    )
}

export default NotebookWrapper
