# Scripts

Utility scripts organized by use case, provider, and domain.

## Directory Structure

```
scripts/
├── providers/           # Provider-specific scripts
│   ├── quickbooks/     # QuickBooks Online integration
│   ├── xero/           # Xero integration (future)
│   └── sage/           # Sage integration (future)
├── datalake/           # S3 data lake operations
├── ml/                 # Machine learning scripts
├── utils/              # Shared utilities
└── dev/                # Development helpers
```

## Provider Scripts

### QuickBooks

| Script | Description | Usage |
|--------|-------------|-------|
| `get-token.ts` | OAuth token helper - starts local server for callback | `npx tsx scripts/providers/quickbooks/get-token.ts` |
| `get-token-playground.ts` | OAuth token helper - uses Intuit OAuth Playground (manual flow) | `npx tsx scripts/providers/quickbooks/get-token-playground.ts` |
| `seed-sandbox.ts` | Seeds QuickBooks sandbox with $35M real estate company data | `QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/providers/quickbooks/seed-sandbox.ts` |
| `populate-industries.py` | Populates QuickBooks sandbox with industry-specific data for all 15 industries | `python scripts/providers/quickbooks/populate-industries.py --refresh-token=xxx --realm-id=xxx` |
| `sync-to-gold.ts` | Syncs QuickBooks data to S3 Gold layer | `QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/providers/quickbooks/sync-to-gold.ts` |

**Required Environment Variables:**
- `QUICKBOOKS_CLIENT_ID` - OAuth client ID
- `QUICKBOOKS_CLIENT_SECRET` - OAuth client secret
- `QUICKBOOKS_REALM_ID` - Company/realm ID
- `QUICKBOOKS_REFRESH_TOKEN` - Refresh token (get via `get-token.ts`)

## Data Lake Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `seed-gold.ts` | Seeds S3 Gold bucket with demo data (local dev) | `npx tsx scripts/datalake/seed-gold.ts` |

**Environment Variables:**
- `S3_ENDPOINT` - LocalStack endpoint (empty for real AWS)
- `S3_REGION` - AWS region (default: `ca-central-1`)
- `S3_BUCKET_GOLD` - Gold bucket name

## Machine Learning Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `train-decision-model.py` | Fine-tunes Mistral 7B with LoRA for decision intelligence | `python scripts/ml/train-decision-model.py` |

**Requirements:**
```bash
pip install torch transformers datasets peft accelerate boto3
```

## Development Workflow

### 1. Get QuickBooks Token (one-time)

**Option A: Automated OAuth flow (recommended)**
```bash
npx tsx scripts/providers/quickbooks/get-token.ts
```
Follow the browser prompt to authenticate. Save the refresh token to `.env`.

**Option B: OAuth Playground (manual)**
```bash
npx tsx scripts/providers/quickbooks/get-token-playground.ts
```
Opens Intuit OAuth Playground in browser. Follow instructions to get tokens.

### 2. Seed QuickBooks Sandbox

**Option A: Real estate company data**
```bash
npx tsx scripts/providers/quickbooks/seed-sandbox.ts
```
Creates 24 months of realistic financial data for a $35M real estate company.

**Option B: Industry-specific data (all 15 industries)**
```bash
python scripts/providers/quickbooks/populate-industries.py \
    --refresh-token=RT1-xxx \
    --realm-id=9341456072863003
```
Populates QuickBooks sandbox with accounts and data for all 15 PlainLedger industries.

### 3. Sync to Local S3

```bash
# Start LocalStack first
./local-dev/start.sh

# Sync data
npx tsx scripts/providers/quickbooks/sync-to-gold.ts
```

### 4. Or use demo data (no QuickBooks needed)

```bash
npx tsx scripts/datalake/seed-gold.ts
```

## Adding New Providers

1. Create folder: `scripts/providers/{provider}/`
2. Add scripts following naming convention:
   - `get-token.ts` - OAuth helper (automated flow)
   - `get-token-playground.ts` - OAuth helper (manual playground flow, optional)
   - `seed-sandbox.ts` - Sandbox data seeding
   - `populate-industries.py` - Industry-specific data population (optional)
   - `sync-to-gold.ts` - Data sync to S3
3. Update this README
