from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "storage"
DB_PATH = BASE_DIR / "secure_storage.db"
ALLOWED_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024

os.makedirs(DATA_DIR, exist_ok=True)

app = FastAPI(title="Simple Secure File Storage")

KEY = os.getenv("SECURE_FILE_KEY")
if not KEY:
    KEY = Fernet.generate_key().decode()
    os.environ["SECURE_FILE_KEY"] = KEY

cipher = Fernet(KEY.encode())


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            size INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL,
            encrypted BOOLEAN NOT NULL DEFAULT 1
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            filename TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


class FileRecord(BaseModel):
    id: int
    filename: str
    stored_name: str
    size: int
    uploaded_at: str
    encrypted: bool


class AuditLog(BaseModel):
    id: int
    action: str
    filename: str
    message: str
    created_at: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/files/upload", response_model=FileRecord)
async def upload_file(file: UploadFile = File(...)) -> FileRecord:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File is too large")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    stored_name = f"{timestamp}_{file.filename}"
    encrypted_bytes = cipher.encrypt(contents)
    target_path = DATA_DIR / stored_name
    target_path.write_bytes(encrypted_bytes)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO files (filename, stored_name, size, uploaded_at, encrypted)
        VALUES (?, ?, ?, ?, 1)
        """,
        (file.filename, stored_name, len(contents), datetime.utcnow().isoformat()),
    )
    file_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_action("upload", file.filename, "File uploaded and encrypted")

    return FileRecord(
        id=file_id,
        filename=file.filename,
        stored_name=stored_name,
        size=len(contents),
        uploaded_at=datetime.utcnow().isoformat(),
        encrypted=True,
    )


@app.get("/files/{file_id}", response_model=FileRecord)
def get_file_metadata(file_id: int) -> FileRecord:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    row = cur.execute(
        "SELECT id, filename, stored_name, size, uploaded_at, encrypted FROM files WHERE id = ?",
        (file_id,),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    return FileRecord(id=row[0], filename=row[1], stored_name=row[2], size=row[3], uploaded_at=row[4], encrypted=bool(row[5]))


@app.get("/files/{file_id}/download")
def download_file(file_id: int) -> FileResponse:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    row = cur.execute(
        "SELECT filename, stored_name FROM files WHERE id = ?",
        (file_id,),
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="File not found")

    filename, stored_name = row
    encrypted_path = DATA_DIR / stored_name
    if not encrypted_path.exists():
        raise HTTPException(status_code=404, detail="Stored file missing")

    encrypted_bytes = encrypted_path.read_bytes()
    plaintext = cipher.decrypt(encrypted_bytes)
    temp_path = DATA_DIR / f"decrypted_{stored_name}"
    temp_path.write_bytes(plaintext)
    log_action("download", filename, "File downloaded and decrypted")
    return FileResponse(temp_path, filename=filename)


@app.get("/audit")
def list_audit_logs() -> list[AuditLog]:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, action, filename, message, created_at FROM audit_logs ORDER BY id DESC"
    ).fetchall()
    conn.close()

    return [
        AuditLog(id=row[0], action=row[1], filename=row[2], message=row[3], created_at=row[4])
        for row in rows
    ]


def log_action(action: str, filename: str, message: str) -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO audit_logs (action, filename, message, created_at) VALUES (?, ?, ?, ?)",
        (action, filename, message, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
