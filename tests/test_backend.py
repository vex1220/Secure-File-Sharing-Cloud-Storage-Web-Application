from pathlib import Path

from fastapi.testclient import TestClient

from backend import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_upload_and_download_flow(tmp_path):
    sample = tmp_path / 'notes.txt'
    sample.write_text('hello secure world', encoding='utf-8')

    with sample.open('rb') as handle:
        response = client.post('/files/upload', files={'file': ('notes.txt', handle, 'text/plain')})

    assert response.status_code == 200
    payload = response.json()
    assert payload['filename'] == 'notes.txt'
    assert payload['encrypted'] is True

    download_response = client.get(f"/files/{payload['id']}/download")
    assert download_response.status_code == 200
    assert b'hello secure world' in download_response.content


def test_rejects_unsupported_extension(tmp_path):
    bad_file = tmp_path / 'bad.exe'
    bad_file.write_bytes(b'not allowed')

    with bad_file.open('rb') as handle:
        response = client.post('/files/upload', files={'file': ('bad.exe', handle, 'application/octet-stream')})

    assert response.status_code == 400
