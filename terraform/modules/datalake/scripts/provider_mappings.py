"""
Provider-specific mappings for QuickBooks Online and Xero
Maps provider account types to standard Gold layer account types
"""

# QuickBooks Online Account Type Mapping
QUICKBOOKS_ACCOUNT_TYPE_MAPPING = {
    # Assets
    'Bank': 'ASSET',
    'Accounts Receivable': 'ASSET',
    'Other Current Asset': 'ASSET',
    'Fixed Asset': 'ASSET',
    'Other Asset': 'ASSET',
    
    # Liabilities
    'Accounts Payable': 'LIABILITY',
    'Credit Card': 'LIABILITY',
    'Other Current Liability': 'LIABILITY',
    'Long Term Liability': 'LIABILITY',
    
    # Equity
    'Equity': 'EQUITY',
    
    # Revenue
    'Income': 'REVENUE',
    'Other Income': 'REVENUE',
    
    # Expenses
    'Expense': 'EXPENSE',
    'Other Expense': 'EXPENSE',
    'Cost of Goods Sold': 'EXPENSE',
}

# Xero Account Type Mapping
XERO_ACCOUNT_TYPE_MAPPING = {
    # Assets
    'BANK': 'ASSET',
    'CURRENT': 'ASSET',  # Combined with Class field
    'FIXED': 'ASSET',
    
    # Liabilities
    'CURRLIAB': 'LIABILITY',
    'TERMLIAB': 'LIABILITY',
    
    # Equity
    'EQUITY': 'EQUITY',
    
    # Revenue
    'REVENUE': 'REVENUE',
    'OTHERINCOME': 'REVENUE',
    
    # Expenses
    'DIRECTCOSTS': 'EXPENSE',
    'EXPENSE': 'EXPENSE',
    'OVERHEADS': 'EXPENSE',
}

# Account type prefix for generating account codes when missing
ACCOUNT_TYPE_PREFIX = {
    'ASSET': '1',
    'LIABILITY': '2',
    'EQUITY': '3',
    'REVENUE': '4',
    'EXPENSE': '5',
}

# Default dimension keys for NULL handling
DEFAULT_DIMENSION_KEYS = {
    'contact': '__UNKNOWN__',
    'item': '__NO_ITEM__',
    'class': '__UNCLASSIFIED__',
    'location': '__NO_LOCATION__',
    'business_unit': '__DEFAULT__',
}

def map_quickbooks_account_type(qbo_account_type, qbo_account_subtype=None):
    """
    Map QuickBooks account type to standard Gold layer account type
    
    Args:
        qbo_account_type: QuickBooks AccountType (e.g., 'Bank', 'Income')
        qbo_account_subtype: Optional AccountSubType
        
    Returns:
        Standard account type: 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    """
    return QUICKBOOKS_ACCOUNT_TYPE_MAPPING.get(qbo_account_type, 'EXPENSE')

def map_xero_account_type(xero_type, xero_class=None):
    """
    Map Xero account type to standard Gold layer account type
    
    Args:
        xero_type: Xero Type (e.g., 'BANK', 'REVENUE')
        xero_class: Optional Class field
        
    Returns:
        Standard account type: 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    """
    # Xero CURRENT type needs Class to determine if Asset or Liability
    if xero_type == 'CURRENT' and xero_class:
        if 'ASSET' in xero_class.upper():
            return 'ASSET'
        elif 'LIABILITY' in xero_class.upper():
            return 'LIABILITY'
    
    return XERO_ACCOUNT_TYPE_MAPPING.get(xero_type, 'EXPENSE')

def generate_account_code(account_id, account_type):
    """
    Generate account code when missing (QuickBooks sometimes doesn't have AcctNum)
    
    Args:
        account_id: Source account ID
        account_type: Standard account type
        
    Returns:
        Generated account code (e.g., "1001", "4102")
    """
    prefix = ACCOUNT_TYPE_PREFIX.get(account_type, '9')
    # Use last 4 digits of account ID
    suffix = account_id[-4:] if len(account_id) >= 4 else account_id.zfill(4)
    return f"{prefix}{suffix}"

def get_default_dimension_key(dimension_type):
    """
    Get default dimension key for NULL foreign keys
    
    Args:
        dimension_type: 'contact', 'item', 'class', 'location', 'business_unit'
        
    Returns:
        Default key string
    """
    return DEFAULT_DIMENSION_KEYS.get(dimension_type, '__UNKNOWN__')

def is_debit_normal(account_type):
    """
    Determine if account type has debit normal balance
    
    Args:
        account_type: Standard account type
        
    Returns:
        True for Assets and Expenses, False for Liabilities, Equity, Revenue
    """
    return account_type in ['ASSET', 'EXPENSE']

def get_balance_sheet_section(account_type, account_subtype):
    """
    Get balance sheet section for account
    
    Args:
        account_type: Standard account type
        account_subtype: Account subtype
        
    Returns:
        Section name: 'Current Assets', 'Fixed Assets', 'Current Liabilities', etc.
    """
    if account_type == 'ASSET':
        if account_subtype in ['CURRENT', 'Bank', 'Accounts Receivable', 'Other Current Asset']:
            return 'Current Assets'
        else:
            return 'Fixed Assets'
    elif account_type == 'LIABILITY':
        if account_subtype in ['CURRENT', 'Accounts Payable', 'Credit Card', 'Other Current Liability']:
            return 'Current Liabilities'
        else:
            return 'Long Term Liabilities'
    elif account_type == 'EQUITY':
        return 'Equity'
    return None

def get_income_statement_section(account_type, account_subtype):
    """
    Get income statement section for account
    
    Args:
        account_type: Standard account type
        account_subtype: Account subtype
        
    Returns:
        Section name: 'Revenue', 'COGS', 'Operating Expenses', etc.
    """
    if account_type == 'REVENUE':
        if account_subtype == 'Cost of Goods Sold':
            return 'COGS'
        return 'Revenue'
    elif account_type == 'EXPENSE':
        if account_subtype == 'Cost of Goods Sold':
            return 'COGS'
        elif account_subtype in ['Other Expense', 'Other Income']:
            return 'Other Income/Expense'
        else:
            return 'Operating Expenses'
    return None

def get_cash_flow_category(account_type):
    """
    Get cash flow statement category
    
    Args:
        account_type: Standard account type
        
    Returns:
        Category: 'OPERATING', 'INVESTING', 'FINANCING', or None
    """
    if account_type in ['REVENUE', 'EXPENSE']:
        return 'OPERATING'
    elif account_type == 'ASSET':
        # Fixed assets are investing, current assets are operating
        return 'INVESTING'
    elif account_type in ['LIABILITY', 'EQUITY']:
        return 'FINANCING'
    return None
