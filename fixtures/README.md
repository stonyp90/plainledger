# PlainLedger Test Fixtures

Shared test fixtures for Python (pipelines) and TypeScript (API, Web, E2E) tests.

## Structure

```
fixtures/
├── industries/          # Industry configurations (accounts, KPIs, customers, vendors)
├── providers/           # Provider API response mocks (QuickBooks, Xero, Sage)
├── datalake/            # Bronze, Silver, Gold layer samples
├── graphql/             # GraphQL query/mutation response fixtures
├── database/            # PostgreSQL seed scripts
├── auth/                # Test users, organizations, tokens
├── edge_cases/          # Error scenarios, malformed data
├── loader.py            # Python loader module
└── loader.ts            # TypeScript loader module
```

## Usage

### Python

```python
from fixtures.loader import (
    load_industry,
    load_all_industries,
    load_provider_response,
    load_edge_case
)

# Load single industry
restaurant = load_industry('restaurant')

# Load all industries
industries = load_all_industries()

# Load QuickBooks account response mock
qb_accounts = load_provider_response('quickbooks', 'accounts')

# Load error scenario
rate_limit = load_edge_case('rate_limit')
```

### TypeScript

```typescript
import {
  loadIndustry,
  loadAllIndustries,
  loadGraphQLResponse,
  loadEdgeCase
} from '../fixtures/loader';

// Load single industry
const restaurant = loadIndustry('restaurant');

// Load all industries
const industries = loadAllIndustries();

// Load GraphQL response fixture
const dashboardResponse = loadGraphQLResponse('dashboard_summary');

// Load error scenario
const rateLimit = loadEdgeCase('rate_limit');
```

## Industries

All 15 supported industries with complete test data:

| ID | Name | Primary KPIs |
|----|------|--------------|
| `restaurant` | Restaurant | Food Cost %, Labor Cost %, Prime Cost % |
| `retail` | Retail | Gross Margin %, Inventory Turnover |
| `real_estate` | Real Estate | NOI, Cap Rate, Expense Ratio |
| `construction` | Construction | Job Margin %, WIP Balance |
| `professional_services` | Professional Services | Utilization Rate, AR Days |
| `manufacturing` | Manufacturing | Gross Margin %, OEE |
| `hospitality` | Hospitality | RevPAR, ADR, Occupancy Rate |
| `healthcare` | Healthcare | Revenue per Patient, Net Margin % |
| `education` | Education | Student Retention, Revenue per Student |
| `agriculture` | Agriculture | Yield per Hectare, Profit Margin % |
| `transport` | Transportation | Revenue per Mile, Fuel Efficiency |
| `wholesale` | Wholesale | Gross Margin %, Order Fill Rate |
| `automotive` | Automotive | Service Revenue %, Customer Retention |
| `beauty_wellness` | Beauty & Wellness | Revenue per Client, Client Retention |
| `technology` | Technology | Gross Margin %, CAC Payback |

## Adding New Fixtures

1. Create JSON file in appropriate folder
2. Follow existing schema (see `industries/_schema.json`)
3. Update index files if applicable
4. Test with both Python and TypeScript loaders
