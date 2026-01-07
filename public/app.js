class LunaBook {
    constructor() {
        this.cells = [];
        this.cellCounter = 0;
        this.ws = null;
        this.worker = null; // Python Worker for offline mode
        this.mode = navigator.onLine ? 'online' : 'offline'; // 'online' or 'offline'
        this.userId = this.getOrCreateUserId();
        this.executingCells = new Set();
        this.kernelBusy = false;
        this.cellCompletionCallbacks = {};
        console.log("Luna Book v2.0 Loaded");
        this.init();
    }

    getOrCreateUserId() {
        let id = localStorage.getItem('luna_user_id');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('luna_user_id', id);
        }
        return id;
    }

    async init() {
        // PWA Install Prompt Logic
        this.deferredPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log("Captured beforeinstallprompt event");
            this.setupInstallBtn();
        });

        // Initialize Worker for offline capability immediately
        this.initWorker();

        // Listen for network status changes
        window.addEventListener('online', () => this.setMode('online'));
        window.addEventListener('offline', () => this.setMode('offline'));

        // Start with Loading Page
        this.showLoadingPage();

        setTimeout(() => {
            // Transition to Home Page
            this.showHome();

            // Try connecting to backend
            this.connectBackend();

            this.setupEventListeners();
            this.addCell();
            this.updateStatusIndicator();
        }, 2000);
    }

    setupInstallBtn() {
        const installBtn = document.getElementById('install-app-btn');
        if (installBtn && this.deferredPrompt) {
            console.log("Setting up Install Button");
            installBtn.style.display = 'inline-block';
            installBtn.classList.remove('hidden');

            // Remove old listeners to avoid duplicates if called multiple times
            const newBtn = installBtn.cloneNode(true);
            installBtn.parentNode.replaceChild(newBtn, installBtn);

            newBtn.addEventListener('click', () => {
                this.deferredPrompt.prompt();
                this.deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    this.deferredPrompt = null;
                    newBtn.style.display = 'none';
                });
            });
        }
    }

    initWorker() {
        if (!window.Worker) {
            console.error("Web Workers not supported");
            return;
        }
        console.log("Initializing Offline Worker...");
        this.worker = new Worker('worker.js');
        this.worker.onmessage = (e) => this.handleExecutionMessage(e.data);

        // Listen for service worker messages if we add progress tracking
    }

    setMode(newMode) {
        this.mode = newMode;
        console.log(`Switched to ${this.mode} mode`);
        this.updateStatusIndicator();
        if (newMode === 'online') this.connectBackend();
    }

    updateStatusIndicator() {
        const statusEl = document.getElementById('status');
        if (this.mode === 'offline') {
            statusEl.textContent = 'Offline (Pyodide)';
            statusEl.style.color = 'orange';
        } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            statusEl.textContent = 'Connected (Server)';
            statusEl.style.color = '#00ff00';
        } else {
            statusEl.textContent = 'Connecting...';
            statusEl.style.color = 'yellow';
        }
    }

    showLoadingPage() {
        document.getElementById('loading-page').classList.remove('hidden');
        document.getElementById('home-page').classList.add('hidden');
        document.getElementById('notebook-page').classList.add('hidden');
        document.getElementById('global-footer').classList.remove('hidden'); // Footer allowed
    }

    showHome() {
        document.getElementById('loading-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
        document.getElementById('notebook-page').classList.add('hidden');
        document.getElementById('global-footer').classList.remove('hidden'); // Footer allowed

        // Clear notebook when going back to home
        this.clearNotebook();
    }

    showNotebook() {
        document.getElementById('loading-page').classList.add('hidden');
        document.getElementById('home-page').classList.add('hidden');
        document.getElementById('notebook-page').classList.remove('hidden');
        document.getElementById('global-footer').classList.add('hidden'); // Footer FORBIDDEN on Execution Page

        // Reset to fresh notebook when starting
        if (this.cells.length === 0) {
            this.addCell();
        }

        // Refresh Monaco editors
        setTimeout(() => this.refreshEditors(), 50);
    }

    connectBackend() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

        // Strategy: Try Proxy First (/ws), if fail, try Direct (8015)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;

        // 1. Proxy URL (Standard for Prod/Dev with Proxy)
        const proxyUrl = `${protocol}//${host}/ws?userId=${this.userId}`;

        // 2. Direct URL (Fallback for Localhost if proxy fails)
        // Use 127.0.0.1 to avoid IPv6 localhost issues
        const directUrl = `ws://127.0.0.1:8020/ws?userId=${this.userId}`;

        console.log(`Attempting connection to Backend...`);

        const connect = (url, isRetry = false) => {
            console.log(`Connecting to: ${url}`);
            try {
                const socket = new WebSocket(url);

                socket.onopen = () => {
                    console.log(`Connected to Backend via ${url}`);
                    this.ws = socket;
                    this.setMode('online');
                };

                socket.onclose = () => {
                    console.warn(`Disconnected from ${url}`);
                    // Retry fallback if on local machine
                    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

                    if (!isRetry && url !== directUrl && isLocal) {
                        console.log("Proxy connection failed, trying direct connection...");
                        connect(directUrl, true);
                    } else {
                        console.log("Connection failed, switching to Offline mode");
                        this.setMode('offline');
                        if (navigator.onLine) {
                            setTimeout(() => this.connectBackend(), 5000); // Retry loop
                        }
                    }
                };

                socket.onerror = (e) => {
                    console.log("WebSocket error", e);
                };

                socket.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    this.handleExecutionMessage(msg);
                };
            } catch (e) {
                console.log("Connection exception", e);
                if (!isRetry && url !== directUrl) connect(directUrl, true);
            }
        };

        connect(proxyUrl);
    }

    handleExecutionMessage(msg) {
        const cellId = msg.cellId;
        const outputElement = document.getElementById(`output-${cellId}`);
        const cell = this.cells.find(c => c.id === cellId);

        if (!cell) {
            console.error("Cell not found for ID:", cellId);
            return;
        }
        if (!outputElement) {
            console.error("Output element not found for ID:", cellId);
            return;
        }

        console.log("Processing message for cell", cellId, "Type:", msg.type);

        if (msg.type === 'stream') {
            const names = ['stdout', 'stderr'];
            if (names.includes(msg.name)) {
                console.log("Appending stream output:", msg.text);
                let pre = outputElement.lastElementChild;
                if (!pre || pre.tagName !== 'PRE') {
                    pre = document.createElement('pre');
                    outputElement.append(pre);
                }
                const htmlText = this.parseAnsi(msg.text);
                // appending HTML requires non-trivial handling if we want to append to existing PRE text properly 
                // but usually stream comes in chunks.
                // Safest is to append a span if we are using innerHTML
                const span = document.createElement('span');
                span.innerHTML = htmlText;
                pre.appendChild(span);

                cell.output += msg.text;
            }

        } else if (msg.type === 'execute_result' || msg.type === 'display_data') {
            console.log("Displaying result/data");
            if (msg.text) {
                let pre = document.createElement('pre');
                pre.textContent = msg.text;
                outputElement.append(pre);
                cell.output += msg.text + "\n";
            }
            if (msg.html) {
                const div = document.createElement('div');
                div.innerHTML = msg.html;
                outputElement.append(div);
                cell.output += msg.html;
            }
            if (msg.image) {
                const img = document.createElement('img');
                img.src = `data:image/png;base64,${msg.image}`;
                img.style.maxWidth = '100%';
                outputElement.append(img);
            }

        } else if (msg.type === 'error') {
            console.error("Execution Error:", msg.traceback);
            // DEBUG ALERT - REMOVE AFTER VERIFICATION
            // alert("Error received: " + msg.ename);

            const pre = document.createElement('pre');
            // pre.style.color = 'red'; // Let ANSI handle colors, or default to standard text color
            // Join traceback lines and parse ANSI
            const fullTraceback = msg.traceback.join('\n');
            pre.innerHTML = this.parseAnsi(fullTraceback);
            outputElement.append(pre);
            cell.output += fullTraceback + '\n';

        } else if (msg.type === 'input_request') {
            this.showInputPrompt(cellId, msg.prompt);

        } else if (msg.type === 'complete') {
            const cellElement = document.getElementById(cellId);
            if (cellElement) {
                cellElement.classList.remove('executing');
                this.updateCellRunningState(cellId, false);
            }
            // Remove spinner - handled by updateCellRunningState
            // const spinner = cellElement.querySelector('.cell-spinner');
            // if (spinner) spinner.style.display = 'none';
            if (outputElement) outputElement.classList.add('success');

            // Clear execution state
            this.executingCells.delete(cellId);
            this.kernelBusy = false;

            // Call completion callback if exists (for runAllCells)
            if (this.cellCompletionCallbacks[cellId]) {
                this.cellCompletionCallbacks[cellId]();
                delete this.cellCompletionCallbacks[cellId];
            }

        } else if (msg.type === 'restart_success') {
            alert(msg.content);
            this.clearAllOutputs();
            // Clear execution state on restart
            this.executingCells.clear();
            this.kernelBusy = false;
            this.cellCompletionCallbacks = {};

        } else if (msg.type === 'status') {
            if (msg.status === 'ready') {
                console.log("Offline Engine Ready");
                if (this.mode === 'offline') {
                    const indicator = document.getElementById('status-indicator');
                    if (indicator) {
                        indicator.textContent = 'Offline Ready';
                        indicator.className = 'status-indicator online'; // Use green for ready
                    }
                }
            } else if (msg.status === 'error') {
                console.error("Offline Engine Failed:", msg.error);
                alert("Offline Engine failed to load: " + msg.error);
            }
        }
    }

    parseAnsi(text) {
        // Basic ANSI parser for Jupyter tracebacks
        if (!text) return '';

        // Escape HTML
        text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // 1. Handle basic colors (30-37, 90-97)
        // 2. Handle simple styles (1: bold)
        // 3. Strip complex 256-colors (38;5;xx) for now to keep it clean/fast
        //    or valid CSS classes. simple stripping is safest for "slow/garbage" complaint.

        // Strip 38;5;xx (256 colors) and 48;5;xx (bg)
        text = text.replace(/\u001b\[(38|48);5;\d+m/g, '');

        // Basic Color Map
        const colors = {
            30: 'black', 31: '#d73a49', 32: '#28a745', 33: '#d7ba7d',
            34: '#0366d6', 35: '#d32992', 36: '#0598bc', 37: '#e0e0e0',
            90: '#6a737d', 91: '#f97583', 92: '#85e89d', 93: '#ffea7f',
            94: '#79b8ff', 95: '#b392f0', 96: '#9ecbff', 97: '#ffffff'
        };

        // Replace known codes
        text = text.replace(/\u001b\[(\d{1,2})m/g, (match, code) => {
            code = parseInt(code);
            if (code === 0 || code === 39 || code === 49) return '</span>';
            if (code === 1) return '<span style="font-weight:bold">';
            if (colors[code]) return `<span style="color:${colors[code]}">`;
            return ''; // Strip unknown 1-2 digit codes
        });

        // Strip any remaining ANSI escape sequences
        text = text.replace(/\u001b\[.*?m/g, '');

        return text;
    }

    showInputPrompt(cellId, promptText) {
        console.log("Showing input prompt for", cellId, "Text:", promptText);
        // alert("Input requested: " + promptText); // Debug alert

        const outputElement = document.getElementById(`output-${cellId}`);
        if (!outputElement) {
            console.error("Output element missing for input prompt");
            return;
        }

        const div = document.createElement('div');
        div.className = 'input-prompt-container';
        div.style.marginTop = '10px';

        const label = document.createElement('span');
        label.textContent = promptText + ' ';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'std-input';

        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit';
        submitBtn.className = 'btn btn-primary btn-sm';

        const submitInput = () => {
            const value = input.value;
            console.log("Sending input reply:", value);

            if (this.mode === 'online' && this.ws) {
                this.ws.send(JSON.stringify({
                    type: 'input_reply',
                    value: value
                }));
            } else {
                // Offline input handling (simulated via prompt usually, but here via message?)
                // Pyodide worker doesn't support async input easily without SharedArrayBuffer.
                // IF we used SharedArrayBuffer, we'd write to it.
                // For now, let's assume we can't easily do it in worker unless we use PROMPT.
                // Actually, Pyodide 0.23+ has 'setStdin' that can be a function. 
                // But we are in a worker. 
                // Simple hack: We probably won't get 'input_request' from Worker unless we implemented it specially.
                alert("Input not fully supported in Offline Mode yet.");
            }

            div.remove();

            // Show what was entered
            const pre = document.createElement('pre');
            pre.textContent = `${promptText} ${value}\n`;
            outputElement.append(pre);
        };

        submitBtn.onclick = submitInput;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') submitInput();
        };

        div.append(label, input, submitBtn);
        outputElement.append(div);
        input.focus();
    }

    setupEventListeners() {
        document.getElementById('start-coding-btn')?.addEventListener('click', () => this.showNotebook());
        document.getElementById('back-home-btn')?.addEventListener('click', () => this.showHome());

        document.getElementById('new-notebook-btn').addEventListener('click', () => this.newNotebook());
        document.getElementById('run-all-btn').addEventListener('click', () => this.runAllCells());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllOutputs());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartKernel());
        document.getElementById('save-btn').addEventListener('click', () => this.saveNotebook());
        document.getElementById('export-btn').addEventListener('click', () => this.showExportModal());
        document.getElementById('share-btn').addEventListener('click', () => this.showShareModal());
        document.getElementById('add-cell-btn').addEventListener('click', () => this.addCell());

        document.getElementById('open-btn').addEventListener('click', () => this.openNotebook());

        document.getElementById('close-export').addEventListener('click', () => this.hideExportModal());
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.exportNotebook(e.target.dataset.format));
        });

        document.getElementById('close-share').addEventListener('click', () => this.hideShareModal());
        document.getElementById('copy-link').addEventListener('click', () => this.copyShareLink());

        // File upload
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-upload');
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.uploadFile(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+N or Cmd+N for New Notebook
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newNotebook();
            }
        });
    }

    async openNotebook() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Luna Notebooks',
                    accept: {
                        'application/json': ['.json'],
                        'application/x-ipynb+json': ['.ipynb']
                    }
                }],
                multiple: false
            });

            const file = await fileHandle.getFile();
            const contents = await file.text();

            let loadedCells = [];

            if (file.name.endsWith('.ipynb')) {
                // Parse Jupyter format
                const nb = JSON.parse(contents);
                loadedCells = nb.cells.filter(c => c.cell_type === 'code').map((c, i) => ({
                    code: Array.isArray(c.source) ? c.source.join('') : c.source,
                    output: '' // Cannot easily restore output from ipynb locally without complex rendering
                }));
            } else {
                // Parse Luna JSON format
                const notebook = JSON.parse(contents);
                loadedCells = notebook.cells;
            }

            // Clear existing and load new
            this.cells = []; // Clear array
            document.getElementById('cells-container').innerHTML = ''; // Clear DOM
            this.cellCounter = 0;

            for (const cellData of loadedCells) {
                this.addCell(cellData.code);
                // If we saved output, we could restore it here, but re-running is safer for state consistency
                // For now, allow restoring output if present in Luna JSON
                if (cellData.output) {
                    const lastCell = this.cells[this.cells.length - 1];
                    lastCell.output = cellData.output;
                    document.getElementById(`output-${lastCell.id}`).innerHTML = cellData.output;
                }
            }
            alert("Notebook opened successfully!");

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Open failed:", err);
                alert("Failed to open file. Browser might not support this feature.");
            }
        }
    }

    async saveNotebook() {
        const notebook = {
            cells: this.cells.map(cell => ({
                code: cell.editor ? cell.editor.getValue() : cell.code,
                output: cell.output
            }))
        };

        const content = JSON.stringify(notebook, null, 2);

        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'luna-notebook.json',
                types: [{
                    description: 'Luna Notebook JSON',
                    accept: { 'application/json': ['.json'] },
                }],
            });

            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            alert("Notebook saved successfully!");

        } catch (err) {
            if (err.name !== 'AbortError') {
                // Fallback to old download method
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'luna-notebook.json';
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    }

    showExportModal() {
        document.getElementById('export-modal').classList.remove('hidden');
    }

    hideExportModal() {
        document.getElementById('export-modal').classList.add('hidden');
    }

    exportNotebook(format) {
        const notebook = {
            cells: this.cells.map(cell => ({
                code: cell.editor ? cell.editor.getValue() : cell.code,
                output: cell.output
            }))
        };

        let content, filename, mimeType;

        switch (format) {
            case 'json':
                content = JSON.stringify(notebook, null, 2);
                filename = `luna-notebook-${Date.now()}.json`;
                mimeType = 'application/json';
                break;
            case 'ipynb':
                const ipynb = {
                    cells: notebook.cells.map((cell, index) => ({
                        cell_type: 'code',
                        execution_count: index + 1,
                        source: [cell.code],
                        outputs: []
                    })),
                    metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' } },
                    nbformat: 4,
                    nbformat_minor: 4
                };
                content = JSON.stringify(ipynb, null, 2);
                filename = `luna-notebook-${Date.now()}.ipynb`;
                mimeType = 'application/json';
                break;
            case 'py':
                content = notebook.cells.map((cell, index) =>
                    `# Cell ${index + 1}\n${cell.code}\n\n`
                ).join('');
                filename = `luna-notebook-${Date.now()}.py`;
                mimeType = 'text/plain';
                break;
            case 'txt':
                content = notebook.cells.map((cell, index) =>
                    `[CELL ${index + 1}]\n${cell.code}\n\n[OUTPUT]\n${cell.output.replace(/<[^>]*>/g, '')}\n\n` +
                    `----------------------------------------\n\n`
                ).join('');
                filename = `luna-notebook-${Date.now()}.txt`;
                mimeType = 'text/plain';
                break;
            case 'html':
                content = this.generateHTML(notebook);
                filename = `luna-notebook-${Date.now()}.html`;
                mimeType = 'text/html';
                break;
            case 'pdf':
                content = this.generateHTML(notebook);
                filename = `luna-notebook-${Date.now()}.html`;
                mimeType = 'text/html';
                alert('HTML file created. Use Print > Save as PDF to create PDF.');
                break;
            default:
                return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.hideExportModal();
    }

    generateHTML(notebook) {
        const cellsHTML = notebook.cells.map((cell, index) => `
            <div class="cell">
                <div class="cell-header">In [${index + 1}]:</div>
                <div class="code-block">
                    <pre><code>${this.escapeHtml(cell.code)}</code></pre>
                </div>
                ${cell.output ? `
                    <div class="output-block">
                        <pre>${cell.output}</pre>
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Luna Book Export</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .cell { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .cell-header { background: #f5f5f5; padding: 10px; font-weight: bold; }
                .code-block { background: #1a1a1a; color: #00ff00; padding: 15px; }
                .output-block { background: #000; color: #00ff00; padding: 15px; }
                pre { margin: 0; white-space: pre-wrap; }
                code { font-family: 'Courier New', monospace; }
            </style>
        </head>
        <body>
            <h1>Luna Book - PADU LECHI NILABADU</h1>
            <p>Exported on: ${new Date().toLocaleString()}</p>
            ${cellsHTML}
        </body>
        </html>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showShareModal() {
        document.getElementById('share-modal').classList.remove('hidden');
        const shareLink = `${window.location.origin}${window.location.pathname}?shared=true`;
        document.getElementById('share-link').value = shareLink;
    }

    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
    }

    copyShareLink() {
        const shareLink = document.getElementById('share-link');
        shareLink.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    }
    async uploadFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.status === 'uploaded') {
                alert(`File ${result.filename} uploaded successfully to current workspace!`);
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (e) {
            alert('Upload error: ' + e.message);
        }
    }

    addCell(code = '') {
        const cellId = `cell-${++this.cellCounter}`;
        const cell = { id: cellId, code: code, output: '', editor: null };
        this.cells.push(cell);
        this.renderCell(cell);
        return cell;
    }

    renderCell(cell) {
        const cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.id = cell.id;

        // Split Layout Structure: Gutter | Editor | Output
        cellElement.innerHTML = `
            <div class="cell-gutter">
                <button class="play-btn" id="play-${cell.id}" onclick="lunaBook.runCell('${cell.id}')" title="Run Cell">▶</button>
            </div>
            
            <div class="cell-split-layout">
                <div class="cell-editor-pane">
                     <div class="pane-header">Code</div>
                     <div class="editor-container" id="editor-${cell.id}"></div>
                </div>
                <div class="cell-output-pane">
                     <div class="pane-header">Output</div>
                     <div class="output-container" id="output-${cell.id}">${cell.output}</div>
                </div>
            </div>
            
            <div class="cell-controls-overlay">
                <button class="icon-btn" onclick="lunaBook.deleteCell('${cell.id}')" title="Delete">🗑️</button>
                <button class="icon-btn" onclick="lunaBook.clearCellOutput('${cell.id}')" title="Clear Output">🚫</button>
            </div>
        `;

        document.getElementById('cells-container').appendChild(cellElement);
        this.initializeEditor(cell);
    }

    // Also need to handle "running" state on the play button specifically now
    updateCellRunningState(cellId, isRunning) {
        const btn = document.getElementById(`play-${cellId}`);
        if (!btn) return;
        if (isRunning) {
            btn.classList.add('running');
            btn.textContent = ''; // Spinner logic in CSS
        } else {
            btn.classList.remove('running');
            btn.textContent = '▶';
        }
    }

    initializeEditor(cell) {
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } });

        require(['vs/editor/editor.main'], () => {
            const editor = monaco.editor.create(document.getElementById(`editor-${cell.id}`), {
                value: cell.code,
                language: 'python',
                theme: 'vs-dark', // Dark editor
                minimap: { enabled: false },
                fontSize: 16, // Requested 16px
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace", // Requested Fonts
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                folding: false,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'line',
                smoothScrolling: true,
                cursorBlinking: 'smooth'
            });

            cell.editor = editor;

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                this.runCell(cell.id);
            });

            // Auto-resize height based on content
            editor.onDidChangeModelContent(() => {
                this.updateEditorHeight(cell.id, editor);
            });
            this.updateEditorHeight(cell.id, editor);
        });
    }

    updateEditorHeight(cellId, editor) {
        const lineCount = editor.getModel().getLineCount();
        const lineHeight = 21; // Approx for 16px font
        const height = Math.min(Math.max(lineCount * lineHeight + 32, 100), 800);
        document.getElementById(`editor-${cellId}`).style.height = `${height}px`;
        editor.layout();
    }

    async runCell(cellId) {
        const cell = this.cells.find(c => c.id === cellId);
        if (!cell) return;

        // Check if this cell is already executing
        if (this.executingCells.has(cellId)) {
            console.warn(`Cell ${cellId} is already executing`);
            return;
        }

        const cellElement = document.getElementById(cellId);
        const outputElement = document.getElementById(`output-${cellId}`);

        this.clearCellOutput(cellId);

        cellElement.classList.add('executing');
        this.executingCells.add(cellId);
        this.kernelBusy = true;

        this.updateCellRunningState(cellId, true); // Visual update logic

        outputElement.innerHTML = '';
        cell.output = '';

        const code = cell.editor ? cell.editor.getValue() : cell.code;

        if (this.mode === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log("Executing via Backend");
            this.ws.send(JSON.stringify({
                type: 'execute',
                code: code,
                cellId: cellId
            }));
        } else {
            console.log("Executing via Offline Worker");
            if (this.worker) {
                this.worker.postMessage({
                    type: 'execute',
                    code: code,
                    cellId: cellId
                });
            } else {
                outputElement.innerHTML = 'Error: Offline engine not ready.';
                cellElement.classList.remove('executing');
                this.executingCells.delete(cellId);
                this.kernelBusy = false;
                if (spinner) spinner.style.display = 'none';
            }
        }
    }

    async runAllCells() {
        if (this.cells.length === 0) {
            alert('No cells to run!');
            return;
        }

        console.log('Running all cells sequentially...');

        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            console.log(`Running cell ${i + 1}/${this.cells.length}: ${cell.id}`);

            // Run cell and wait for completion
            await this.runCellAndWait(cell.id);

            // Small delay between cells for visual feedback
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('All cells executed successfully!');
    }

    async runCellAndWait(cellId) {
        return new Promise((resolve) => {
            // Set up completion callback
            this.cellCompletionCallbacks[cellId] = resolve;

            // Run the cell
            this.runCell(cellId);

            // Timeout after 60 seconds
            setTimeout(() => {
                if (this.cellCompletionCallbacks[cellId]) {
                    console.warn(`Cell ${cellId} execution timeout`);
                    delete this.cellCompletionCallbacks[cellId];
                    resolve();
                }
            }, 60000);
        });
    }

    clearCellOutput(cellId) {
        const outputElement = document.getElementById(`output-${cellId}`);
        if (outputElement) {
            outputElement.innerHTML = '';
            outputElement.className = 'output-container';
        }
        const cell = this.cells.find(c => c.id === cellId);
        if (cell) cell.output = '';
    }

    clearAllOutputs() {
        this.cells.forEach(cell => this.clearCellOutput(cell.id));
    }

    deleteCell(cellId) {
        const cellIndex = this.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) return;
        this.cells.splice(cellIndex, 1);
        document.getElementById(cellId).remove();
    }

    async restartKernel() {
        const confirmed = confirm('Restart kernel? All variables will be lost and outputs will be cleared.');
        if (!confirmed) return;

        console.log('Restarting kernel...');

        // Clear all execution states
        this.executingCells.clear();
        this.kernelBusy = false;
        this.cellCompletionCallbacks = {};

        // Clear UI state for all cells
        this.cells.forEach(cell => {
            const cellElement = document.getElementById(cell.id);
            if (cellElement) {
                cellElement.classList.remove('executing');
                const spinner = cellElement.querySelector('.cell-spinner');
                if (spinner) spinner.style.display = 'none';
            }
        });

        // Clear all outputs
        this.clearAllOutputs();

        // Send restart command
        if (this.mode === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'restart' }));
        } else {
            // Offline restart = terminate and recreate worker
            if (this.worker) this.worker.terminate();
            this.initWorker();
            alert("Offline Runtime Restarted");
        }
    }

    async newNotebook() {
        // Check if there are cells with content
        const hasContent = this.cells.some(cell => {
            const code = cell.editor ? cell.editor.getValue() : cell.code;
            return code.trim().length > 0;
        });

        // Ask for confirmation if there's content
        if (hasContent) {
            const confirmed = confirm('Create new notebook? Current notebook will be cleared. Make sure to save your work first!');
            if (!confirmed) return;
        }

        console.log('Creating new notebook...');

        // Clear notebook and restart kernel
        this.clearNotebook();

        // Restart kernel for fresh state
        await this.restartKernelSilent();

        // Add initial cell
        this.addCell();

        console.log('New notebook created!');
    }

    clearNotebook() {
        // Clear all execution states
        this.executingCells.clear();
        this.kernelBusy = false;
        this.cellCompletionCallbacks = {};

        // Remove all cells from DOM
        document.getElementById('cells-container').innerHTML = '';

        // Clear cells array
        this.cells = [];
        this.cellCounter = 0;

        console.log('Notebook cleared');
    }

    async restartKernelSilent() {
        // Restart kernel without confirmation dialog (used internally)
        console.log('Restarting kernel silently...');

        // Clear all execution states
        this.executingCells.clear();
        this.kernelBusy = false;
        this.cellCompletionCallbacks = {};

        // Send restart command to backend
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'restart' }));
        }
    }
}


// Expose to window for React Wrapper
window.LunaBook = LunaBook;

// Removed auto-init listener to allow Manual Init by React
// let lunaBook;
// document.addEventListener('DOMContentLoaded', () => {
//     lunaBook = new LunaBook();
// });