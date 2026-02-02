"""
Data Sanitizer - Cleans and normalizes text data without losing information.

Sanitization includes:
- Trimming whitespace
- Removing control characters
- Unicode normalization
- Collapsing multiple spaces
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set
import re
import unicodedata
import logging

logger = logging.getLogger(__name__)


@dataclass
class SanitizationResult:
    """Result of a sanitization operation."""
    record: Dict[str, Any]
    changes: List[str]
    had_changes: bool


class DataSanitizer:
    """
    Sanitizes text fields in records without losing meaningful information.
    """
    
    # Control characters to remove (except newlines, tabs)
    CONTROL_CHAR_PATTERN = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]')
    
    # Multiple whitespace pattern
    MULTI_SPACE_PATTERN = re.compile(r'\s+')
    
    # Default fields to sanitize by entity type
    DEFAULT_TEXT_FIELDS = {
        "account": ["account_name", "account_code", "description"],
        "contact": ["display_name", "email", "phone", "address_line1", "address_line2", "city"],
        "transaction": ["description", "memo", "reference"],
        "invoice": ["description", "memo", "reference", "line_description"],
        "bill": ["description", "memo", "reference", "line_description"],
    }
    
    def __init__(
        self,
        text_fields: Optional[Dict[str, List[str]]] = None,
        preserve_newlines: bool = True,
    ):
        """
        Initialize sanitizer.
        
        Args:
            text_fields: Dict mapping entity types to fields to sanitize
            preserve_newlines: Whether to preserve newlines in text
        """
        self.text_fields = text_fields or self.DEFAULT_TEXT_FIELDS
        self.preserve_newlines = preserve_newlines
    
    def sanitize_record(
        self,
        record: Dict[str, Any],
        entity_type: str,
    ) -> SanitizationResult:
        """
        Sanitize all text fields in a record.
        
        Args:
            record: The record to sanitize
            entity_type: Type of entity for field selection
            
        Returns:
            SanitizationResult with cleaned record
        """
        fields_to_clean = self.text_fields.get(entity_type, [])
        sanitized = record.copy()
        changes: List[str] = []
        
        for field in fields_to_clean:
            if field in sanitized and isinstance(sanitized[field], str):
                original = sanitized[field]
                cleaned = self.sanitize_text(original)
                
                if cleaned != original:
                    sanitized[field] = cleaned
                    changes.append(f"{field}: sanitized")
        
        return SanitizationResult(
            record=sanitized,
            changes=changes,
            had_changes=len(changes) > 0,
        )
    
    def sanitize_text(self, value: Optional[str]) -> Optional[str]:
        """
        Sanitize a single text value.
        
        Args:
            value: Text to sanitize
            
        Returns:
            Sanitized text or None
        """
        if value is None:
            return None
        
        # Trim leading/trailing whitespace
        result = value.strip()
        
        # Return None for empty strings
        if not result:
            return None
        
        # Remove control characters
        result = self.CONTROL_CHAR_PATTERN.sub('', result)
        
        # Unicode normalization (NFC - canonical decomposition followed by canonical composition)
        result = unicodedata.normalize('NFC', result)
        
        # Collapse multiple spaces (but preserve single newlines if configured)
        if self.preserve_newlines:
            # Replace multiple spaces (not newlines) with single space
            lines = result.split('\n')
            lines = [self.MULTI_SPACE_PATTERN.sub(' ', line).strip() for line in lines]
            result = '\n'.join(line for line in lines if line)
        else:
            result = self.MULTI_SPACE_PATTERN.sub(' ', result)
        
        return result if result else None
    
    def sanitize_batch(
        self,
        records: List[Dict[str, Any]],
        entity_type: str,
    ) -> List[SanitizationResult]:
        """
        Sanitize a batch of records.
        
        Args:
            records: List of records to sanitize
            entity_type: Type of entity
            
        Returns:
            List of SanitizationResults
        """
        results = []
        changes_count = 0
        
        for record in records:
            result = self.sanitize_record(record, entity_type)
            results.append(result)
            if result.had_changes:
                changes_count += 1
        
        logger.info(
            f"Sanitized {len(records)} {entity_type} records, "
            f"{changes_count} had changes"
        )
        
        return results


# PySpark UDF for sanitization
def create_sanitize_udf():
    """Create a PySpark UDF for text sanitization."""
    from pyspark.sql.functions import udf
    from pyspark.sql.types import StringType
    
    sanitizer = DataSanitizer()
    
    @udf(StringType())
    def sanitize_text_udf(value: str) -> str:
        return sanitizer.sanitize_text(value)
    
    return sanitize_text_udf
