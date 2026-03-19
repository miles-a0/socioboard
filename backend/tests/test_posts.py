import pytest

@pytest.fixture
def auth_headers(client, test_user):
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_create_post(client, auth_headers):
    payload = {
        "content": "Hello World",
        "scheduled_time": "2026-03-22T10:00:00Z",
        "platform": "facebook",
        "status": "scheduled",
        "media_urls": [],
        "account_id": None
    }
    response = client.post("/api/posts", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Hello World"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_posts(client, auth_headers):
    response = client.get("/api/posts", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_unauthorized_post_creation(client):
    payload = {
        "content": "Should fail",
        "platform": "facebook",
        "status": "scheduled"
    }
    response = client.post("/api/posts", json=payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_posts_crud_lifecycle(client, auth_headers):
    # 1. Create a post
    payload = {
        "content": "Lifecycle Post",
        "scheduled_time": "2026-03-22T10:00:00Z",
        "platform": "twitter",
        "status": "scheduled",
        "media_urls": [],
        "account_id": None
    }
    response = client.post("/api/posts", json=payload, headers=auth_headers)
    assert response.status_code == 200
    post_id = response.json()["id"]

    # 2. Update the post
    update_payload = dict(payload)
    update_payload["content"] = "Updated Lifecycle Post"
    put_response = client.put(f"/api/posts/{post_id}", json=update_payload, headers=auth_headers)
    assert put_response.status_code == 200
    assert put_response.json()["content"] == "Updated Lifecycle Post"

    # 3. Delete the post
    del_response = client.delete(f"/api/posts/{post_id}", headers=auth_headers)
    assert del_response.status_code == 200

    # 4. Verify deletion
    del_again = client.delete(f"/api/posts/{post_id}", headers=auth_headers)
    assert del_again.status_code == 404

@pytest.mark.asyncio
async def test_get_activity(client, auth_headers):
    response = client.get("/api/activity", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_bulk_posts_upload(client, auth_headers):
    csv_content = """platform,content,scheduled_time,media_urls
facebook,Bulk Post 1,2026-04-01T10:00:00Z,
twitter,Bulk Post 2,2026-04-01T11:00:00Z,http://example.com/img.png
"""
    from io import BytesIO
    file_data = BytesIO(csv_content.encode('utf-8'))
    file_data.name = "bulk.csv"
    
    response = client.post(
        "/api/posts/bulk",
        files={"file": ("bulk.csv", file_data, "text/csv")},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["scheduled_count"] == 2

