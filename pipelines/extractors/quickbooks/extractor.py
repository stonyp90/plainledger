"""
QuickBooks Extractor

Extracts data from QuickBooks Online API.
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


class QuickBooksExtractor(BaseExtractor):
    """Extractor for QuickBooks Online API"""

    QB_API_BASE = "https://sandbox-quickbooks.api.intuit.com"  # Sandbox
    # QB_API_BASE = "https://quickbooks.api.intuit.com"  # Production

    def __init__(
        self,
        organization_id: str,
        tokens: OAuthTokens,
        realm_id: Optional[str] = None,
        rate_limit_delay_ms: int = 100,
    ):
        super().__init__(organization_id, tokens, rate_limit_delay_ms)
        self.realm_id = realm_id or organization_id
        self.client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
        self.client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")

    @property
    def provider_id(self) -> str:
        return "quickbooks"

    @property
    def provider_name(self) -> str:
        return "QuickBooks Online"

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
        """Refresh QuickBooks OAuth tokens"""
        if not self.client_id or not self.client_secret:
            raise ValueError("QuickBooks client credentials not configured")

        url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.tokens.refresh_token,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                data=data,
                auth=(self.client_id, self.client_secret),
            )
            response.raise_for_status()
            token_data = response.json()

            return OAuthTokens(
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token", self.tokens.refresh_token),
                expires_at=datetime.utcnow()
                + timedelta(seconds=token_data.get("expires_in", 3600)),
                token_type=token_data.get("token_type", "Bearer"),
            )

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make authenticated request to QuickBooks API"""
        # Check if token needs refresh
        if datetime.utcnow() >= self.tokens.expires_at - timedelta(minutes=5):
            logger.info("Refreshing QuickBooks tokens")
            self.tokens = await self.refresh_tokens()

        url = f"{self.QB_API_BASE}/v3/company/{self.realm_id}/{endpoint}"
        headers = {
            "Authorization": f"{self.tokens.token_type} {self.tokens.access_token}",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            self._request_count += 1
            return response.json()

    async def extract_entity(
        self,
        entity_type: EntityType,
        since: Optional[datetime] = None,
    ) -> AsyncIterator[ExtractionResult]:
        """Extract entities from QuickBooks API"""
        entity_map = {
            EntityType.ACCOUNT: "Account",
            EntityType.CONTACT: "Customer",
            EntityType.TRANSACTION: "Purchase",
            EntityType.INVOICE: "Invoice",
            EntityType.BILL: "Bill",
            EntityType.PAYMENT: "Payment",
        }

        qb_entity = entity_map.get(entity_type)
        if not qb_entity:
            logger.warning(f"Entity type {entity_type} not supported by QuickBooks")
            return

        endpoint = f"query"
        max_results = 20  # QuickBooks max per page
        start_position = 1

        while True:
            query = f"SELECT * FROM {qb_entity} MAXRESULTS {max_results} STARTPOSITION {start_position}"

            if since:
                # QuickBooks uses MetaData.LastUpdatedTime
                query += f" WHERE MetaData.LastUpdatedTime >= '{since.isoformat()}'"

            try:
                response = await self._make_request(endpoint, {"query": query})
                query_response = response.get("QueryResponse", {})
                entities = query_response.get(qb_entity, [])

                if not entities:
                    break

                yield ExtractionResult(
                    entity_type=entity_type,
                    records=entities if isinstance(entities, list) else [entities],
                    source_system="QUICKBOOKS",
                    organization_id=self.organization_id,
                    extracted_at=datetime.utcnow(),
                    page_info={
                        "start_position": start_position,
                        "max_results": max_results,
                        "count": len(entities),
                    },
                )

                # Check if there are more pages
                max_results_returned = query_response.get("maxResults", max_results)
                if len(entities) < max_results_returned:
                    break

                start_position += max_results_returned

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    # Token expired, refresh and retry
                    logger.warning("QuickBooks token expired, refreshing")
                    self.tokens = await self.refresh_tokens()
                    continue
                logger.error(f"QuickBooks API error: {e}")
                break
            except Exception as e:
                logger.error(f"Error extracting {entity_type} from QuickBooks: {e}")
                break
