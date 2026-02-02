"""
Fixtures Loader - Python

Provides functions to load test fixtures for pipelines and scripts.

Usage:
    from fixtures.loader import load_industry, load_all_industries

    restaurant = load_industry('restaurant')
    all_industries = load_all_industries()
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

# Base path for fixtures
FIXTURES_DIR = Path(__file__).parent


def _load_json(filepath: Path) -> Dict[str, Any]:
    """Load a JSON file and return its contents."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


# =============================================================================
# Industry Fixtures
# =============================================================================

def load_industry(industry_id: str) -> Dict[str, Any]:
    """
    Load a single industry fixture by ID.
    
    Args:
        industry_id: Industry identifier (e.g., 'restaurant', 'real_estate')
    
    Returns:
        Industry configuration dict
    
    Raises:
        FileNotFoundError: If industry fixture doesn't exist
    """
    filepath = FIXTURES_DIR / 'industries' / f'{industry_id}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Industry fixture not found: {industry_id}")
    return _load_json(filepath)


def load_all_industries() -> List[Dict[str, Any]]:
    """
    Load all industry fixtures.
    
    Returns:
        List of industry configuration dicts
    """
    index = _load_json(FIXTURES_DIR / 'industries' / 'index.json')
    industries = []
    for item in index['industries']:
        try:
            industry = load_industry(item['id'])
            industries.append(industry)
        except FileNotFoundError:
            pass  # Skip missing fixtures
    return industries


def get_industry_ids() -> List[str]:
    """Get list of all industry IDs."""
    index = _load_json(FIXTURES_DIR / 'industries' / 'index.json')
    return [item['id'] for item in index['industries']]


def get_quickbooks_accounts(industry_id: str) -> List[Dict[str, Any]]:
    """
    Get accounts formatted for QuickBooks API.
    
    Args:
        industry_id: Industry identifier
    
    Returns:
        List of account dicts in QuickBooks format
    """
    industry = load_industry(industry_id)
    qb_accounts = []
    
    for account in industry.get('accounts', []):
        qb_account = {
            'Name': account['name'],
            'AccountType': account['type'],
            'AccountSubType': account['subtype'],
        }
        qb_accounts.append(qb_account)
    
    return qb_accounts


def get_quickbooks_customers(industry_id: str) -> List[Dict[str, Any]]:
    """
    Get customers formatted for QuickBooks API.
    
    Args:
        industry_id: Industry identifier
    
    Returns:
        List of customer dicts in QuickBooks format
    """
    industry = load_industry(industry_id)
    qb_customers = []
    
    for customer in industry.get('customers', []):
        qb_customer = {
            'DisplayName': customer['name'],
            'PrimaryEmailAddr': {'Address': customer.get('email', '')},
            'PrimaryPhone': {'FreeFormNumber': customer.get('phone', '')},
        }
        qb_customers.append(qb_customer)
    
    return qb_customers


def get_quickbooks_vendors(industry_id: str) -> List[Dict[str, Any]]:
    """
    Get vendors formatted for QuickBooks API.
    
    Args:
        industry_id: Industry identifier
    
    Returns:
        List of vendor dicts in QuickBooks format
    """
    industry = load_industry(industry_id)
    qb_vendors = []
    
    for vendor in industry.get('vendors', []):
        qb_vendor = {
            'DisplayName': vendor['name'],
            'PrimaryEmailAddr': {'Address': vendor.get('email', '')},
        }
        qb_vendors.append(qb_vendor)
    
    return qb_vendors


# =============================================================================
# Provider Fixtures
# =============================================================================

def load_provider_response(provider: str, entity: str) -> Dict[str, Any]:
    """
    Load a provider API response fixture.
    
    Args:
        provider: Provider name (e.g., 'quickbooks', 'xero', 'sage')
        entity: Entity type (e.g., 'accounts', 'customers', 'invoices')
    
    Returns:
        Mock API response dict
    """
    filepath = FIXTURES_DIR / 'providers' / provider / f'{entity}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Provider fixture not found: {provider}/{entity}")
    return _load_json(filepath)


def load_provider_error(provider: str, error_type: str) -> Dict[str, Any]:
    """
    Load a provider error response fixture.
    
    Args:
        provider: Provider name
        error_type: Error type (e.g., 'rate_limit', 'auth_expired')
    
    Returns:
        Mock error response dict
    """
    filepath = FIXTURES_DIR / 'providers' / provider / 'errors' / f'{error_type}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Provider error fixture not found: {provider}/errors/{error_type}")
    return _load_json(filepath)


# =============================================================================
# Datalake Fixtures
# =============================================================================

def load_bronze_sample(provider: str, entity: str) -> Dict[str, Any]:
    """
    Load a Bronze layer sample fixture.
    
    Args:
        provider: Provider name
        entity: Entity type
    
    Returns:
        Sample Bronze layer data
    """
    filepath = FIXTURES_DIR / 'datalake' / 'bronze' / f'{provider}_{entity}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Bronze fixture not found: {provider}_{entity}")
    return _load_json(filepath)


def load_silver_sample(entity: str) -> Dict[str, Any]:
    """
    Load a Silver layer sample fixture.
    
    Args:
        entity: Entity type
    
    Returns:
        Sample Silver layer data
    """
    filepath = FIXTURES_DIR / 'datalake' / 'silver' / f'{entity}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Silver fixture not found: {entity}")
    return _load_json(filepath)


def load_gold_sample(table: str) -> Dict[str, Any]:
    """
    Load a Gold layer sample fixture.
    
    Args:
        table: Table name (e.g., 'dim_account', 'fact_transaction')
    
    Returns:
        Sample Gold layer data
    """
    filepath = FIXTURES_DIR / 'datalake' / 'gold' / f'{table}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Gold fixture not found: {table}")
    return _load_json(filepath)


# =============================================================================
# Edge Case Fixtures
# =============================================================================

def load_edge_case(case_name: str) -> Dict[str, Any]:
    """
    Load an edge case fixture for testing error handling.
    
    Args:
        case_name: Case name (e.g., 'empty_data', 'malformed_data', 'rate_limit')
    
    Returns:
        Edge case data
    """
    filepath = FIXTURES_DIR / 'edge_cases' / f'{case_name}.json'
    if not filepath.exists():
        raise FileNotFoundError(f"Edge case fixture not found: {case_name}")
    return _load_json(filepath)


# =============================================================================
# Auth Fixtures
# =============================================================================

def load_test_user(role: str = 'user') -> Dict[str, Any]:
    """
    Load a test user fixture.
    
    Args:
        role: User role ('admin', 'user', 'viewer')
    
    Returns:
        Test user data
    """
    users = _load_json(FIXTURES_DIR / 'auth' / 'users.json')
    for user in users.get('users', []):
        if user.get('role') == role:
            return user
    raise ValueError(f"No test user found with role: {role}")


def load_test_organization(plan: str = 'professional') -> Dict[str, Any]:
    """
    Load a test organization fixture.
    
    Args:
        plan: Organization plan ('free', 'professional', 'enterprise')
    
    Returns:
        Test organization data
    """
    orgs = _load_json(FIXTURES_DIR / 'auth' / 'organizations.json')
    for org in orgs.get('organizations', []):
        if org.get('plan') == plan:
            return org
    raise ValueError(f"No test organization found with plan: {plan}")


# =============================================================================
# Utility Functions
# =============================================================================

def list_fixtures(category: str) -> List[str]:
    """
    List available fixtures in a category.
    
    Args:
        category: Category name ('industries', 'providers', 'edge_cases', etc.)
    
    Returns:
        List of fixture names
    """
    category_dir = FIXTURES_DIR / category
    if not category_dir.exists():
        return []
    
    fixtures = []
    for f in category_dir.glob('*.json'):
        if not f.name.startswith('_'):
            fixtures.append(f.stem)
    return fixtures
