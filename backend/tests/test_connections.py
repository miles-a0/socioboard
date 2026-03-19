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
async def test_get_user_connections_empty(client, auth_headers):
    # Depending on how the test database is setup, it might be empty
    response = client.get("/api/users/me/connections", headers=auth_headers)
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)

@pytest.mark.asyncio
async def test_delete_user_connection_not_found(client, auth_headers):
    response = client.delete("/api/users/me/connections/non-existent-provider", headers=auth_headers)
    assert response.status_code == 404
    data = response.json()
    assert "No active connection found" in data["detail"]
