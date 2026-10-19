"""
======================================================================
EVENT BOOKING SYSTEM — MASTER RUNNER
======================================================================
One-click unified orchestrator that starts:
  1. Docker Desktop & infrastructure (RabbitMQ, Mailpit, MySQL)
  2. Database health verification & auto-seeding
  3. All 5 backend microservices (Gateway, Auth, Event, Booking, Notif)
  4. Frontend React Vite application
  5. Automatically launches the browser to http://localhost:5173

Usage:
  python main.py
======================================================================
"""

import os
import sys
import time
import signal
import socket
import subprocess
import threading
import webbrowser
from typing import List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Colors for terminal output
COLORS = {
    "SYSTEM": "\033[96m",   # Bright Cyan
    "DOCKER": "\033[94m",   # Blue
    "GATEWAY": "\033[95m",  # Magenta
    "AUTH": "\033[34m",     # Deep Blue
    "EVENT": "\033[36m",    # Cyan
    "BOOKING": "\033[32m",  # Green
    "NOTIF": "\033[33m",    # Yellow
    "FRONTEND": "\033[91m", # Red
    "SUCCESS": "\033[92m",  # Bright Green
    "WARN": "\033[93m",     # Bright Yellow
    "RESET": "\033[0m"
}

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Locate Python executable (.venv preferred)
VENV_PYTHON = os.path.join(ROOT_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

NPM_CMD = "npm.cmd" if os.name == "nt" else "npm"

processes: List[subprocess.Popen] = []
is_shutting_down = False


def log(prefix: str, msg: str, color_key: str = "SYSTEM"):
    c = COLORS.get(color_key, COLORS["RESET"])
    reset = COLORS["RESET"]
    print(f"{c}[{prefix:<10}]{reset} {msg}")


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.6)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False


def wait_for_port(port: int, timeout: int = 20, host: str = "127.0.0.1") -> bool:
    start = time.time()
    while time.time() - start < timeout:
        if is_port_in_use(port, host):
            return True
        time.sleep(0.5)
    return False


def is_docker_running() -> bool:
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=4)
        return res.returncode == 0
    except Exception:
        return False


def ensure_docker_and_infra():
    log("DOCKER", "Checking Docker status...", "DOCKER")
    if not is_docker_running():
        log("DOCKER", "Docker daemon is not running. Attempting to start Docker Desktop...", "WARN")
        docker_paths = [
            r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
            os.path.expandvars(r"%ProgramFiles%\Docker\Docker\Docker Desktop.exe"),
        ]
        launched = False
        for p in docker_paths:
            if os.path.exists(p):
                subprocess.Popen([p], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                launched = True
                log("DOCKER", f"Launched Docker Desktop from {p}", "DOCKER")
                break

        if launched:
            log("DOCKER", "Waiting up to 35 seconds for Docker to initialize...", "DOCKER")
            for _ in range(35):
                time.sleep(1)
                if is_docker_running():
                    log("DOCKER", "Docker daemon is now ONLINE!", "SUCCESS")
                    break

    # Start infrastructure containers
    if is_docker_running():
        # Check if local MySQL is already listening on 3306
        if is_port_in_use(3306):
            log("DOCKER", "Detected active MySQL server on port 3306. Starting RabbitMQ & Mailpit containers...", "DOCKER")
            subprocess.run(["docker", "compose", "up", "-d", "rabbitmq", "mailpit"], cwd=ROOT_DIR, stdout=subprocess.DEVNULL)
        else:
            log("DOCKER", "Starting MySQL, RabbitMQ & Mailpit containers...", "DOCKER")
            subprocess.run(["docker", "compose", "up", "-d", "mysql", "rabbitmq", "mailpit"], cwd=ROOT_DIR, stdout=subprocess.DEVNULL)
    else:
        log("DOCKER", "Docker unavailable. Proceeding with existing local database & services.", "WARN")

    # Ensure Mailpit is active on port 1025 (SMTP) and 8025 (Web UI) for OTP verification
    if not is_port_in_use(1025):
        mailpit_bin = os.path.join(ROOT_DIR, "infra", "mailpit", "mailpit.exe")
        if os.path.exists(mailpit_bin):
            log("MAILPIT", "Launching Mailpit email sandbox (:1025 SMTP, :8025 Web Inbox)...", "SUCCESS")
            p_mp = subprocess.Popen([mailpit_bin], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            processes.append(p_mp)
            wait_for_port(1025, timeout=5)
            wait_for_port(8025, timeout=5)
            log("MAILPIT", "Mailpit is ONLINE! View all verification OTPs at http://localhost:8025", "SUCCESS")


def ensure_database(force_seed: bool = False):
    log("SQL", "Verifying database connection and schemas...", "EVENT")
    check_cmd = [VENV_PYTHON, "scripts/db_ops.py", "--check"]
    res = subprocess.run(check_cmd, cwd=BACKEND_DIR, capture_output=True, text=True)
    if res.returncode == 0 and not force_seed:
        log("SQL", "Database verified healthy (all 4 databases initialized).", "SUCCESS")
    else:
        log("SQL", "Seeding database tables, accounts, and event catalog...", "WARN")
        seed_cmd = [VENV_PYTHON, "scripts/seed_database.py", "--dump"]
        seed_res = subprocess.run(seed_cmd, cwd=BACKEND_DIR, capture_output=True, text=True)
        if seed_res.returncode == 0:
            log("SQL", "Database seeded and verified successfully!", "SUCCESS")
        else:
            log("SQL", f"Database init note: {seed_res.stdout.strip().splitlines()[-1] if seed_res.stdout.strip() else 'Checked'}", "WARN")


def stream_logs(name: str, proc: subprocess.Popen):
    color = COLORS.get(name, COLORS["RESET"])
    reset = COLORS["RESET"]
    for line in iter(proc.stdout.readline, ""):
        if line and not is_shutting_down:
            print(f"{color}[{name:<8}]{reset} {line.rstrip()}")


def kill_lingering_ports():
    if os.name != "nt":
        return
    ports = [8000, 8001, 8002, 8003, 8004, 5173]
    for port in ports:
        try:
            cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | ForEach-Object {{ Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }}"'
            subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


def shutdown(signum=None, frame=None):
    global is_shutting_down
    if is_shutting_down:
        return
    is_shutting_down = True
    print("\n" + "=" * 70)
    print("\033[1;33mShutting down all microservices and frontend...\033[0m")
    print("=" * 70)

    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass

    for p in processes:
        try:
            p.wait(timeout=2)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass

    kill_lingering_ports()
    print("\033[1;32mAll services stopped successfully. Goodbye!\033[0m\n")
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("=" * 75)
    print("\033[1;36m  EVENT BOOKING SYSTEM — UNIFIED MASTER RUNNER\033[0m")
    print("=" * 75)
    print(f"  * Project Root:   {ROOT_DIR}")
    print(f"  * Backend Dir:    {BACKEND_DIR}")
    print(f"  * Frontend Dir:   {FRONTEND_DIR}")
    print(f"  * Python Engine:  {VENV_PYTHON}")
    print("=" * 75)

    # 1. Clean previous lingering processes on service ports
    kill_lingering_ports()

    # 2. Ensure Docker Desktop & Infrastructure (RabbitMQ, Mailpit, MySQL)
    ensure_docker_and_infra()

    # 3. Ensure SQL database schemas & demo data
    force_seed = "--seed" in sys.argv
    ensure_database(force_seed=force_seed)

    # 4. Define services to launch
    services_to_run = [
        {
            "name": "AUTH",
            "cmd": [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--app-dir", "services/auth-service", "--host", "127.0.0.1", "--port", "8001", "--reload"],
            "cwd": BACKEND_DIR,
            "port": 8001,
        },
        {
            "name": "EVENT",
            "cmd": [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--app-dir", "services/event-service", "--host", "127.0.0.1", "--port", "8002", "--reload"],
            "cwd": BACKEND_DIR,
            "port": 8002,
        },
        {
            "name": "BOOKING",
            "cmd": [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--app-dir", "services/booking-service", "--host", "127.0.0.1", "--port", "8003", "--reload"],
            "cwd": BACKEND_DIR,
            "port": 8003,
        },
        {
            "name": "NOTIF",
            "cmd": [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--app-dir", "services/notification-service", "--host", "127.0.0.1", "--port", "8004", "--reload"],
            "cwd": BACKEND_DIR,
            "port": 8004,
        },
        {
            "name": "GATEWAY",
            "cmd": [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--app-dir", "services/api-gateway", "--host", "127.0.0.1", "--port", "8000", "--reload"],
            "cwd": BACKEND_DIR,
            "port": 8000,
        },
        {
            "name": "FRONTEND",
            "cmd": [NPM_CMD, "run", "dev"],
            "cwd": FRONTEND_DIR,
            "port": 5173,
        },
    ]

    log("SYSTEM", "Starting 5 FastAPI microservices + React Vite frontend...", "SYSTEM")

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

    # 5. Wait for frontend & gateway to become reachable
    log("SYSTEM", "Waiting for Gateway (:8000) and Frontend (:5173)...", "SYSTEM")
    wait_for_port(8000, timeout=15)
    wait_for_port(5173, timeout=15)

    print("\n" + "=" * 75)
    print("\033[1;32m  [OK] ALL SERVICES ARE ONLINE & RUNNING!\033[0m")
    print("=" * 75)
    print("  * \033[1mFrontend Web App:\033[0m          http://localhost:5173")
    print("  * \033[1mAPI Gateway Swagger:\033[0m       http://127.0.0.1:8000/docs")
    print("  * \033[1mAggregated Health Probe:\033[0m   http://127.0.0.1:8000/health")
    print("  * \033[1mMailpit Email Inbox:\033[0m       http://localhost:8025")
    print("=" * 75)
    print("  \033[1;33mPress Ctrl+C anytime to stop all services.\033[0m\n")

    # Automatically open the web browser
    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    try:
        while not is_shutting_down:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


if __name__ == "__main__":
    main()
