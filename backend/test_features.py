import pytest
from httpx import AsyncClient, ASGITransport
import os

# Set environment variables for OAuth tests
os.environ["SNAPCHAT_CONFIDENTIAL_CLIENT_ID"] = "test-confidential-client-id"
os.environ["SNAPCHAT_CLIENT_SECRET"] = "test-client-secret"
os.environ["NGROK_URL"] = "https://test-ngrok-url.ngrok-free.dev"

from main import app, PostResponse

@pytest.mark.asyncio
async def test_snapchat_login_oauth_route():
    """
    Test that the Snapchat authentication route correctly uses the 
    Confidential Client ID and requests the 'snapchat-marketing-api' scope natively.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/auth/snapchat/login", follow_redirects=False)
        
        # It should return a 307 Temporary Redirect to Snapchat's OAuth portal
        assert response.status_code == 307
        
        redirect_url = response.headers.get("location")
        assert redirect_url is not None
        
        # Ensure the Confidential Client ID is explicitly used over the public one
        assert "client_id=test-confidential-client-id" in redirect_url
        
        # Ensure the Marketing Scope is successfully injected into the redirect payload
        assert "snapchat-marketing-api" in redirect_url
        
def test_pydantic_post_response_account_id():
    """
    Test that the PostResponse schema natively permits 'account_id'
    transfers so the React frontend correctly renders non-default social labels.
    """
    mock_post_from_db = {
        "id": "12345",
        "content": "Testing the deployment algorithm!",
        "scheduled_time": "2026-03-24T12:00:00Z",
        "platform": "facebook",
        "status": "scheduled",
        "media_urls": [],
        "account_id": "Enterprise Account Name" # Previously, Pydantic dropped this natively!
    }
    
    validated_model = PostResponse(**mock_post_from_db)
    
    # Assert the account_id wasn't stripped out by strict definitions
    assert validated_model.account_id == "Enterprise Account Name"
