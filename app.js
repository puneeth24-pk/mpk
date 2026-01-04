class LunaBook {
    constructor() {
        this.cells = [];
        this.cellCounter = 0;
        this.ws = null;
        this.executingCells = new Set(); // Track which cells are currently executing
        this.kernelBusy = false; // Track if kernel is processing
        this.cellCompletionCallbacks = {}; // Callbacks for when cells complete
        this.init();
    }

    async init() {
        setTimeout(() => {
            document.getElementById('loading-page').classList.add('hidden');
            document.getElementById('home-page').classList.remove('hidden');
            this.connectWebSocket();
            this.setupEventListeners();
            this.addCell();
        }, 2000);
    }

    showNotebook() {
        document.getElementById('home-page').classList.add('hidden');
        document.getElementById('notebook-page').classList.remove('hidden');

        // Reset to fresh notebook when coming from home page
        if (this.cells.length === 0) {
            this.addCell();
        }

        // Refresh Monaco editors as they don't render correctly when initialized hidden
        setTimeout(() => this.refreshEditors(), 50);
    }

    showHome() {
        document.getElementById('notebook-page').classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');

        // Clear notebook when going back to home (fresh start next time)
        this.clearNotebook();
    }

    refreshEditors() {
        this.cells.forEach(cell => {
            if (cell.editor) {
                cell.editor.layout();
            }
        });
    }

    connectWebSocket() {
        let wsUrl;
        if (window.location.protocol === 'file:') {
            wsUrl = 'ws://localhost:8009/ws';
        } else {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}/ws`;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            document.getElementById('status').textContent = 'Connected';
            document.getElementById('status').style.color = '#00ff00';
        };

        this.ws.onclose = () => {
            document.getElementById('status').textContent = 'Disconnected';
            document.getElementById('status').style.color = 'red';
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            console.log("WebSocket Message Received:", msg);
            this.handleWebSocketMessage(msg);
        };
    }

    handleWebSocketMessage(msg) {
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
            cellElement.classList.remove('executing');
            // Remove spinner
            const spinner = cellElement.querySelector('.cell-spinner');
            if (spinner) spinner.style.display = 'none';
            outputElement.classList.add('success');

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
        }
    }

    parseAnsi(text) {
        // Basic ANSI parser for Jupyter tracebacks
        // 0: reset, 1: bold, 30-37: fg colors, 40-47: bg colors
        // This is a naive implementation but sufficient for basic tracebacks
        if (!text) return '';

        // Escape HTML first to prevent XSS from code content
        text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Define color map
        const colors = {
            30: 'black', 31: '#d73a49', 32: '#28a745', 33: '#d7ba7d',
            34: '#0366d6', 35: '#d32992', 36: '#0598bc', 37: 'white'
        };

        // Stack to keep track of current styles
        // But for regex replacement, we can just replace known codes with span tags
        // Reset (0/39/49) closes all spans? No, usually just resets color.
        // Simplification: Replace start code with span class/style, end code with </span>
        // Note: Jupyter tracebacks are well-behaved usually.

        // Replace color codes
        // \u001b[31m -> <span style="color:red">
        // \u001b[0m -> </span> (simplified)
        // \u001b[39m -> </span> (reset fg)

        // We'll process iteratively or use robust regex

        let html = text
            .replace(/\u001b\[0?m/g, '</span>') // simplistic reset
            .replace(/\u001b\[1m/g, '<span style="font-weight:bold">')
            .replace(/\u001b\[31m/g, '<span style="color:#ff6b6b">') // Red
            .replace(/\u001b\[32m/g, '<span style="color:#28a745">') // Green
            .replace(/\u001b\[33m/g, '<span style="color:#d7ba7d">') // Yellow
            .replace(/\u001b\[34m/g, '<span style="color:#0366d6">') // Blue
            .replace(/\u001b\[35m/g, '<span style="color:#d32992">') // Magenta
            .replace(/\u001b\[36m/g, '<span style="color:#0598bc">') // Cyan
            .replace(/\u001b\[37m/g, '<span style="color:#e0e0e0">') // White
            .replace(/\u001b\[39m/g, '</span>') // Default fg reset
            .replace(/\u001b\[\d+;?\d*m/g, ''); // Strip any other unhandled ansi codes

        // Clean up any unbalanced spans if necessary, or browser will handle it
        return html;
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
            this.ws.send(JSON.stringify({
                type: 'input_reply',
                value: value
            }));
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

        cellElement.innerHTML = `
            <div class="cell-header">
                <div class="cell-left">
                    <span class="cell-number">In [${this.cells.length}]:</span>
                    <div class="cell-spinner"></div>
                </div>
                <div class="cell-controls">
                    <button class="btn cell-btn btn-primary" onclick="lunaBook.runCell('${cell.id}')">▶ Run</button>
                    <button class="btn cell-btn btn-secondary" onclick="lunaBook.clearCellOutput('${cell.id}')">Clear</button>
                    <button class="btn cell-btn btn-secondary" onclick="lunaBook.deleteCell('${cell.id}')">Delete</button>
                </div>
            </div>
            <div class="editor-container" id="editor-${cell.id}"></div>
            <div class="output-container" id="output-${cell.id}">${cell.output}</div>
        `;

        document.getElementById('cells-container').appendChild(cellElement);
        this.initializeEditor(cell);
    }

    initializeEditor(cell) {
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } });

        require(['vs/editor/editor.main'], () => {
            const editor = monaco.editor.create(document.getElementById(`editor-${cell.id}`), {
                value: cell.code,
                language: 'python',
                theme: 'vs-dark',
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true
            });

            cell.editor = editor;

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                this.runCell(cell.id);
            });
        });
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

        // Show spinner
        const spinner = cellElement.querySelector('.cell-spinner');
        if (spinner) spinner.style.display = 'block';

        outputElement.innerHTML = '';
        cell.output = '';

        const code = cell.editor ? cell.editor.getValue() : cell.code;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'execute',
                code: code,
                cellId: cellId
            }));
        } else {
            outputElement.innerHTML = 'Error: Backend not connected';
            cellElement.classList.remove('executing');
            this.executingCells.delete(cellId);
            this.kernelBusy = false;
            if (spinner) spinner.style.display = 'none';
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

        // Send restart command to backend
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'restart' }));
        } else {
            alert("Backend not connected, cannot restart.");
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

let lunaBook;
document.addEventListener('DOMContentLoaded', () => {
    lunaBook = new LunaBook();
});