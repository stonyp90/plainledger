"""
Xero Extractor

Extracts data from Xero API.
Implements BaseExtractor for consistent extraction behavior.
"""

import os
import logging
from datetime import datetime, timedelta
from typing import AsyncIterator, Dict, Any, Optional
import httpx
from ..base_extractor import (
    BaseExtractor,
    EntityType,
    ExtractionResult,
    OAuthTokens,
)

logger = logging.getLogger(__name__)


class XeroExtractor(BaseExtractor):
    """Extractor for Xero API"""

    XERO_API_BASE = "https://api.xero.com/api.xro/2.0"

    def __init__(
        self,
        organization_id: str,
        tokens: OAuthTokens,
        tenant_id: Optional[str] = None,
        rate_limit_delay_ms: int = 100,
    ):
        super().__init__(organization_id, tokens, rate_limit_delay_ms)
        self.tenant_id = tenant_id or organization_id
        self.client_id = os.getenv("XERO_CLIENT_ID")
        self.client_secret = os.getenv("XERO_CLIENT_SECRET")

    @property
    def provider_id(self) -> str:
        return "xero"

    @property
    def provider_name(self) -> str:
        return "Xero"

    @property
    def supported_entities(self) -> list[EntityType]:
        return [
            EntityType.ACCOUNT,
            EntityType.CONTACT,
            EntityType.TRANSACTION,
            EntityType.INVOICE,
            EntityType.BILL,
            EntityType.PAYMENT,
        ]

    async def refresh_tokens(self) -> OAuthTokens:
        """Refresh Xero OAuth2 tokens"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Xero client credentials not configured")

        url = "https://identity.xero.com/connect/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.tokens.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=data)
            response.raise_for_status()
            token_data = response.json()

            return OAuthTokens(
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token", self.tokens.refresh_token),
                expires_at=datetime.utcnow()
                + timedelta(seconds=token_data.get("expires_in", 1800)),
                token_type=token_data.get("token_type", "Bearer"),
            )

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """Make authenticated request to Xero API"""
        # Check if token needs refresh
        if datetime.utcnow() >= self.tokens.expires_at - timedelta(minutes=5):
            logger.info("Refreshing Xero tokens")
            self.tokens = await self.refresh_tokens()

        url = f"{self.XERO_API_BASE}/{endpoint}"
        request_headers = {
            "Authorization": f"{self.tokens.token_type} {self.tokens.access_token}",
            "Xero-tenant-id": self.tenant_id,
            "Accept": "application/json",
        }
        if headers:
            request_headers.update(headers)

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=request_headers, params=params)
            response.raise_for_status()
            self._request_count += 1
            return response.json()

    async def extract_entity(
        self,
        entity_type: EntityType,
        since: Optional[datetime] = None,
    ) -> AsyncIterator[ExtractionResult]:
        """Extract entities from Xero API"""
        entity_map = {
            EntityType.ACCOUNT: "Accounts",
            EntityType.CONTACT: "Contacts",
            EntityType.TRANSACTION: "Transactions",
            EntityType.INVOICE: "Invoices",
            EntityType.BILL: "Bills",
            EntityType.PAYMENT: "Payments",
        }

        xero_endpoint = entity_map.get(entity_type)
        if not xero_endpoint:
            logger.warning(f"Entity type {entity_type} not supported by Xero")
            return

        page = 1
        page_size = 100  # Xero max per page

        while True:
            params = {"page": page}
            if since:
                # Xero uses If-Modified-Since header
                headers = {
                    "If-Modified-Since": since.strftime("%Y-%m-%dT%H:%M:%S"),
                }
            else:
                headers = None

            try:
                response = await self._make_request(xero_endpoint, params, headers)
                entities = response.get(xero_endpoint, [])

                if not entities:
                    break

                yield ExtractionResult(
                    entity_type=entity_type,
                    records=entities if isinstance(entities, list) else [entities],
                    source_system="XERO",
                    organization_id=self.organization_id,
                    extracted_at=datetime.utcnow(),
                    page_info={
                        "page": page,
                        "page_size": page_size,
                        "count": len(entities),
                    },
                )

                # Check if there are more pages
                if len(entities) < page_size:
                    break

                page += 1

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    # Token expired, refresh and retry
                    logger.warning("Xero token expired, refreshing")
                    self.tokens = await self.refresh_tokens()
                    continue
                elif e.response.status_code == 304:
                    # Not modified (If-Modified-Since header)
                    logger.info(f"No changes since {since}")
                    break
                logger.error(f"Xero API error: {e}")
                break
            except Exception as e:
                logger.error(f"Error extracting {entity_type} from Xero: {e}")
                break
