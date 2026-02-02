"""
Schema Normalizer - Normalizes provider-specific schemas to standard format.

This module transforms raw Bronze layer data from various providers
into a consistent Silver layer schema.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Type
import logging

logger = logging.getLogger(__name__)


class StandardAccountType(Enum):
    """Standard account types across all providers."""
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"


class StandardTransactionType(Enum):
    """Standard transaction types across all providers."""
    INVOICE = "INVOICE"
    BILL = "BILL"
    PAYMENT = "PAYMENT"
    JOURNAL_ENTRY = "JOURNAL_ENTRY"
    TRANSFER = "TRANSFER"
    DEPOSIT = "DEPOSIT"
    EXPENSE = "EXPENSE"


@dataclass
class NormalizedAccount:
    """Standard account schema for Silver layer."""
    source_id: str
    source_system: str
    organization_id: str
    account_code: Optional[str]
    account_name: str
    account_type: StandardAccountType
    account_subtype: Optional[str]
    normal_balance: str  # DEBIT or CREDIT
    currency_code: str
    is_active: bool
    parent_account_id: Optional[str]
    # Source preservation for auditing
    _source_account_type: str
    _source_account_subtype: Optional[str]


@dataclass
class NormalizedContact:
    """Standard contact schema for Silver layer."""
    source_id: str
    source_system: str
    organization_id: str
    display_name: str
    contact_type: str  # CUSTOMER, VENDOR, EMPLOYEE
    email: Optional[str]
    phone: Optional[str]
    is_active: bool
    # Address
    address_line1: Optional[str]
    address_line2: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    country: Optional[str]


@dataclass
class NormalizedTransaction:
    """Standard transaction schema for Silver layer."""
    source_id: str
    source_system: str
    organization_id: str
    transaction_type: StandardTransactionType
    transaction_date: str  # ISO 8601
    posting_date: Optional[str]
    amount: float
    currency_code: str
    description: Optional[str]
    memo: Optional[str]
    reference: Optional[str]
    account_id: str
    contact_id: Optional[str]
    is_reconciled: bool


class ProviderNormalizerPlugin(ABC):
    """
    Abstract base class for provider-specific normalization plugins.
    
    Each provider should implement this to handle its unique schema mappings.
    """
    
    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Provider identifier (e.g., 'quickbooks', 'xero')."""
        pass
    
    @abstractmethod
    def get_account_type_mapping(self) -> Dict[str, StandardAccountType]:
        """Return mapping from provider account types to standard types."""
        pass
    
    @abstractmethod
    def normalize_account(self, raw: Dict[str, Any]) -> NormalizedAccount:
        """Normalize a raw account record."""
        pass
    
    @abstractmethod
    def normalize_contact(self, raw: Dict[str, Any]) -> NormalizedContact:
        """Normalize a raw contact record."""
        pass
    
    @abstractmethod
    def normalize_transaction(self, raw: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize a raw transaction record."""
        pass


class SchemaNormalizer:
    """
    Main normalizer that delegates to provider-specific plugins.
    """
    
    def __init__(self):
        self._plugins: Dict[str, ProviderNormalizerPlugin] = {}
    
    def register_plugin(self, plugin: ProviderNormalizerPlugin) -> None:
        """Register a provider-specific normalizer plugin."""
        self._plugins[plugin.provider_id] = plugin
        logger.info(f"Registered normalizer plugin: {plugin.provider_id}")
    
    def normalize_account(
        self,
        raw: Dict[str, Any],
        source_system: str,
    ) -> NormalizedAccount:
        """Normalize an account using the appropriate plugin."""
        plugin = self._get_plugin(source_system)
        return plugin.normalize_account(raw)
    
    def normalize_contact(
        self,
        raw: Dict[str, Any],
        source_system: str,
    ) -> NormalizedContact:
        """Normalize a contact using the appropriate plugin."""
        plugin = self._get_plugin(source_system)
        return plugin.normalize_contact(raw)
    
    def normalize_transaction(
        self,
        raw: Dict[str, Any],
        source_system: str,
    ) -> NormalizedTransaction:
        """Normalize a transaction using the appropriate plugin."""
        plugin = self._get_plugin(source_system)
        return plugin.normalize_transaction(raw)
    
    def _get_plugin(self, source_system: str) -> ProviderNormalizerPlugin:
        """Get the plugin for a given source system."""
        plugin = self._plugins.get(source_system.lower())
        if not plugin:
            raise ValueError(f"No normalizer plugin for: {source_system}")
        return plugin
    
    @property
    def supported_providers(self) -> List[str]:
        """List of registered provider IDs."""
        return list(self._plugins.keys())
