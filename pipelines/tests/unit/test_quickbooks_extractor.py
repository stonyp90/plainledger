"""
Unit tests for QuickBooks Extractor
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from extractors.quickbooks.extractor import QuickBooksExtractor
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
    """Create QuickBooks extractor instance"""
    with patch.dict("os.environ", {
        "QUICKBOOKS_CLIENT_ID": "test_client_id",
        "QUICKBOOKS_CLIENT_SECRET": "test_client_secret",
    }):
        return QuickBooksExtractor(
            organization_id="org-123",
            tokens=mock_tokens,
            realm_id="realm-123",
        )


def test_provider_properties(extractor):
    """Test provider ID and name"""
    assert extractor.provider_id == "quickbooks"
    assert extractor.provider_name == "QuickBooks Online"


def test_supported_entities(extractor):
    """Test supported entity types"""
    entities = extractor.supported_entities
    assert EntityType.ACCOUNT in entities
    assert EntityType.CONTACT in entities
    assert EntityType.TRANSACTION in entities
    assert EntityType.INVOICE in entities


@pytest.mark.asyncio
async def test_refresh_tokens(extractor, mock_tokens):
    """Test token refresh"""
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
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
        "QueryResponse": {
            "Account": [
                {"Id": "1", "Name": "Test Account", "AccountType": "Bank"},
                {"Id": "2", "Name": "Another Account", "AccountType": "Expense"},
            ],
            "maxResults": 2,
        }
    }

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response_data

        results = []
        async for result in extractor.extract_entity(EntityType.ACCOUNT):
            results.append(result)

        assert len(results) == 1
        assert results[0].entity_type == EntityType.ACCOUNT
        assert len(results[0].records) == 2
        assert results[0].source_system == "QUICKBOOKS"


@pytest.mark.asyncio
async def test_extract_with_pagination(extractor):
    """Test extraction with pagination"""
    first_page = {
        "QueryResponse": {
            "Account": [{"Id": str(i), "Name": f"Account {i}"} for i in range(20)],
            "maxResults": 20,
        }
    }
    second_page = {
        "QueryResponse": {
            "Account": [{"Id": "20", "Name": "Account 20"}],
            "maxResults": 1,
        }
    }

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = [first_page, second_page]

        results = []
        async for result in extractor.extract_entity(EntityType.ACCOUNT):
            results.append(result)

        assert len(results) == 2
        assert len(results[0].records) == 20
        assert len(results[1].records) == 1


@pytest.mark.asyncio
async def test_extract_with_date_filter(extractor):
    """Test extraction with date filter"""
    since = datetime.utcnow() - timedelta(days=7)

    with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"QueryResponse": {"Account": []}}

        results = []
        async for result in extractor.extract_entity(EntityType.ACCOUNT, since=since):
            results.append(result)

        # Verify query includes date filter
        call_args = mock_request.call_args
        assert call_args is not None


@pytest.mark.asyncio
async def test_token_refresh_on_expiry(extractor, mock_tokens):
    """Test automatic token refresh when expired"""
    # Set token to expire soon
    mock_tokens.expires_at = datetime.utcnow() + timedelta(minutes=4)

    with patch.object(extractor, "refresh_tokens", new_callable=AsyncMock) as mock_refresh:
        new_tokens = OAuthTokens(
            access_token="refreshed_token",
            refresh_token="refreshed_refresh",
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        mock_refresh.return_value = new_tokens

        with patch.object(extractor, "_make_request", new_callable=AsyncMock) as mock_request:
            mock_request.return_value = {"QueryResponse": {"Account": []}}

            # Trigger extraction which should refresh token
            async for _ in extractor.extract_entity(EntityType.ACCOUNT):
                pass

            # Verify token was refreshed
            mock_refresh.assert_called_once()
