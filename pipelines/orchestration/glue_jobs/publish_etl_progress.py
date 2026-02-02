"""
ETL Progress Publisher
Helper module to publish ETL job progress to GraphQL subscriptions via API
"""

import os
import json
import logging
from typing import Dict, Any
import urllib.request
import urllib.parse

logger = logging.getLogger(__name__)


def publish_etl_progress(
    organization_id: str,
    job_name: str,
    status: str,
    progress: int = 0,
    records_processed: int = 0,
    records_written: int = 0,
    records_quarantined: int = 0,
    error: str = None,
) -> None:
    """
    Publish ETL job progress to API for GraphQL subscriptions
    
    Args:
        organization_id: Organization ID
        job_name: Name of the ETL job
        status: Job status (RUNNING, SUCCEEDED, FAILED, TIMEOUT)
        progress: Progress percentage (0-100)
        records_processed: Number of records processed
        records_written: Number of records written
        records_quarantined: Number of records quarantined
        error: Error message if failed
    """
    api_endpoint = os.getenv("API_ENDPOINT", "http://localhost:3000")
    internal_token = os.getenv("INTERNAL_API_TOKEN", "change-me")

    payload = {
        "jobId": f"{job_name}-{organization_id}",
        "organizationId": organization_id,
        "jobName": job_name,
        "status": status,
        "progress": progress,
        "recordsProcessed": records_processed,
        "recordsWritten": records_written,
        "recordsQuarantined": records_quarantined,
        "error": error,
        "startedAt": None,  # Should be set by caller
        "completedAt": None,  # Should be set by caller
    }

    try:
        url = f"{api_endpoint}/internal/etl/progress"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "x-internal-token": internal_token,
            },
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode())
            logger.debug(f"ETL progress published: {result}")
    except Exception as e:
        logger.warning(f"Failed to publish ETL progress: {e}")
        # Don't fail the job if publishing fails
