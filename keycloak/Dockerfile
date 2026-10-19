# =============================================================================
# PlainLedger Keycloak Custom Image
# =============================================================================

FROM quay.io/keycloak/keycloak:26.1.0 as builder

# Enable health and metrics endpoints
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Copy custom themes
COPY themes/plainledger /opt/keycloak/themes/plainledger

# Copy the generated production realm only. Never package development users.
# Generate/check it with: python keycloak/prepare-production-realm.py --check
# Runtime env required: KEYCLOAK_CLIENT_SECRET, WEB_URL, ADMIN_URL
# Copy realm configuration
# Keycloak imports files matching *-realm.json pattern
# IMPORTANT: --import-realm only imports if realm doesn't exist
# - If realm exists: Import is skipped, existing users/data are preserved
# - If realm doesn't exist: Realm is created from JSON
COPY realms/plainledger-production-realm.json /opt/keycloak/data/import/plainledger-realm.json

# Build optimized image with PostgreSQL support
RUN /opt/keycloak/bin/kc.sh build --db=postgres

# =============================================================================
# Production Image
# =============================================================================

FROM quay.io/keycloak/keycloak:26.1.0

# Copy built artifacts from builder
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Set environment variables
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Expose port
EXPOSE 8080 9000

# Start Keycloak
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm"]
