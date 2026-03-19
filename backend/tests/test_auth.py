def test_login_success(client, test_user):
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_failure(client, test_user):
    response = client.post(
        "/api/auth/token",
        data={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "newuser", "email": "new@example.com", "password": "newpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
