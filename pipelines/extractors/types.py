"""
Provider Extractor Interface (Protocol)

Defines the contract that all provider extractors must implement.
This is a Protocol-based interface for type checking.
"""

from typing import Protocol, AsyncIterator, List
from datetime import datetime
from .base_extractor import EntityType, ExtractionResult, OAuthTokens


class IProviderExtractor(Protocol):
    """
    Protocol interface for provider-specific extractors.

    All extractors should implement this interface to ensure
    consistent behavior across providers.
    """

    @property
    def provider_id(self) -> str:
        """Unique identifier for this provider (e.g., 'quickbooks', 'xero')"""
        ...

    @property
    def provider_name(self) -> str:
        """Human-readable name for this provider"""
        ...

    @property
    def supported_entities(self) -> List[EntityType]:
        """List of entity types this provider supports"""
        ...

    async def refresh_tokens(self) -> OAuthTokens:
        """Refresh OAuth tokens if expired"""
        ...

    async def extract_entity(
        self,
        entity_type: EntityType,
        since: datetime | None = None,
    ) -> AsyncIterator[ExtractionResult]:
        """
        Extract all records of a given entity type.

        Args:
            entity_type: The type of entity to extract
            since: Optional datetime to only extract records modified since

        Yields:
            ExtractionResult for each page of data
        """
        ...
