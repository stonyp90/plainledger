# PlainLedger Local Development Setup

## Quick Start

### 1. Start Docker Services

```bash
cd /Users/tony/stonyp90-websites/plainledger
docker-compose up -d
```

Wait for services to be healthy (about 1-2 minutes).

---

## Default Credentials

### Web Application Login

| Email | Password | Organization | Description |
|-------|----------|--------------|-------------|
| `demo@plainledger.ca` | `DemoPass123!@#` | demo-org | Demo user (existing) |
| `admin@plainledger.ca` | `AdminPass123!@#` | demo-org | Admin user |
| `accountant@plainledger.ca` | `Accountant123!@#` | demo-org | Accountant user |

### New Signups

**All new signups automatically:**
- Are assigned to `demo-signup` organization
- Have demo mode enabled by default
- See locked features with CTAs to contact us
- View demo data only

### Keycloak Admin Console

- URL: http://localhost:8080
- Username: `admin`
- Password: `admin`

### MinIO Console

- URL: http://localhost:9001
- Username: `plainledger`
- Password: `plainledger_secret`

---

## Demo Mode Features

### For New Signups (demo-signup organization)

1. **Welcome Banner** - Shows at top of dashboard with locked account notice
2. **Demo Banner** - Persistent banner indicating demo data
3. **Locked Sections** - All premium features show lock overlays
4. **Demo Badges** - "DEMO" badges on all KPI cards and navigation items
5. **No Pricing** - No pricing information displayed anywhere
6. **Contact CTAs** - Multiple CTAs to schedule demo call or request information

### Demo Mode Indicators

- ✅ Demo banner at top of pages
- ✅ "DEMO" badges on KPI cards
- ✅ "DEMO" badges on navigation items
- ✅ Locked sections with upgrade prompts
- ✅ No pricing information shown

---

## Services

| Service | URL | Status |
|---------|-----|--------|
| Web App | http://localhost:5173 | ✅ Running |
| API | http://localhost:3000 | ✅ Running |
| Keycloak | http://localhost:8080 | ✅ Running |
| PostgreSQL (app) | localhost:5432 | ✅ Running |
| Redis | localhost:6379 | ✅ Running |
| MinIO | http://localhost:9001 | ✅ Running |
| LocalStack | http://localhost:4566 | ✅ Running |

---

## Testing New Signup Flow

1. Navigate to http://localhost:5173/signup
2. Fill out the registration form
3. After email verification, login
4. You'll automatically be in `demo-signup` organization
5. Demo mode will be enabled automatically
6. All features will be locked with CTAs

---

## Fixed Issues

✅ **Bottom left menu** - Fixed overflow issues in sidebar user menu
✅ **Language toggle** - Fixed dropdown positioning (no longer off-screen)
✅ **Demo mode** - Auto-enabled for new signups
✅ **Demo indicators** - Added throughout the app
✅ **Pricing removed** - No pricing information displayed
✅ **Locked sections** - All premium features locked with upgrade CTAs
