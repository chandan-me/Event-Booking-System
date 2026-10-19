"""
Restore & Seed Database Script for Event Booking System
Imports infra/mysql/seeded_db.sql into MySQL.

Usage:
    python backend/scripts/restore_seeded_db.py
    python backend/scripts/restore_seeded_db.py --user root --password your_password
"""

import os
import sys
import subprocess
import argparse
from urllib.parse import urlparse
from dotenv import load_dotenv

# Path resolution
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SQL_FILE = os.path.join(ROOT_DIR, "infra", "mysql", "seeded_db.sql")

load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(ROOT_DIR, "backend", ".env"))


def get_default_creds():
    # Attempt to extract from AUTH_DATABASE_URL or default to dev credentials
    db_url = os.getenv("AUTH_DATABASE_URL", "mysql+pymysql://app_user:app_password_dev_only@localhost:3306/event_auth_db")
    parsed = urlparse(db_url.replace("mysql+pymysql://", "http://"))
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 3306,
        "user": parsed.username or "app_user",
        "password": parsed.password or "app_password_dev_only",
    }


def restore_via_mysql_cli(host, port, user, password, sql_path):
    print(f"Executing restore using mysql CLI against {host}:{port} as '{user}'...")
    cmd = [
        "mysql",
        f"-h{host}",
        f"-P{port}",
        f"-u{user}",
        f"-p{password}",
    ]
    with open(sql_path, "rb") as f:
        res = subprocess.run(cmd, stdin=f, capture_output=True, text=True)
    if res.returncode == 0:
        return True, "Restored successfully via mysql CLI."
    return False, res.stderr


def restore_via_pymysql(host, port, user, password, sql_path):
    print(f"Executing restore using pymysql against {host}:{port} as '{user}'...")
    import pymysql
    from pymysql.constants import CLIENT

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        autocommit=True,
        client_flag=CLIENT.MULTI_STATEMENTS,
    )
    with conn.cursor() as cur:
        with open(sql_path, "r", encoding="utf-8", errors="ignore") as f:
            sql_content = f.read()

        # Split into blocks by DELIMITER or semicolons if needed, but MULTI_STATEMENTS can execute bulk
        cur.execute(sql_content)
    conn.close()
    return True, "Restored successfully via pymysql."


def run_diagnostics():
    db_ops_script = os.path.join(ROOT_DIR, "backend", "scripts", "db_ops.py")
    if os.path.isfile(db_ops_script):
        print("\nVerifying database health...")
        subprocess.run([sys.executable, db_ops_script, "--stats"])


def main():
    parser = argparse.ArgumentParser(description="Restore pre-seeded MySQL database for Event Booking System")
    defaults = get_default_creds()
    parser.add_argument("--host", default=defaults["host"], help=f"MySQL host (default: {defaults['host']})")
    parser.add_argument("--port", type=int, default=defaults["port"], help=f"MySQL port (default: {defaults['port']})")
    parser.add_argument("--user", default=defaults["user"], help=f"MySQL user (default: {defaults['user']})")
    parser.add_argument("--password", default=defaults["password"], help="MySQL password")
    parser.add_argument("--file", default=SQL_FILE, help="Path to SQL dump file")

    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"[ERROR] SQL dump file not found at: {args.file}")
        sys.exit(1)

    print("=" * 65)
    print("EVENT BOOKING SYSTEM - DATABASE SEED & RESTORE TOOL")
    print("=" * 65)
    print(f"Target Server : {args.host}:{args.port}")
    print(f"Database User : {args.user}")
    print(f"Seed File     : {os.path.basename(args.file)} ({os.path.getsize(args.file) / 1024:.1f} KB)")
    print("=" * 65)

    success = False
    error_msg = ""

    # Try CLI first if mysql is available
    try:
        success, msg = restore_via_mysql_cli(args.host, args.port, args.user, args.password, args.file)
        if success:
            print(f"[SUCCESS] {msg}")
    except Exception as e:
        error_msg = str(e)

    # Fallback to PyMySQL if mysql command is not found or failed
    if not success:
        try:
            success, msg = restore_via_pymysql(args.host, args.port, args.user, args.password, args.file)
            if success:
                print(f"[SUCCESS] {msg}")
        except Exception as e:
            print(f"[FAILED] PyMySQL execution error: {e}")
            if error_msg:
                print(f"[INFO] CLI error was: {error_msg}")
            sys.exit(1)

    run_diagnostics()
    print("\nDatabase restoration complete! All microservices can now interact with seeded data.")


if __name__ == "__main__":
    main()
