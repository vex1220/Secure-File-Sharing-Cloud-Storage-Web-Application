# Simple secure backend

This backend adds a beginner-friendly secure file flow using FastAPI and SQLite.

## Features
- Upload validation for size and file extension
- Basic AES-style encryption using Fernet
- Simple audit logging for upload/download events
- Basic download endpoint

## Run locally
```bash
python -m uvicorn backend:app --reload
```

## Run tests
```bash
pytest -q
```
