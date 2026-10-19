import os
import sys
import subprocess
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.isdir(os.path.join(SCRIPT_DIR, "services")):
    BACKEND_DIR = SCRIPT_DIR
elif os.path.isdir(os.path.join(SCRIPT_DIR, "backend", "services")):
    BACKEND_DIR = os.path.join(SCRIPT_DIR, "backend")
else:
    BACKEND_DIR = os.getcwd()

SERVICES = [
    ("Auth Service", "services/auth-service/tests"),
    ("Event Service", "services/event-service/tests"),
    ("Booking Service", "services/booking-service/tests"),
    ("Notification Service", "services/notification-service/tests"),
    ("API Gateway", "services/api-gateway/tests"),
    ("Integration Suite", "tests/integration"),
]

def main():
    print("=" * 70)
    print("EVENT BOOKING SYSTEM — TEST RUNNER (ISOLATED MICROSERVICES)")
    print(f"Working Directory: {BACKEND_DIR}")
    print("=" * 70)

    total_passed = 0
    total_failed = 0
    results = []

    start_time = time.time()
    for name, test_dir in SERVICES:
        print(f"\n[RUNNING] {name} ({test_dir})...")
        cmd = [sys.executable, "-m", "pytest", test_dir, "-q"]
        res = subprocess.run(cmd, cwd=BACKEND_DIR, capture_output=True, text=True)

        if res.returncode == 0:
            print(f"[PASSED] {name}")
            results.append((name, "PASSED", res.stdout.strip().splitlines()[-1] if res.stdout.strip() else "OK"))
            total_passed += 1
        else:
            print(f"[FAILED] {name}")
            print(res.stdout)
            print(res.stderr)
            results.append((name, "FAILED", "Errors encountered"))
            total_failed += 1

    elapsed = time.time() - start_time
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for name, status, summary in results:
        print(f"  {name:<25} : {status:<8} ({summary})")
    print("-" * 70)
    print(f"Total Suites: {len(SERVICES)} | Passed: {total_passed} | Failed: {total_failed} | Time: {elapsed:.2f}s")
    print("=" * 70)

    sys.exit(0 if total_failed == 0 else 1)

if __name__ == "__main__":
    main()
