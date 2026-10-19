import sys
import os
import signal
import subprocess
import threading
import argparse

# Colors for terminal output
COLORS = {
    "GATEWAY": "\033[95m",  # Magenta
    "AUTH": "\033[94m",     # Blue
    "EVENT": "\033[96m",    # Cyan
    "BOOKING": "\033[92m",  # Green
    "NOTIF": "\033[93m",    # Yellow
    "FRONTEND": "\033[91m", # Red
    "RESET": "\033[0m"
}

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PYTHON_EXE = sys.executable

SERVICES = [
    {
        "name": "AUTH",
        "cmd": [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--app-dir", "services/auth-service", "--host", "127.0.0.1", "--port", "8001"],
        "cwd": ROOT_DIR,
    },
    {
        "name": "EVENT",
        "cmd": [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--app-dir", "services/event-service", "--host", "127.0.0.1", "--port", "8002"],
        "cwd": ROOT_DIR,
    },
    {
        "name": "BOOKING",
        "cmd": [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--app-dir", "services/booking-service", "--host", "127.0.0.1", "--port", "8003"],
        "cwd": ROOT_DIR,
    },
    {
        "name": "NOTIF",
        "cmd": [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--app-dir", "services/notification-service", "--host", "127.0.0.1", "--port", "8004"],
        "cwd": ROOT_DIR,
    },
    {
        "name": "GATEWAY",
        "cmd": [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--app-dir", "services/api-gateway", "--host", "127.0.0.1", "--port", "8000"],
        "cwd": ROOT_DIR,
    },
]

processes = []

def stream_logs(name, proc):
    color = COLORS.get(name, COLORS["RESET"])
    reset = COLORS["RESET"]
    for line in iter(proc.stdout.readline, ""):
        if line:
            print(f"{color}[{name:<8}]{reset} {line.rstrip()}")

def shutdown(signum=None, frame=None):
    print("\n\033[1;33mShutting down all microservices...\033[0m")
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    for p in processes:
        try:
            p.wait(timeout=3)
        except Exception:
            p.kill()
    print("\033[1;32mAll services stopped successfully.\033[0m")
    sys.exit(0)

def main():
    parser = argparse.ArgumentParser(description="Event Booking System Development Supervisor")
    parser.add_argument("--with-frontend", action="store_true", help="Also start the React Vite frontend server")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("=" * 70)
    print("EVENT BOOKING SYSTEM — LOCAL DEVELOPMENT ENVIRONMENT")
    print("=" * 70)
    print("  * API Gateway:          http://127.0.0.1:8000")
    print("  * Auth Service:         http://127.0.0.1:8001")
    print("  * Event Service:        http://127.0.0.1:8002")
    print("  * Booking Service:      http://127.0.0.1:8003")
    print("  * Notification Service: http://127.0.0.1:8004")
    if args.with_frontend:
        print("  * React Frontend:       http://localhost:5173")
    print("=" * 70)
    print("Press Ctrl+C to stop all services.\n")

    services_to_run = list(SERVICES)
    if args.with_frontend:
        frontend_dir = os.path.join(ROOT_DIR, "frontend")
        if not os.path.isdir(frontend_dir):
            frontend_dir = os.path.abspath(os.path.join(ROOT_DIR, "..", "frontend"))
        services_to_run.append({
            "name": "FRONTEND",
            "cmd": ["npm.cmd" if os.name == "nt" else "npm", "run", "dev"],
            "cwd": frontend_dir,
        })

    for s in services_to_run:
        p = subprocess.Popen(
            s["cmd"],
            cwd=s["cwd"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        processes.append(p)
        t = threading.Thread(target=stream_logs, args=(s["name"], p), daemon=True)
        t.start()

    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        shutdown()

if __name__ == "__main__":
    main()
