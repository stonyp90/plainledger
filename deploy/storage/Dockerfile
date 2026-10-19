# Inputs are validated against pins.json by build.py. No mutable image or source
# references, package installs, upstream MinIO images, or third-party mirrors.
ARG BUILDER_IMAGE
ARG RUNTIME_IMAGE
FROM ${BUILDER_IMAGE} AS build
ARG MODULE
ARG SOURCE_COMMIT
ARG SOURCE_VERSION
ARG SOURCE_RELEASE
ARG SOURCE_TIME
ARG GO_VERSION
ARG COMPONENT
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOPROXY=https://proxy.golang.org GOSUMDB=sum.golang.org GOBIN=/out/bin
RUN test "$(go env GOVERSION)" = "go$GO_VERSION" && \
    case "$MODULE" in github.com/minio/minio|github.com/minio/mc) ;; *) exit 1 ;; esac && \
    mkdir -p /out/bin /out/licenses /out/provenance && \
    source_short=$(printf '%s' "$SOURCE_COMMIT" | cut -c1-12) && \
    source_year=$(printf '%s' "$SOURCE_TIME" | cut -c1-4) && \
    retry_go() { attempt=1; until "$@"; do \
      if [ "$attempt" -ge 3 ]; then return 1; fi; \
      printf '%s\n' "Retrying the same pinned Go operation after attempt $attempt" >&2; \
      sleep "$((attempt * 5))"; attempt=$((attempt + 1)); \
    done; } && \
    retry_go go list -m -json "$MODULE@$SOURCE_VERSION" > /out/provenance/module.json && \
    test "$(go list -m -f '{{.Origin.Hash}}' "$MODULE@$SOURCE_VERSION")" = "$SOURCE_COMMIT" && \
    retry_go go install -trimpath \
      -ldflags "-s -w -X $MODULE/cmd.Version=$SOURCE_TIME -X $MODULE/cmd.ReleaseTag=$SOURCE_RELEASE -X $MODULE/cmd.CommitID=$SOURCE_COMMIT -X $MODULE/cmd.ShortCommitID=$source_short -X $MODULE/cmd.CopyrightYear=$source_year" \
      "$MODULE@$SOURCE_VERSION" && \
    source_dir=$(go list -m -f '{{.Dir}}' "$MODULE@$SOURCE_VERSION") && \
    cp "$source_dir/LICENSE" "$source_dir/CREDITS" "$source_dir/NOTICE" /out/licenses/ && \
    go list -m -json "$MODULE@$SOURCE_VERSION" > /out/provenance/module.json && \
    go version -m "/out/bin/$COMPONENT" > /out/provenance/go-build.txt && \
    sha256sum "/out/bin/$COMPONENT" > /out/provenance/binary.sha256 && \
    printf '%s\n' "https://$MODULE/tree/$SOURCE_COMMIT" > /out/licenses/SOURCE

FROM ${RUNTIME_IMAGE} AS runtime
USER 0
RUN command -v curl && command -v sh && command -v cat && command -v rm && \
    test -s /cacert.pem && \
    addgroup -g 10001 plainledger && \
    adduser -D -H -u 10001 -G plainledger plainledger && \
    mkdir -p /data && chown 10001:10001 /data
COPY --from=build /out/ /opt/plainledger-storage/
ENV PATH=/opt/plainledger-storage/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    HOME=/tmp SSL_CERT_FILE=/cacert.pem MC_CONFIG_DIR=/tmp/.mc
USER 10001:10001
WORKDIR /tmp

FROM runtime AS server
ENV MINIO_BROWSER=off
EXPOSE 9000
VOLUME ["/data"]
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]

FROM runtime AS client
ENTRYPOINT ["mc"]
