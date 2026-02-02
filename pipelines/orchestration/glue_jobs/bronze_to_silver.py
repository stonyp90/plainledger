"""
Bronze to Silver ETL Job

AWS Glue job that transforms raw Bronze layer data into cleaned Silver layer data.

Process:
1. Read raw data from Bronze S3 bucket
2. Apply normalization (provider-specific to standard schema)
3. Deduplicate records (keep latest by timestamp)
4. Sanitize data (trim, control chars, unicode normalize)
5. Validate records (quarantine failures)
6. Write valid records to Silver bucket
7. Write invalid records to Quarantine bucket
8. Trigger cache invalidation
9. Send alert email

Usage:
    python -m pipelines.orchestration.glue_jobs.bronze_to_silver \
        --bronze-bucket=plainledger-bronze \
        --silver-bucket=plainledger-silver \
        --quarantine-bucket=plainledger-quarantine \
        --organization-id=org-123 \
        --local
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Any, Optional
import boto3
from botocore.config import Config

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from transformers.bronze_to_silver.normalizer import Normalizer
from transformers.bronze_to_silver.deduplicator import Deduplicator
from transformers.bronze_to_silver.sanitizer import Sanitizer
from transformers.bronze_to_silver.validator import Validator, ValidationSeverity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class BronzeToSilverJob:
    """Main ETL job orchestrator"""

    def __init__(
        self,
        bronze_bucket: str,
        silver_bucket: str,
        quarantine_bucket: str,
        organization_id: Optional[str] = None,
        s3_endpoint: Optional[str] = None,
    ):
        self.bronze_bucket = bronze_bucket
        self.silver_bucket = silver_bucket
        self.quarantine_bucket = quarantine_bucket
        self.organization_id = organization_id

        # Initialize S3 client
        s3_config = {}
        if s3_endpoint:
            s3_config["endpoint_url"] = s3_endpoint
            s3_config["config"] = Config(s3={"addressing_style": "path"})

        self.s3_client = boto3.client("s3", **s3_config)

        # Initialize transformers
        self.normalizer = Normalizer()
        self.deduplicator = Deduplicator()
        self.sanitizer = Sanitizer()
        self.validator = Validator()

        # Statistics
        self.stats = {
            "records_read": 0,
            "records_normalized": 0,
            "records_deduplicated": 0,
            "records_sanitized": 0,
            "records_validated": 0,
            "records_quarantined": 0,
            "records_written": 0,
            "errors": [],
        }

    def list_bronze_files(
        self, provider: str, entity_type: str, org_id: Optional[str] = None
    ) -> List[str]:
        """List all Bronze files for a provider/entity"""
        prefix = f"{provider}/{entity_type}/"
        if org_id:
            prefix += f"{org_id}/"

        response = self.s3_client.list_objects_v2(
            Bucket=self.bronze_bucket, Prefix=prefix
        )

        files = []
        if "Contents" in response:
            files = [obj["Key"] for obj in response["Contents"]]

        logger.info(f"Found {len(files)} Bronze files for {prefix}")
        return files

    def read_bronze_file(self, key: str) -> List[Dict[str, Any]]:
        """Read JSON file from Bronze bucket"""
        try:
            response = self.s3_client.get_object(Bucket=self.bronze_bucket, Key=key)
            content = response["Body"].read().decode("utf-8")
            data = json.loads(content)

            # Handle both single records and arrays
            if isinstance(data, list):
                records = data
            else:
                records = [data]

            self.stats["records_read"] += len(records)
            logger.info(f"Read {len(records)} records from {key}")
            return records

        except Exception as e:
            error_msg = f"Failed to read Bronze file {key}: {e}"
            logger.error(error_msg)
            self.stats["errors"].append(error_msg)
            return []

    def write_silver_file(
        self, entity_type: str, org_id: str, records: List[Dict[str, Any]]
    ) -> str:
        """Write cleaned records to Silver bucket"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        key = f"{entity_type}/{org_id}/{timestamp}.json"

        body = json.dumps(records, indent=2, default=str)

        self.s3_client.put_object(
            Bucket=self.silver_bucket,
            Key=key,
            Body=body,
            ContentType="application/json",
        )

        logger.info(f"Wrote {len(records)} records to Silver: {key}")
        return key

    def write_quarantine_file(
        self,
        entity_type: str,
        org_id: str,
        records: List[Dict[str, Any]],
        reason: str,
    ) -> str:
        """Write invalid records to Quarantine bucket"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        key = f"{entity_type}/{org_id}/{timestamp}_{reason}.json"

        body = json.dumps(records, indent=2, default=str)

        self.s3_client.put_object(
            Bucket=self.quarantine_bucket,
            Key=key,
            Body=body,
            ContentType="application/json",
        )

        logger.warning(f"Quarantined {len(records)} records: {key}")
        return key

    def process_entity(
        self, provider: str, entity_type: str, org_id: str
    ) -> Dict[str, Any]:
        """Process a single entity type through the ETL pipeline"""
        logger.info(f"Processing {provider}/{entity_type} for {org_id}")

        # List Bronze files
        bronze_files = self.list_bronze_files(provider, entity_type, org_id)
        if not bronze_files:
            logger.info(f"No Bronze files found for {provider}/{entity_type}")
            return {"processed": 0, "quarantined": 0}

        # Read and process all files
        all_records = []
        for file_key in bronze_files:
            records = self.read_bronze_file(file_key)
            all_records.extend(records)

        if not all_records:
            return {"processed": 0, "quarantined": 0}

        # Step 1: Normalize (provider-specific to standard schema)
        logger.info(f"Normalizing {len(all_records)} records")
        normalized_records = []
        for record in all_records:
            try:
                normalized = self.normalizer.normalize(record, provider, entity_type)
                normalized_records.append(normalized)
                self.stats["records_normalized"] += 1
            except Exception as e:
                error_msg = f"Normalization failed for record: {e}"
                logger.error(error_msg)
                self.stats["errors"].append(error_msg)

        # Step 2: Deduplicate (keep latest by timestamp)
        logger.info(f"Deduplicating {len(normalized_records)} records")
        deduplicated_records = self.deduplicator.deduplicate(normalized_records)
        duplicates_removed = len(normalized_records) - len(deduplicated_records)
        self.stats["records_deduplicated"] += duplicates_removed
        logger.info(f"Removed {duplicates_removed} duplicates")

        # Step 3: Sanitize
        logger.info(f"Sanitizing {len(deduplicated_records)} records")
        sanitized_records = []
        for record in deduplicated_records:
            sanitized = self.sanitizer.sanitize(record)
            sanitized_records.append(sanitized)
            self.stats["records_sanitized"] += 1

        # Step 4: Validate
        logger.info(f"Validating {len(sanitized_records)} records")
        valid_records = []
        invalid_records = []

        for record in sanitized_records:
            validation_result = self.validator.validate(record, entity_type)
            self.stats["records_validated"] += 1

            if validation_result.is_valid:
                valid_records.append(record)
            else:
                invalid_records.append(
                    {
                        **record,
                        "_validation_errors": validation_result.errors,
                        "_validation_severity": validation_result.severity.value,
                    }
                )

        # Write valid records to Silver
        if valid_records:
            self.write_silver_file(entity_type, org_id, valid_records)
            self.stats["records_written"] += len(valid_records)

        # Write invalid records to Quarantine
        if invalid_records:
            reason = "validation_failed"
            self.write_quarantine_file(entity_type, org_id, invalid_records, reason)
            self.stats["records_quarantined"] += len(invalid_records)

        return {
            "processed": len(valid_records),
            "quarantined": len(invalid_records),
        }

    def trigger_cache_invalidation(self, org_id: str) -> None:
        """Trigger cache invalidation via API"""
        api_endpoint = os.getenv("API_ENDPOINT", "http://localhost:3000")
        internal_token = os.getenv("INTERNAL_API_TOKEN", "change-me")

        try:
            import urllib.request
            import urllib.parse

            url = f"{api_endpoint}/internal/cache/invalidate/{org_id}"
            req = urllib.request.Request(
                url,
                method="POST",
                headers={"x-internal-token": internal_token},
            )

            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode())
                logger.info(f"Cache invalidated: {result}")
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {e}")

    def send_alert_email(self, org_id: str, success: bool) -> None:
        """Send alert email (placeholder - will be implemented in Phase 3)"""
        # TODO: Implement in Phase 3
        logger.info(f"Alert email would be sent for org {org_id}, success={success}")

    def run(self) -> Dict[str, Any]:
        """Run the ETL job"""
        logger.info("=" * 60)
        logger.info("Bronze to Silver ETL Job Started")
        logger.info("=" * 60)

        start_time = datetime.utcnow()

        # Process all providers and entities
        providers = ["quickbooks", "xero", "sage"]
        entities = ["account", "contact", "transaction"]

        org_id = self.organization_id or "default"

        results = {}
        for provider in providers:
            for entity in entities:
                result = self.process_entity(provider, entity, org_id)
                results[f"{provider}_{entity}"] = result

        # Trigger cache invalidation
        if org_id:
            self.trigger_cache_invalidation(org_id)

        # Send success alert
        self.send_alert_email(org_id, success=True)

        duration = (datetime.utcnow() - start_time).total_seconds()

        logger.info("=" * 60)
        logger.info("Bronze to Silver ETL Job Completed")
        logger.info(f"Duration: {duration:.2f}s")
        logger.info(f"Stats: {json.dumps(self.stats, indent=2)}")
        logger.info("=" * 60)

        return {
            "success": True,
            "duration_seconds": duration,
            "stats": self.stats,
            "results": results,
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Bronze to Silver ETL Job")
    parser.add_argument(
        "--bronze-bucket", required=True, help="Bronze S3 bucket name"
    )
    parser.add_argument(
        "--silver-bucket", required=True, help="Silver S3 bucket name"
    )
    parser.add_argument(
        "--quarantine-bucket", required=True, help="Quarantine S3 bucket name"
    )
    parser.add_argument("--organization-id", help="Organization ID to process")
    parser.add_argument("--local", action="store_true", help="Use LocalStack")
    parser.add_argument("--s3-endpoint", help="S3 endpoint URL (for LocalStack)")

    args = parser.parse_args()

    s3_endpoint = args.s3_endpoint
    if args.local and not s3_endpoint:
        s3_endpoint = os.getenv("S3_ENDPOINT", "http://localhost:4566")

    job = BronzeToSilverJob(
        bronze_bucket=args.bronze_bucket,
        silver_bucket=args.silver_bucket,
        quarantine_bucket=args.quarantine_bucket,
        organization_id=args.organization_id,
        s3_endpoint=s3_endpoint,
    )

    result = job.run()
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
