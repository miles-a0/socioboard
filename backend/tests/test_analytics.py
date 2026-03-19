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
async def test_get_analytics_summary(client, auth_headers):
    response = client.get("/api/analytics/summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "history" in data
    assert isinstance(data["history"], list)
    # The history list builds a 7-day lookback array
    assert len(data["history"]) == 7
    
    current_stat = data["current"]
    assert "total_followers" in current_stat
    assert "engagement_rate" in current_stat
    assert "active_posts" in current_stat
    assert "profile_views" in current_stat
