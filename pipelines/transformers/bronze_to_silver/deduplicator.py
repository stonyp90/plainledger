"""
Deduplicator - Removes duplicate records keeping the latest version.

Deduplication is performed based on composite keys and timestamps.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Tuple, TypeVar
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=Dict[str, Any])


@dataclass
class DeduplicationResult:
    """Result of a deduplication operation."""
    unique_records: List[Dict[str, Any]]
    duplicate_records: List[Dict[str, Any]]
    stats: Dict[str, int]


class Deduplicator:
    """
    Removes duplicate records based on composite keys.
    
    When duplicates are found, keeps the record with the latest timestamp.
    """
    
    def __init__(
        self,
        key_columns: List[str],
        timestamp_column: str = "ingested_at",
    ):
        """
        Initialize deduplicator.
        
        Args:
            key_columns: Columns that form the unique key
            timestamp_column: Column to use for determining latest record
        """
        self.key_columns = key_columns
        self.timestamp_column = timestamp_column
    
    def deduplicate(self, records: List[Dict[str, Any]]) -> DeduplicationResult:
        """
        Remove duplicates from a list of records.
        
        Args:
            records: List of records to deduplicate
            
        Returns:
            DeduplicationResult with unique and duplicate records
        """
        if not records:
            return DeduplicationResult(
                unique_records=[],
                duplicate_records=[],
                stats={"total": 0, "unique": 0, "duplicates": 0},
            )
        
        # Sort by timestamp descending (latest first)
        sorted_records = sorted(
            records,
            key=lambda r: self._get_timestamp(r),
            reverse=True,
        )
        
        seen: Dict[str, Dict[str, Any]] = {}
        duplicates: List[Dict[str, Any]] = []
        
        for record in sorted_records:
            key = self._build_key(record)
            
            if key in seen:
                duplicates.append(record)
                logger.debug(f"Duplicate found: {key}")
            else:
                seen[key] = record
        
        unique_records = list(seen.values())
        
        stats = {
            "total": len(records),
            "unique": len(unique_records),
            "duplicates": len(duplicates),
        }
        
        logger.info(
            f"Deduplication complete: {stats['unique']} unique, "
            f"{stats['duplicates']} duplicates removed"
        )
        
        return DeduplicationResult(
            unique_records=unique_records,
            duplicate_records=duplicates,
            stats=stats,
        )
    
    def _build_key(self, record: Dict[str, Any]) -> str:
        """Build a composite key from the record."""
        key_parts = []
        for col in self.key_columns:
            value = record.get(col)
            key_parts.append(str(value) if value is not None else "NULL")
        return "::".join(key_parts)
    
    def _get_timestamp(self, record: Dict[str, Any]) -> datetime:
        """Extract timestamp from record for sorting."""
        ts_value = record.get(self.timestamp_column)
        
        if ts_value is None:
            return datetime.min
        
        if isinstance(ts_value, datetime):
            return ts_value
        
        if isinstance(ts_value, str):
            try:
                return datetime.fromisoformat(ts_value.replace('Z', '+00:00'))
            except ValueError:
                return datetime.min
        
        return datetime.min


# Convenience function for PySpark usage
def deduplicate_spark_df(df, key_columns: List[str], timestamp_column: str = "ingested_at"):
    """
    Deduplicate a PySpark DataFrame.
    
    Args:
        df: PySpark DataFrame
        key_columns: Columns forming the unique key
        timestamp_column: Column for determining latest record
        
    Returns:
        Deduplicated DataFrame
    """
    from pyspark.sql import functions as F
    from pyspark.sql.window import Window
    
    window = Window.partitionBy(*key_columns).orderBy(F.desc(timestamp_column))
    
    return (df
        .withColumn("_row_num", F.row_number().over(window))
        .filter(F.col("_row_num") == 1)
        .drop("_row_num"))
