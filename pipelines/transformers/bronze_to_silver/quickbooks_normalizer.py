"""
QuickBooks Normalizer Plugin - Normalizes QuickBooks data to standard schema.

Maps QuickBooks-specific field names and types to the standard Silver layer schema.
"""

from typing import Any, Dict
import logging

from .normalizer import (
    ProviderNormalizerPlugin,
    NormalizedAccount,
    NormalizedContact,
    NormalizedTransaction,
    StandardAccountType,
    StandardTransactionType,
)

logger = logging.getLogger(__name__)


class QuickBooksNormalizerPlugin(ProviderNormalizerPlugin):
    """Normalizer plugin for QuickBooks data."""

    @property
    def provider_id(self) -> str:
        return "quickbooks"

    def get_account_type_mapping(self) -> Dict[str, StandardAccountType]:
        """QuickBooks account type to standard type mapping."""
        return {
            # Asset accounts
            "Bank": StandardAccountType.ASSET,
            "Accounts Receivable": StandardAccountType.ASSET,
            "Other Current Asset": StandardAccountType.ASSET,
            "Fixed Asset": StandardAccountType.ASSET,
            "Other Asset": StandardAccountType.ASSET,
            # Liability accounts
            "Accounts Payable": StandardAccountType.LIABILITY,
            "Credit Card": StandardAccountType.LIABILITY,
            "Other Current Liability": StandardAccountType.LIABILITY,
            "Long Term Liability": StandardAccountType.LIABILITY,
            # Equity accounts
            "Equity": StandardAccountType.EQUITY,
            # Revenue accounts
            "Income": StandardAccountType.REVENUE,
            "Other Income": StandardAccountType.REVENUE,
            # Expense accounts
            "Expense": StandardAccountType.EXPENSE,
            "Other Expense": StandardAccountType.EXPENSE,
            "Cost of Goods Sold": StandardAccountType.EXPENSE,
        }

    def _get_standard_account_type(self, qb_type: str) -> StandardAccountType:
        """Convert QuickBooks account type to standard type."""
        mapping = self.get_account_type_mapping()
        return mapping.get(qb_type, StandardAccountType.ASSET)

    def _get_normal_balance(self, account_type: StandardAccountType) -> str:
        """Determine normal balance (DEBIT/CREDIT) based on account type."""
        debit_accounts = {StandardAccountType.ASSET, StandardAccountType.EXPENSE}
        return "DEBIT" if account_type in debit_accounts else "CREDIT"

    def normalize_account(self, raw: Dict[str, Any]) -> NormalizedAccount:
        """Normalize a QuickBooks account record."""
        # QuickBooks uses PascalCase field names
        source_id = str(raw.get("Id", raw.get("id", "")))
        qb_type = raw.get("AccountType", raw.get("account_type", ""))
        qb_subtype = raw.get("AccountSubType", raw.get("account_subtype", ""))
        
        standard_type = self._get_standard_account_type(qb_type)
        
        return NormalizedAccount(
            source_id=source_id,
            source_system="quickbooks",
            organization_id=raw.get("_organization_id", raw.get("organization_id", "")),
            account_code=raw.get("AcctNum", raw.get("account_code", "")),
            account_name=raw.get("Name", raw.get("name", "")),
            account_type=standard_type,
            account_subtype=qb_subtype,
            normal_balance=self._get_normal_balance(standard_type),
            currency_code=raw.get("CurrencyRef", {}).get("value", "CAD") if isinstance(raw.get("CurrencyRef"), dict) else "CAD",
            is_active=raw.get("Active", raw.get("is_active", True)),
            parent_account_id=raw.get("ParentRef", {}).get("value") if isinstance(raw.get("ParentRef"), dict) else None,
            _source_account_type=qb_type,
            _source_account_subtype=qb_subtype,
        )

    def normalize_contact(self, raw: Dict[str, Any]) -> NormalizedContact:
        """Normalize a QuickBooks contact (Customer/Vendor) record."""
        source_id = str(raw.get("Id", raw.get("id", "")))
        
        # Determine contact type based on available fields
        if raw.get("Vendor"):
            contact_type = "VENDOR"
        elif raw.get("CustomerRef") or raw.get("DisplayName"):
            contact_type = "CUSTOMER"
        else:
            contact_type = raw.get("contact_type", "CUSTOMER")
        
        # Address handling
        bill_addr = raw.get("BillAddr", {}) or {}
        ship_addr = raw.get("ShipAddr", {}) or {}
        addr = bill_addr if bill_addr else ship_addr
        
        return NormalizedContact(
            source_id=source_id,
            source_system="quickbooks",
            organization_id=raw.get("_organization_id", raw.get("organization_id", "")),
            display_name=raw.get("DisplayName", raw.get("display_name", raw.get("name", ""))),
            contact_type=contact_type,
            email=raw.get("PrimaryEmailAddr", {}).get("Address") if isinstance(raw.get("PrimaryEmailAddr"), dict) else raw.get("email"),
            phone=raw.get("PrimaryPhone", {}).get("FreeFormNumber") if isinstance(raw.get("PrimaryPhone"), dict) else raw.get("phone"),
            is_active=raw.get("Active", raw.get("is_active", True)),
            address_line1=addr.get("Line1", ""),
            address_line2=addr.get("Line2", ""),
            city=addr.get("City", ""),
            state=addr.get("CountrySubDivisionCode", ""),
            postal_code=addr.get("PostalCode", ""),
            country=addr.get("Country", "CA"),
        )

    def normalize_transaction(self, raw: Dict[str, Any]) -> NormalizedTransaction:
        """Normalize a QuickBooks transaction (Invoice/Bill) record."""
        source_id = str(raw.get("Id", raw.get("id", "")))
        
        # Determine transaction type
        if raw.get("CustomerRef") or "Invoice" in str(raw.get("_source_file", "")):
            txn_type = StandardTransactionType.INVOICE
        elif raw.get("VendorRef") or "Bill" in str(raw.get("_source_file", "")):
            txn_type = StandardTransactionType.BILL
        else:
            txn_type = StandardTransactionType.JOURNAL_ENTRY
        
        # Get amount
        amount = float(raw.get("TotalAmt", raw.get("amount", 0)))
        
        # Get account ID from line items if available
        account_id = ""
        lines = raw.get("Line", [])
        if lines and isinstance(lines, list) and len(lines) > 0:
            first_line = lines[0]
            if isinstance(first_line, dict):
                detail = (
                    first_line.get("SalesItemLineDetail", {}) or
                    first_line.get("ItemBasedExpenseLineDetail", {}) or
                    first_line.get("AccountBasedExpenseLineDetail", {}) or
                    {}
                )
                if isinstance(detail, dict):
                    account_ref = detail.get("AccountRef", {}) or detail.get("ItemRef", {})
                    if isinstance(account_ref, dict):
                        account_id = str(account_ref.get("value", ""))
        
        # Get contact ID
        contact_ref = raw.get("CustomerRef", raw.get("VendorRef", {})) or {}
        contact_id = str(contact_ref.get("value", "")) if isinstance(contact_ref, dict) else ""
        
        return NormalizedTransaction(
            source_id=source_id,
            source_system="quickbooks",
            organization_id=raw.get("_organization_id", raw.get("organization_id", "")),
            transaction_type=txn_type,
            transaction_date=raw.get("TxnDate", raw.get("transaction_date", "")),
            posting_date=raw.get("TxnDate", raw.get("posting_date")),
            amount=amount,
            currency_code=raw.get("CurrencyRef", {}).get("value", "CAD") if isinstance(raw.get("CurrencyRef"), dict) else "CAD",
            description=raw.get("PrivateNote", raw.get("description", "")),
            memo=raw.get("CustomerMemo", {}).get("value", "") if isinstance(raw.get("CustomerMemo"), dict) else "",
            reference=raw.get("DocNumber", raw.get("reference", "")),
            account_id=account_id,
            contact_id=contact_id,
            is_reconciled=raw.get("LinkedTxn") is not None,
        )


# Singleton instance for easy access
quickbooks_normalizer = QuickBooksNormalizerPlugin()
