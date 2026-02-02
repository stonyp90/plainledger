"""
Data Validator - Validates records against defined rules and quarantines failures.

Validation is non-destructive - invalid records are quarantined, not dropped.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
import logging

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Severity level for validation failures."""
    ERROR = "error"      # Record should be quarantined
    WARNING = "warning"  # Record is valid but has issues


@dataclass
class ValidationRule:
    """A single validation rule."""
    name: str
    field: str
    check: Callable[[Any], bool]
    message: str
    severity: ValidationSeverity = ValidationSeverity.ERROR


@dataclass
class ValidationError:
    """A validation error."""
    rule_name: str
    field: str
    message: str
    severity: ValidationSeverity
    actual_value: Any = None


@dataclass
class ValidationResult:
    """Result of validating a single record."""
    is_valid: bool
    record: Dict[str, Any]
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationError] = field(default_factory=list)


@dataclass
class BatchValidationResult:
    """Result of validating a batch of records."""
    valid_records: List[Dict[str, Any]]
    quarantined_records: List[Tuple[Dict[str, Any], List[ValidationError]]]
    stats: Dict[str, int]


class DataValidator:
    """
    Validates records against configurable rules.
    
    Invalid records are quarantined with their error details for later review.
    """
    
    # Default validation rules by entity type
    DEFAULT_RULES = {
        "account": [
            ValidationRule(
                name="source_id_required",
                field="source_id",
                check=lambda v: v is not None and str(v).strip() != "",
                message="Source ID is required",
            ),
            ValidationRule(
                name="account_name_required",
                field="account_name",
                check=lambda v: v is not None and str(v).strip() != "",
                message="Account name is required",
            ),
            ValidationRule(
                name="account_type_valid",
                field="account_type",
                check=lambda v: v in {"ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"},
                message="Account type must be ASSET, LIABILITY, EQUITY, REVENUE, or EXPENSE",
            ),
        ],
        "contact": [
            ValidationRule(
                name="source_id_required",
                field="source_id",
                check=lambda v: v is not None and str(v).strip() != "",
                message="Source ID is required",
            ),
            ValidationRule(
                name="display_name_required",
                field="display_name",
                check=lambda v: v is not None and str(v).strip() != "",
                message="Display name is required",
            ),
        ],
        "transaction": [
            ValidationRule(
                name="source_id_required",
                field="source_id",
                check=lambda v: v is not None and str(v).strip() != "",
                message="Source ID is required",
            ),
            ValidationRule(
                name="transaction_date_required",
                field="transaction_date",
                check=lambda v: v is not None,
                message="Transaction date is required",
            ),
            ValidationRule(
                name="transaction_date_range",
                field="transaction_date",
                check=lambda v: _check_date_range(v, "1990-01-01", None),
                message="Transaction date must be after 1990-01-01",
            ),
            ValidationRule(
                name="amount_range",
                field="amount",
                check=lambda v: v is None or (-999999999.99 <= float(v) <= 999999999.99),
                message="Amount must be between -999,999,999.99 and 999,999,999.99",
            ),
        ],
    }
    
    def __init__(
        self,
        rules: Optional[Dict[str, List[ValidationRule]]] = None,
        fail_fast: bool = False,
    ):
        """
        Initialize validator.
        
        Args:
            rules: Custom validation rules by entity type
            fail_fast: Stop validating a record after first error
        """
        self.rules = rules or self.DEFAULT_RULES
        self.fail_fast = fail_fast
    
    def add_rule(self, entity_type: str, rule: ValidationRule) -> None:
        """Add a validation rule for an entity type."""
        if entity_type not in self.rules:
            self.rules[entity_type] = []
        self.rules[entity_type].append(rule)
    
    def validate_record(
        self,
        record: Dict[str, Any],
        entity_type: str,
    ) -> ValidationResult:
        """
        Validate a single record.
        
        Args:
            record: The record to validate
            entity_type: Type of entity for rule selection
            
        Returns:
            ValidationResult with validation status
        """
        rules = self.rules.get(entity_type, [])
        errors: List[ValidationError] = []
        warnings: List[ValidationError] = []
        
        for rule in rules:
            value = record.get(rule.field)
            
            try:
                is_valid = rule.check(value)
            except Exception as e:
                logger.warning(f"Rule {rule.name} raised exception: {e}")
                is_valid = False
            
            if not is_valid:
                error = ValidationError(
                    rule_name=rule.name,
                    field=rule.field,
                    message=rule.message,
                    severity=rule.severity,
                    actual_value=value,
                )
                
                if rule.severity == ValidationSeverity.ERROR:
                    errors.append(error)
                    if self.fail_fast:
                        break
                else:
                    warnings.append(error)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            record=record,
            errors=errors,
            warnings=warnings,
        )
    
    def validate_batch(
        self,
        records: List[Dict[str, Any]],
        entity_type: str,
    ) -> BatchValidationResult:
        """
        Validate a batch of records.
        
        Args:
            records: List of records to validate
            entity_type: Type of entity
            
        Returns:
            BatchValidationResult with valid and quarantined records
        """
        valid_records: List[Dict[str, Any]] = []
        quarantined_records: List[Tuple[Dict[str, Any], List[ValidationError]]] = []
        
        for record in records:
            result = self.validate_record(record, entity_type)
            
            if result.is_valid:
                valid_records.append(result.record)
            else:
                # Add quarantine metadata
                quarantine_record = result.record.copy()
                quarantine_record["_quarantine_reason"] = [e.message for e in result.errors]
                quarantine_record["_quarantine_time"] = datetime.utcnow().isoformat()
                quarantined_records.append((quarantine_record, result.errors))
        
        stats = {
            "total": len(records),
            "valid": len(valid_records),
            "quarantined": len(quarantined_records),
            "pass_rate": round(len(valid_records) / len(records) * 100, 2) if records else 0,
        }
        
        logger.info(
            f"Validation complete: {stats['valid']} valid, "
            f"{stats['quarantined']} quarantined ({stats['pass_rate']}% pass rate)"
        )
        
        return BatchValidationResult(
            valid_records=valid_records,
            quarantined_records=quarantined_records,
            stats=stats,
        )


def _check_date_range(
    value: Any,
    min_date: Optional[str],
    max_date: Optional[str],
) -> bool:
    """Check if a date is within range."""
    if value is None:
        return True  # Let required check handle nulls
    
    try:
        if isinstance(value, str):
            date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        elif isinstance(value, datetime):
            date = value
        else:
            return False
        
        if min_date:
            min_dt = datetime.fromisoformat(min_date)
            if date < min_dt:
                return False
        
        if max_date:
            max_dt = datetime.fromisoformat(max_date)
            if date > max_dt:
                return False
        
        return True
    except (ValueError, TypeError):
        return False
