import pytest
from io import BytesIO

@pytest.fixture
def auth_headers(client, test_user):
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_upload_media(client, auth_headers):
    # Create an in-memory test file
    file_content = b"fake image content"
    file_data = BytesIO(file_content)
    file_data.name = "test_image.png"

    response = client.post(
        "/api/upload",
        files={"file": ("test_image.png", file_data, "image/png")},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "url" in data

@pytest.mark.asyncio
async def test_list_media(client, auth_headers):
    response = client.get("/api/media", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_delete_media_not_found(client, auth_headers):
    # Assuming test_image_not_exist.png doesn't exist
    response = client.delete("/api/media/test_image_not_exist.png", headers=auth_headers)
    assert response.status_code == 404
