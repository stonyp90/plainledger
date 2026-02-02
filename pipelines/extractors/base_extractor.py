"""
Base Extractor - Abstract base class for all provider extractors.

All provider-specific extractors should inherit from this class
and implement the required abstract methods.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class EntityType(Enum):
    """Supported entity types across all providers."""
    ACCOUNT = "account"
    CONTACT = "contact"
    TRANSACTION = "transaction"
    INVOICE = "invoice"
    BILL = "bill"
    PAYMENT = "payment"
    JOURNAL_ENTRY = "journal_entry"
    ITEM = "item"


@dataclass
class ExtractionResult:
    """Result of an extraction operation."""
    entity_type: EntityType
    records: List[Dict[str, Any]]
    source_system: str
    organization_id: str
    extracted_at: datetime
    page_info: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None


@dataclass
class OAuthTokens:
    """OAuth tokens for provider authentication."""
    access_token: str
    refresh_token: str
    expires_at: datetime
    token_type: str = "Bearer"


class BaseExtractor(ABC):
    """
    Abstract base class for all provider extractors.
    
    Each provider (QuickBooks, Xero, Sage, etc.) should implement
    this interface to ensure consistent extraction behavior.
    """
    
    def __init__(
        self,
        organization_id: str,
        tokens: OAuthTokens,
        rate_limit_delay_ms: int = 100,
    ):
        self.organization_id = organization_id
        self.tokens = tokens
        self.rate_limit_delay_ms = rate_limit_delay_ms
        self._request_count = 0
    
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for this provider (e.g., 'quickbooks', 'xero')."""
        pass
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable name for this provider."""
        pass
    
    @property
    @abstractmethod
    def supported_entities(self) -> List[EntityType]:
        """List of entity types this provider supports."""
        pass
    
    @abstractmethod
    async def refresh_tokens(self) -> OAuthTokens:
        """Refresh OAuth tokens if expired."""
        pass
    
    @abstractmethod
    async def extract_entity(
        self,
        entity_type: EntityType,
        since: Optional[datetime] = None,
    ) -> AsyncIterator[ExtractionResult]:
        """
        Extract all records of a given entity type.
        
        Args:
            entity_type: The type of entity to extract
            since: Optional datetime to only extract records modified since
            
        Yields:
            ExtractionResult for each page of data
        """
        pass
    
    async def extract_all(
        self,
        entity_types: Optional[List[EntityType]] = None,
        since: Optional[datetime] = None,
    ) -> AsyncIterator[ExtractionResult]:
        """
        Extract all supported entity types.
        
        Args:
            entity_types: Optional list of specific types to extract
            since: Optional datetime to only extract records modified since
            
        Yields:
            ExtractionResult for each page of each entity type
        """
        types_to_extract = entity_types or self.supported_entities
        
        for entity_type in types_to_extract:
            if entity_type not in self.supported_entities:
                logger.warning(
                    f"Entity type {entity_type} not supported by {self.provider_id}"
                )
                continue
            
            logger.info(f"Extracting {entity_type.value} from {self.provider_id}")
            
            async for result in self.extract_entity(entity_type, since):
                yield result
    
    def _build_extraction_metadata(self) -> Dict[str, Any]:
        """Build metadata for extraction results."""
        return {
            "provider_id": self.provider_id,
            "provider_name": self.provider_name,
            "organization_id": self.organization_id,
            "extracted_at": datetime.utcnow().isoformat(),
            "request_count": self._request_count,
        }
