"""
Unit tests for Bronze to Silver ETL Job
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from orchestration.glue_jobs.bronze_to_silver import BronzeToSilverJob


@pytest.fixture
def job():
    """Create BronzeToSilverJob instance"""
    with patch("boto3.client"):
        return BronzeToSilverJob(
            bronze_bucket="test-bronze",
            silver_bucket="test-silver",
            quarantine_bucket="test-quarantine",
            organization_id="org-123",
            s3_endpoint="http://localhost:4566",
        )


def test_initialization(job):
    """Test job initialization"""
    assert job.bronze_bucket == "test-bronze"
    assert job.silver_bucket == "test-silver"
    assert job.quarantine_bucket == "test-quarantine"
    assert job.organization_id == "org-123"


def test_list_bronze_files(job):
    """Test listing Bronze files"""
    mock_response = {
        "Contents": [
            {"Key": "quickbooks/account/org-123/file1.json"},
            {"Key": "quickbooks/account/org-123/file2.json"},
        ]
    }
    job.s3_client.list_objects_v2 = Mock(return_value=mock_response)

    files = job.list_bronze_files("quickbooks", "account", "org-123")

    assert len(files) == 2
    assert "quickbooks/account/org-123/file1.json" in files


def test_read_bronze_file(job):
    """Test reading Bronze file"""
    test_data = [{"id": "1", "name": "Test Account"}]
    mock_response = {
        "Body": Mock(read=Mock(return_value=bytes(json.dumps(test_data), "utf-8")))
    }
    job.s3_client.get_object = Mock(return_value=mock_response)

    records = job.read_bronze_file("test-key.json")

    assert len(records) == 1
    assert records[0]["id"] == "1"
    assert job.stats["records_read"] == 1


def test_write_silver_file(job):
    """Test writing to Silver bucket"""
    records = [{"id": "1", "name": "Test Account"}]
    job.s3_client.put_object = Mock()

    key = job.write_silver_file("account", "org-123", records)

    assert key.startswith("account/org-123/")
    assert key.endswith(".json")
    job.s3_client.put_object.assert_called_once()


def test_write_quarantine_file(job):
    """Test writing to Quarantine bucket"""
    records = [{"id": "1", "name": "", "_validation_errors": ["Name is required"]}]
    job.s3_client.put_object = Mock()

    key = job.write_quarantine_file("account", "org-123", records, "validation_failed")

    assert key.startswith("account/org-123/")
    assert "validation_failed" in key
    job.s3_client.put_object.assert_called_once()


@patch("orchestration.glue_jobs.bronze_to_silver.urllib.request")
def test_trigger_cache_invalidation(mock_urllib, job):
    """Test cache invalidation trigger"""
    mock_response = Mock()
    mock_response.read.return_value = b'{"success": true, "keysDeleted": 5}'
    mock_urllib.urlopen.return_value = mock_response

    with patch.dict("os.environ", {
        "API_ENDPOINT": "http://localhost:3000",
        "INTERNAL_API_TOKEN": "test-token",
    }):
        job.trigger_cache_invalidation("org-123")

        assert mock_urllib.urlopen.called


def test_process_entity_empty_bronze(job):
    """Test processing when no Bronze files exist"""
    job.list_bronze_files = Mock(return_value=[])

    result = job.process_entity("quickbooks", "account", "org-123")

    assert result["processed"] == 0
    assert result["quarantined"] == 0


def test_process_entity_full_pipeline(job):
    """Test full ETL pipeline for an entity"""
    # Mock Bronze file reading
    test_records = [
        {
            "Id": "1",
            "Name": "Test Account",
            "AccountType": "Bank",
            "MetaData": {"CreateTime": "2024-01-01T00:00:00Z"},
        },
        {
            "Id": "1",  # Duplicate
            "Name": "Test Account Updated",
            "AccountType": "Bank",
            "MetaData": {"CreateTime": "2024-01-02T00:00:00Z"},
        },
    ]

    job.list_bronze_files = Mock(return_value=["test-file.json"])
    job.read_bronze_file = Mock(return_value=test_records)
    job.write_silver_file = Mock(return_value="silver-key.json")
    job.write_quarantine_file = Mock(return_value="quarantine-key.json")

    result = job.process_entity("quickbooks", "account", "org-123")

    # Should process records through pipeline
    assert job.stats["records_read"] == 2
    assert job.write_silver_file.called or job.write_quarantine_file.called


def test_run_job(job):
    """Test running the full job"""
    job.list_bronze_files = Mock(return_value=[])
    job.trigger_cache_invalidation = Mock()
    job.send_alert_email = Mock()

    result = job.run()

    assert result["success"] is True
    assert "duration_seconds" in result
    assert "stats" in result
    assert "results" in result
    job.trigger_cache_invalidation.assert_called_once()
    job.send_alert_email.assert_called_once()
