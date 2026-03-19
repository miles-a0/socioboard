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
async def test_get_user_me(client, auth_headers, test_user):
    response = client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"

@pytest.mark.asyncio
async def test_update_user_me(client, auth_headers):
    payload = {
        "username": "updated_user",
        "email": "updated@example.com"
    }
    response = client.put("/api/users/me", headers=auth_headers, json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "updated_user"
    assert data["email"] == "updated@example.com"
    
    # Revert to original so other tests don't break assuming testuser
    revert_payload = {"username": "testuser", "email": "test@example.com"}
    client.put("/api/users/me", headers=auth_headers, json=revert_payload)

@pytest.mark.asyncio
async def test_change_password(client, auth_headers):
    # Test incorrect current password
    payload_bad = {
        "current_password": "wrong_password",
        "new_password": "newpassword123"
    }
    response_bad = client.post("/api/users/me/password", headers=auth_headers, json=payload_bad)
    assert response_bad.status_code == 400

    # Test correct current password
    payload_good = {
        "current_password": "testpassword",
        "new_password": "newpassword123"
    }
    response_good = client.post("/api/users/me/password", headers=auth_headers, json=payload_good)
    assert response_good.status_code == 200
    
    # Revert password back
    payload_revert = {
        "current_password": "newpassword123",
        "new_password": "testpassword"
    }
    client.post("/api/users/me/password", headers=auth_headers, json=payload_revert)

@pytest.mark.asyncio
async def test_get_email_settings(client, auth_headers):
    # The endpoint is /users/me/email-settings without /api/
    # Main.py defines it without /api/ prefix: @app.get("/users/me/email-settings")
    response = client.get("/users/me/email-settings", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "sendgrid_api_key" in data

@pytest.mark.asyncio
async def test_update_email_settings(client, auth_headers):
    payload = {
        "sendgrid_api_key": "SG.testkey",
        "sendgrid_sender_email": "test@sender.com"
    }
    response = client.put("/users/me/email-settings", headers=auth_headers, json=payload)
    assert response.status_code == 200
    assert response.json() == {"message": "Email settings updated successfully."}
