import {
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { TextDecoder } from "node:util";

export interface GoldDataReaderOptions {
  maxFiles?: number;
  maxObjectBytes?: number;
  maxDatasetBytes?: number;
  maxRows?: number;
}

interface TenantRow {
  organization_key?: string;
}

interface GoldObject {
  key: string;
  modified: number;
}

/**
 * Reads Gold arrays without treating an unavailable/corrupt dataset as no data.
 * Storage layout is a directory of complete snapshots, or directories containing
 * one snapshot history per partition. Append-only logs require an explicit opt-in.
 */
export class GoldDataReader {
  private readonly maxFiles: number;
  private readonly maxObjectBytes: number;
  private readonly maxDatasetBytes: number;
  private readonly maxRows: number;

  constructor(
    private readonly s3Client: S3Client,
    private readonly bucket: string,
    options: GoldDataReaderOptions = {},
  ) {
    if (!bucket || bucket.trim() !== bucket) {
      throw new TypeError("A Gold storage bucket is required");
    }
    this.maxFiles = this.limit(options.maxFiles, 10_000, 100_000, "maxFiles");
    this.maxObjectBytes = this.limit(
      options.maxObjectBytes,
      25 * 1024 * 1024,
      256 * 1024 * 1024,
      "maxObjectBytes",
    );
    this.maxRows = this.limit(options.maxRows, 500_000, 2_000_000, "maxRows");
    this.maxDatasetBytes = this.limit(
      options.maxDatasetBytes,
      100 * 1024 * 1024,
      1024 * 1024 * 1024,
      "maxDatasetBytes",
    );
  }

  /** List every JSON object, including all S3 continuation pages. */
  async listFiles(prefix: string): Promise<string[]> {
    return (await this.listObjects(prefix)).map((object) => object.key).sort();
  }

  /** Low-level array reader. Tenant callers should use the scoped methods below. */
  async fetchJsonFile<T>(key: string): Promise<T> {
    this.validatePath(key, false);
    const response = await this.getObject(key, false);
    return (await this.parseArray(response!)).rows as T;
  }

  /**
   * Read a canonical tenant object. Only a missing object returns null; a present
   * empty snapshot returns [], so callers must not fall back to stale history.
   */
  async readTenantFile<T extends TenantRow>(
    key: string,
    organizationId: string,
  ): Promise<T[] | null> {
    this.validateTenantPath(key, organizationId, false);
    const response = await this.getObject(key, true);
    if (response === null) return null;
    return this.validateTenantRows<T>(
      (await this.parseArray(response)).rows,
      organizationId,
    );
  }

  async readTenantSnapshot<T extends TenantRow>(
    prefix: string,
    organizationId: string,
  ): Promise<T[]> {
    this.validateTenantPath(prefix, organizationId, true);
    const files = await this.listObjects(prefix);
    if (files.length === 0) return [];
    files.sort(this.compareObjects);
    const latest = files[files.length - 1];
    return this.validateTenantRows<T>(
      await this.fetchJsonFile<unknown[]>(latest.key),
      organizationId,
    );
  }

  async readTenantTransactions<
    T extends TenantRow & { transaction_key: string },
  >(
    prefix: string,
    organizationId: string,
    options: { layout?: "snapshots" | "append" } = {},
  ): Promise<T[]> {
    this.validateTenantPath(prefix, organizationId, true);
    if (
      options.layout !== undefined &&
      options.layout !== "snapshots" &&
      options.layout !== "append"
    ) {
      throw new TypeError("Unknown Gold transaction storage layout");
    }
    const files = await this.listObjects(prefix);
    const selected =
      options.layout === "append" ? files : this.latestPartitionSnapshots(files);
    const rowsByKey = new Map<string, T>();
    let rowsRead = 0;
    let bytesRead = 0;
    // Sequential reads bound simultaneous object memory. Newer records win when
    // the same stable transaction key moves between partitions or is corrected.
    for (const file of selected.sort(this.compareObjects)) {
      const parsed = await this.parseArray(
        (await this.getObject(file.key, false))!,
        this.maxDatasetBytes - bytesRead,
      );
      bytesRead += parsed.bytes;
      const rows = this.validateTenantRows<T>(parsed.rows, organizationId);
      rowsRead += rows.length;
      if (rowsRead > this.maxRows) {
        throw this.invalid("Gold dataset exceeds the configured row limit");
      }
      const snapshotKeys = new Set<string>();
      for (const row of rows) {
        if (
          typeof row.transaction_key !== "string" ||
          !row.transaction_key.trim() ||
          row.transaction_key.trim() !== row.transaction_key ||
          row.transaction_key.length > 1024
        ) {
          throw this.invalid("Gold transaction has no valid stable transaction key");
        }
        if (snapshotKeys.has(row.transaction_key)) {
          throw this.invalid("Gold snapshot contains duplicate transaction keys");
        }
        snapshotKeys.add(row.transaction_key);
        rowsByKey.set(row.transaction_key, row);
      }
    }
    return Array.from(rowsByKey.values());
  }

  private async listObjects(prefix: string): Promise<GoldObject[]> {
    this.validatePath(prefix, true);
    const objects = new Map<string, GoldObject>();
    const tokens = new Set<string>();
    let token: string | undefined;
    let scanned = 0;
    let pages = 0;
    do {
      // Also bound an invalid provider that emits endless empty continuation pages.
      if (++pages > this.maxFiles + 1) {
        throw this.invalid("Gold listing exceeds the configured page limit");
      }
      let response: ListObjectsV2CommandOutput;
      try {
        response = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            MaxKeys: Math.min(this.maxFiles + 1, 1000),
            ...(token ? { ContinuationToken: token } : {}),
          }),
        );
      } catch {
        throw new ServiceUnavailableException("Gold storage listing is unavailable");
      }
      if (!response || (response.Contents && !Array.isArray(response.Contents))) {
        throw this.invalid("Gold storage returned an invalid object listing");
      }
      if (response.IsTruncated !== undefined && typeof response.IsTruncated !== "boolean") {
        throw this.invalid("Gold storage returned invalid continuation information");
      }
      for (const object of response.Contents ?? []) {
        if (++scanned > this.maxFiles) {
          throw this.invalid("Gold dataset exceeds the configured file limit");
        }
        const key = object.Key;
        if (
          typeof key !== "string" ||
          !(prefix.endsWith("/") ? key.startsWith(prefix) : key === prefix)
        ) {
          throw this.invalid("Gold storage returned an object outside the requested scope");
        }
        if (key.endsWith("/")) continue;
        if (!key.endsWith(".json")) continue;
        this.validatePath(key, false);
        if (object.LastModified !== undefined && !(object.LastModified instanceof Date)) {
          throw this.invalid("Gold storage returned an invalid modification time");
        }
        const modified = object.LastModified?.getTime() ?? 0;
        if (!Number.isFinite(modified)) {
          throw this.invalid("Gold storage returned an invalid modification time");
        }
        if (objects.has(key)) {
          throw this.invalid("Gold storage returned a duplicate object listing");
        }
        objects.set(key, { key, modified });
      }
      if (response.IsTruncated !== true) break;
      const nextToken = response.NextContinuationToken;
      if (typeof nextToken !== "string" || !nextToken || tokens.has(nextToken)) {
        throw this.invalid("Gold storage returned invalid continuation information");
      }
      tokens.add(nextToken);
      token = nextToken;
    } while (token !== undefined);
    return Array.from(objects.values());
  }

  private async getObject(
    key: string,
    allowMissing: boolean,
  ): Promise<GetObjectCommandOutput | null> {
    try {
      return await this.s3Client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      const details = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (
        allowMissing &&
        (details?.name === "NoSuchKey" ||
          (details?.$metadata?.httpStatusCode === 404 &&
            details.name !== "NoSuchBucket"))
      ) {
        return null;
      }
      throw new ServiceUnavailableException("Gold storage object is unavailable");
    }
  }

  private async parseArray(
    response: GetObjectCommandOutput,
    byteBudget = this.maxObjectBytes,
  ): Promise<{ rows: unknown[]; bytes: number }> {
    const byteLimit = Math.min(this.maxObjectBytes, byteBudget);
    const body = response?.Body;
    if (!body) throw this.invalid("Gold storage returned an empty object body");
    const length = response.ContentLength;
    if (
      length !== undefined &&
      (!Number.isSafeInteger(length) || length < 0 || length > byteLimit)
    ) {
      this.closeBody(body);
      throw this.invalid("Gold object or dataset exceeds the configured byte limit or has an invalid size");
    }
    if (response.ContentEncoding && response.ContentEncoding !== "identity") {
      this.closeBody(body);
      throw this.invalid("Gold objects must contain uncompressed UTF-8 JSON");
    }
    const stream = body as unknown as AsyncIterable<unknown>;
    if (typeof stream[Symbol.asyncIterator] !== "function") {
      this.closeBody(body);
      throw this.invalid("Gold storage did not return a readable object stream");
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of stream) {
        if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) {
          throw this.invalid("Gold storage returned an invalid stream chunk");
        }
        const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > byteLimit) {
          throw this.invalid("Gold object or dataset exceeds the configured byte limit");
        }
        chunks.push(buffer);
      }
    } catch (error) {
      this.closeBody(body);
      if (error instanceof UnprocessableEntityException) throw error;
      throw new ServiceUnavailableException("Gold storage object stream was interrupted");
    }
    if (length !== undefined && bytes !== length) {
      throw this.invalid("Gold object body does not match its declared size");
    }
    let parsed: unknown;
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, bytes),
      );
      parsed = JSON.parse(text);
    } catch {
      throw this.invalid("Gold object contains invalid UTF-8 or JSON");
    }
    if (!Array.isArray(parsed)) {
      throw this.invalid("Gold object must contain a JSON array");
    }
    if (parsed.length > this.maxRows) {
      throw this.invalid("Gold dataset exceeds the configured row limit");
    }
    if (
      parsed.some(
        (row: unknown) => row === null || typeof row !== "object" || Array.isArray(row),
      )
    ) {
      throw this.invalid("Gold dataset contains an invalid row");
    }
    return { rows: parsed, bytes };
  }

  private validateTenantRows<T extends TenantRow>(
    rows: unknown[],
    organizationId: string,
  ): T[] {
    for (const row of rows) {
      if ((row as TenantRow).organization_key !== organizationId) {
        // Do not include foreign tenant identifiers or row contents in the error.
        throw this.invalid("Gold dataset contains a row outside the requested organization");
      }
    }
    return rows as T[];
  }

  private latestPartitionSnapshots(files: GoldObject[]): GoldObject[] {
    const latestByDirectory = new Map<string, GoldObject>();
    for (const file of files) {
      const directory = file.key.slice(0, file.key.lastIndexOf("/") + 1);
      const current = latestByDirectory.get(directory);
      if (!current || this.compareObjects(current, file) < 0) {
        latestByDirectory.set(directory, file);
      }
    }
    // A full snapshot alongside child partition snapshots has no reliable merge
    // semantics. Require the producer to choose one layout instead of double count.
    const directories = Array.from(latestByDirectory.keys()).sort();
    for (let index = 1; index < directories.length; index++) {
      if (directories[index].startsWith(directories[index - 1])) {
        throw this.invalid("Gold dataset mixes complete snapshots and nested partitions");
      }
    }
    return Array.from(latestByDirectory.values());
  }

  private readonly compareObjects = (left: GoldObject, right: GoldObject): number =>
    left.modified - right.modified ||
    (left.key < right.key ? -1 : left.key > right.key ? 1 : 0);

  private validateTenantPath(path: string, organizationId: string, prefix: boolean): void {
    if (
      typeof organizationId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(organizationId)
    ) {
      throw this.invalid("A valid organization identifier is required for Gold reads");
    }
    this.validatePath(path, prefix);
    if (
      !path.split("/").some(
        (segment) =>
          segment === organizationId || segment === `organization_id=${organizationId}`,
      )
    ) {
      throw this.invalid("Gold object path is outside the requested organization");
    }
  }

  private validatePath(path: string, prefix: boolean): void {
    if (
      typeof path !== "string" ||
      !path ||
      path.length > 1024 ||
      // eslint-disable-next-line no-control-regex -- Reject controls, whitespace and escape characters in storage keys.
      /[\\\x00-\x20\x7f%]/.test(path) ||
      path.startsWith("/") ||
      (prefix ? !path.endsWith("/") && !path.endsWith(".json") : !path.endsWith(".json")) ||
      path.replace(/\/$/, "").split("/").some(
        (segment) => !segment || segment === "." || segment === "..",
      )
    ) {
      throw this.invalid("Gold reads require a complete safe object key or directory prefix");
    }
  }

  private closeBody(body: unknown): void {
    const stream = body as { destroy?: () => void };
    if (typeof stream?.destroy === "function") {
      try {
        stream.destroy();
      } catch {
        // Cleanup must not conceal the original validation failure.
      }
    }
  }

  private limit(value: number | undefined, fallback: number, ceiling: number, name: string): number {
    const selected = value ?? fallback;
    if (!Number.isSafeInteger(selected) || selected < 1 || selected > ceiling) {
      throw new TypeError(`${name} must be a positive integer no greater than ${ceiling}`);
    }
    return selected;
  }

  private invalid(message: string): UnprocessableEntityException {
    return new UnprocessableEntityException(message);
  }
}
