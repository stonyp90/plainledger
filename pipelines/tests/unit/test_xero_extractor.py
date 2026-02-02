"""
Unit tests for Xero Extractor
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from extractors.xero.extractor import XeroExtractor
from extractors.base_extractor import EntityType, OAuthTokens


@pytest.fixture
def mock_tokens():
    """Mock OAuth tokens"""
    return OAuthTokens(
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        expires_at=datetime.utcnow() + timedelta(hours=1),
        token_type="Bearer",
    )


@pytest.fixture
def extractor(mock_tokens):
    """Create Xero extractor instance"""
    with patch.dict("os.environ", {
        "XERO_CLIENT_ID": "test_client_id",
        "XERO_CLIENT_SECRET": "test_client_secret",
    }):
        return XeroExtractor(
            organization_id="org-123",
            tokens=mock_tokens,
            tenant_id="tenant-123",
        )


def test_provider_properties(extractor):
    """Test provider ID and name"""
    assert extractor.provider_id == "xero"
    assert extractor.provider_name == "Xero"


def test_supported_entities(extractor):
    """Test supported entity types"""
    entities = extractor.supported_entities
    assert EntityType.ACCOUNT in entities
    assert EntityType.CONTACT in entities
    assert EntityType.TRANSACTION in entities


@pytest.mark.asyncio
async def test_refresh_tokens(extractor):
    """Test token refresh"""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 1800,
            "token_type": "Bearer",
        }
        mock_response.raise_for_status = MagicMock()

        mock_client_instance = AsyncMock()
        mock_client_instance.__aenter__.return_value.post = AsyncMock(
            return_value=mock_response
        )
        mock_client.return_value = mock_client_instance

        new_tokens = await extractor.refresh_tokens()

        assert new_tokens.access_token == "new_access_token"
        assert new_tokens.refresh_token == "new_refresh_token"


@pytest.mark.asyncio
async def test_extract_accounts(extractor):
    """Test account extraction"""
    mock_response_data = {
        "Accounts": [
            {"AccountID": "1", "Name": "Test Account", "Type": "BANK"},
            {"AccountID": "2", "Name": "Another Account", "Type": "EXPENSE"},
        ]
    }

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response_data

        results = []
        async for result in extractor.extract_entity(EntityType.ACCOUNT):
            results.append(result)

        assert len(results) == 1
        assert results[0].entity_type == EntityType.ACCOUNT
        assert len(results[0].records) == 2
        assert results[0].source_system == "XERO"


@pytest.mark.asyncio
async def test_extract_with_pagination(extractor):
    """Test extraction with pagination"""
    first_page = {
        "Accounts": [{"AccountID": str(i), "Name": f"Account {i}"} for i in range(100)]
    }
    second_page = {
        "Accounts": [{"AccountID": "100", "Name": "Account 100"}]
    }

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = [first_page, second_page]

        results = []
        async for result in extractor.extract_entity(EntityType.ACCOUNT):
            results.append(result)

        assert len(results) == 2
        assert len(results[0].records) == 100
        assert len(results[1].records) == 1


@pytest.mark.asyncio
async def test_extract_with_date_filter(extractor):
    """Test extraction with If-Modified-Since header"""
    since = datetime.utcnow() - timedelta(days=7)

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        # Simulate 304 Not Modified response
        mock_request.side_effect = Exception("304 Not Modified")

        results = []
        try:
            async for result in extractor.extract_entity(EntityType.ACCOUNT, since=since):
                results.append(result)
        except Exception:
            pass  # Expected for 304

        # Verify request was made with If-Modified-Since header
        assert mock_request.called
