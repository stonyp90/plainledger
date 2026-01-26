# PlainLedger Security & Compliance

## Security Overview

PlainLedger implements industry-standard security practices built by CPAs who understand the confidentiality requirements of accounting firms. All data is stored in Canada (Quebec) with bank-level encryption. This document outlines our security controls and best practices.

## 1. Secrets Management

### Principles
- **Zero Trust**: Secrets are never exposed to the frontend application
- **Encryption at Rest**: All secrets use AES-256-GCM encryption
- **Encryption in Transit**: All communications use TLS 1.3
- **Least Privilege**: Access is granted on a need-to-know basis
- **Audit Logging**: All secret access is logged with user, timestamp, and IP

### Secret Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  - Only receives masked values (••••••••1234)                   │
│  - Never stores actual secrets                                   │
│  - Uses secure API calls for operations requiring secrets        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (TLS 1.3)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API (NestJS)                      │
│  - Validates all requests with JWT tokens                        │
│  - Rate limiting on sensitive endpoints                          │
│  - Request logging and audit trail                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ Internal Network
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Secrets Vault                                 │
│  Options:                                                        │
│  - AWS Secrets Manager                                           │
│  - HashiCorp Vault                                               │
│  - Azure Key Vault                                               │
│                                                                  │
│  Features:                                                       │
│  - Automatic rotation                                            │
│  - Version history                                               │
│  - Access policies                                               │
│  - Audit logging                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Secret Types

| Type | Description | Rotation Policy |
|------|-------------|-----------------|
| `api_key` | Third-party API keys | 90 days |
| `client_secret` | OAuth client secrets | 365 days |
| `oauth_token` | OAuth access tokens | Provider-defined |
| `refresh_token` | OAuth refresh tokens | Provider-defined |
| `webhook_secret` | Webhook signing secrets | 90 days |
| `encryption_key` | Data encryption keys | 365 days |
| `database_password` | Database credentials | 90 days |
| `service_account` | Service account keys | 90 days |

### Access Control

Only users with the following roles can manage secrets:
- **Owner**: Full access to all secrets
- **Admin**: Can create, rotate, and revoke secrets
- **Internal Staff**: PlainLedger staff configuring customer integrations

Regular users:
- Cannot view, create, or modify secrets
- Can use features powered by secrets (e.g., data sync)
- See only masked values in connection status displays

## 2. Authentication & Authorization

### Identity Provider
- **Keycloak** for centralized identity management
- **OAuth 2.0 / OpenID Connect** protocols
- **MFA** support (TOTP, WebAuthn)
- **SSO** for enterprise customers (SAML 2.0)

### Session Management
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with secure rotation
- Session revocation on security events
- Device tracking and suspicious activity detection

### Role-Based Access Control (RBAC)

| Permission | Owner | Admin | Accountant | Viewer |
|------------|-------|-------|------------|--------|
| View reports | ✓ | ✓ | ✓ | ✓ |
| Export data | ✓ | ✓ | ✓ | ✗ |
| Manage connections | ✓ | ✓ | ✗ | ✗ |
| Manage secrets | ✓ | ✓ | ✗ | ✗ |
| Manage users | ✓ | ✓ | ✗ | ✗ |
| Billing | ✓ | ✗ | ✗ | ✗ |

## 3. Data Protection

### Encryption

| Data Type | At Rest | In Transit |
|-----------|---------|------------|
| User credentials | AES-256-GCM | TLS 1.3 |
| API keys/secrets | AES-256-GCM | TLS 1.3 |
| Financial data | AES-256-GCM | TLS 1.3 |
| Backups | AES-256-GCM | TLS 1.3 |
| Audit logs | AES-256-GCM | TLS 1.3 |

### Data Masking

Sensitive data is automatically masked in:
- Application logs
- Error messages
- API responses to frontend
- Audit log details

Example masking:
```typescript
// Input: "sk_live_abcdef1234567890"
// Output: "••••••••••••7890"

// Input: "admin@company.com"
// Output: "a••••n@••••••.com"
```

## 4. Audit Logging

### Events Logged

| Event Type | Data Captured |
|------------|---------------|
| Secret created | User, timestamp, secret type, IP |
| Secret accessed | User, timestamp, purpose, IP |
| Secret rotated | User, timestamp, reason, IP |
| Secret revoked | User, timestamp, reason, IP |
| Login success | User, timestamp, IP, device |
| Login failure | Attempted user, timestamp, IP |
| Permission change | User, target, old/new permissions |
| Data export | User, timestamp, data scope |

### Log Retention
- Security logs: 7 years
- Access logs: 2 years
- Application logs: 90 days

## 5. Network Security

### Firewall Rules
- Default deny all inbound
- Allow only HTTPS (443) from CloudFlare
- Internal services communicate via VPC

### DDoS Protection
- CloudFlare DDoS mitigation
- Rate limiting on all API endpoints
- Automated blocking of suspicious IPs

## 6. Incident Response

### Process
1. **Detection**: Automated monitoring alerts
2. **Triage**: Security team assesses severity
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat
5. **Recovery**: Restore services
6. **Post-mortem**: Document and improve

### Notification
- Critical incidents: Within 24 hours
- High severity: Within 72 hours
- Medium/Low: In monthly security report

## 7. Compliance & Standards

- [x] PIPEDA Compliant (Canadian Privacy)
- [x] Quebec Privacy Law (Law 25) Compliant
- [x] CPA Professional Standards Alignment
- [x] Data Residency in Quebec/Canada
- [ ] GDPR Compliant (for EU clients)
- [ ] PCI DSS (for payment processing)

## 8. Security Contacts

- **Security Team**: security@plainledger.ca
- **Bug Bounty**: security@plainledger.ca
- **DPO**: privacy@plainledger.ca

## 9. Responsible Disclosure

We appreciate security researchers who help us maintain the security of PlainLedger. Please report vulnerabilities to security@plainledger.ca. We commit to:
- Acknowledge receipt within 24 hours
- Provide status updates every 72 hours
- Credit researchers (if desired) upon fix
- Not pursue legal action for good-faith research

---

*Last Updated: January 2026*
*Version: 1.0*
