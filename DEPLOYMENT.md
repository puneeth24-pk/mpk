# Deployment & Scalability Guide

## 1. Hosting Recommendations
For a Python-based application with stateful WebSocket sessions (Jupyter Kernels), stateless serverless functions (like Vercel functions/AWS Lambda) are **NOT recommended** because they cannot maintain the continuous kernel process required for the "Online Mode".

### Recommended Services

#### **Option A: Render (Best for ease of use)**
*   **Service**: Web Service (Docker or Python environment).
*   **Pros**: Excellent free tier, native support for `requirements.txt` and `uvicorn`, persistent disks available (paid).
*   **Cost**: Free tier spins down after inactivity. $7/mo for "Starter" is reliable.
*   **Command**: `uvicorn backend:app --host 0.0.0.0 --port 10000`

#### **Option B: Railway (Best for performance)**
*   **Service**: Application.
*   **Pros**: Very fast build times, generous trial, keeps containers alive better than Render free tier.
*   **Cost**: ~$5/mo based on usage.

#### **Option C: Fly.io (Best for global latency)**
*   **Service**: Firecracker MicroVMs.
*   **Pros**: Runs your container close to users.
*   **Cost**: Free allowance is good for small apps.

---

## 2. Scaling to 100+ Concurrent Students

Since this application allows users to execute arbitrary Python code (NumPy, Pandas), a single server can easily be overwhelmed if 100 users run heavy calculations simultaneously in "Online Mode".

### **The Secret Weapon: Offline Isolation**
You have already implemented the **Offline / Hybrid Mode** using Pyodide (Web Workers). **This is your key scaling strategy.**

**Strategy:**
1.  **Default to Offline**: Encourage or force students to use the "Offline Mode" (client-side execution). 
    *   *Result:* 100 students = 0% CPU load on your server. Their own laptops do the work.
    *   *Benefit:* Free to scale to 1000+ users.
2.  **Online Mode as Backup**: Use the server only for:
    *   Deep Learning (GPU requirements - if you upgrade server).
    *   Files that must be stored centrally (though your app focuses on local files).
    *   Low-end devices (Chromebooks) that can't run Pyodide well.

### **Server-Side Optimizations (If using Online Mode)**

If you *must* run 100 users on the server:
1.  **Increase RAM**: Python kernels are heavy (~50MB-100MB RAM each with pandas loaded). 100 users = ~5GB-10GB RAM. You will need a larger VPS (e.g., DigitalOcean Droplet with 8GB RAM).
2.  **Kernel Culling**: Modify `backend.py` to auto-shutdown kernels after 10 minutes of inactivity to free up RAM.
3.  **Process Pools**: Currently, `AsyncKernelManager` spawns a new process per user. For 100 users, this is heavy. 
    *   *Advanced:* Use a "Kernel Gateway" or JupyterHub for enterprise-grade management, but that complicates deployment significantly.

**Recommendation**: Stick to **Render/Railway** + **Offline Mode Default** for the best balance of cost and performance.
