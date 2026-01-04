import jupyter_client
try:
    print("Attempting to start kernel...")
    km = jupyter_client.KernelManager(kernel_name='python3')
    km.start_kernel()
    print("Kernel started successfully")
    kc = km.client()
    print(f"Client created: {type(kc)}")
    kc.start_channels()
    print("Channels started")
    kc.wait_for_ready(timeout=10)
    print("Kernel client ready")
    km.shutdown_kernel()
    print("Kernel shutdown")
except Exception as e:
    print(f"Kernel verification failed: {e}")
    import traceback
    traceback.print_exc()
