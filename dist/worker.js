// worker.js - Pyodide Web Worker for Offline Execution
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;
let pyodideReadyPromise = null;

async function loadPyodideAndPackages() {
    try {
        pyodide = await loadPyodide();
        console.log("Pyodide loaded");

        // Load key packages - this might take time/bandwidth so we do it at start
        // In offline mode, these must be cached by Service Worker
        await pyodide.loadPackage(["numpy", "pandas", "matplotlib"]);
        console.log("Pyodide packages loaded");

        // Setup stdout/stderr redirection
        pyodide.setStdout({ batched: (msg) => postMessage({ type: 'stream', name: 'stdout', text: msg + '\n' }) });
        pyodide.setStderr({ batched: (msg) => postMessage({ type: 'stream', name: 'stderr', text: msg + '\n' }) });

        // Mount OPFS (Origin Private File System) if available
        try {
            const opfsRoot = await navigator.storage.getDirectory();
            // Pyodide nativeFS mount - functionality depends on version
            if (pyodide.mountNativeFS) {
                await pyodide.mountNativeFS("/mnt", opfsRoot);
                console.log("OPFS mounted at /mnt");
            } else {
                console.log("NativeFS mount check ignored, attempting fallback if needed or skipping");
                // For now, simpler IDBFS fallback for stability in older Pyodide versions
                pyodide.FS.mkdir('/mnt');
                pyodide.FS.mount(pyodide.FS.filesystems.IDBFS, {}, '/mnt');
                await new Promise(resolve => pyodide.FS.syncfs(true, resolve));
            }
        } catch (e) {
            console.warn("FileSystem mount failed:", e);
        }

        postMessage({ type: 'status', status: 'ready' });
        return true;
    } catch (err) {
        console.error("Pyodide failed to load", err);
        postMessage({ type: 'status', status: 'error', error: err.toString() });
        return false;
    }
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
    const { type, code, cellId, id } = event.data;

    // Ensure Pyodide is ready
    if (!pyodide) {
        await pyodideReadyPromise;
    }

    if (type === 'execute') {
        try {
            // Execution context for the cell
            // We use 'await' implicitly for top-level await support in notebooks
            await pyodide.runPythonAsync(`
import sys
import io
from js import console
# We can add more helpers here
`);

            // Execute user code
            let result = await pyodide.runPythonAsync(code);

            // Sync FS if using IDBFS
            if (pyodide.FS.filesystems.IDBFS) {
                await new Promise(resolve => pyodide.FS.syncfs(false, resolve));
            }

            // Handle output not captured by stdout (return value)
            if (result !== undefined) {
                postMessage({ type: 'execute_result', cellId: cellId, data: { 'text/plain': result.toString() } });
            }

            // Check for plots (Matplotlib)
            // Pyodide's matplotlib integration usually requires a little "show()" magic 
            // or we check the document element if we were in main thread, but in worker we rely on base64
            // For simplicity, we assume users use plt.show() which we might need to patch or hook
            // OR we inspect the 'figure' state.

            // Simple Matplotlib hook attempt:
            try {
                let img = pyodide.runPython(`
import io, base64
import matplotlib.pyplot as plt
buf = io.BytesIO()
if plt.get_fignums():
    plt.savefig(buf, format='png')
    buf.seek(0)
    # Return JUST the base64 string, no prefix
    img_str = base64.b64encode(buf.read()).decode('UTF-8')
    plt.clf()
    img_str
else:
    None
`);
                if (img) {
                    // Send as 'image' key to match app.js expectation
                    postMessage({ type: 'display_data', cellId: cellId, image: img });
                }
            } catch (e) {
                // Matplotlib might not be imported/used
            }

            postMessage({ type: 'complete', cellId: cellId });

        } catch (error) {
            postMessage({
                type: 'error',
                cellId: cellId,
                ename: error.name,
                evalue: error.message,
                traceback: [error.toString()]
            });
            postMessage({ type: 'complete', cellId: cellId });
        }
    }
};
