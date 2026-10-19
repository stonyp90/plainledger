import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { Readable } from "node:stream";
import { GoldDataReader, GoldDataReaderOptions } from "../gold-data-reader";

const TENANT = "tenant-123";
const PREFIX = `fact_transaction/${TENANT}/`;
const row = (key: string, amount = 10) => ({
  organization_key: TENANT,
  transaction_key: key,
  amount,
});
type Transaction = ReturnType<typeof row>;

describe("GoldDataReader", () => {
  let send: jest.Mock;
  let reader: GoldDataReader;

  function create(options: GoldDataReaderOptions = {}) {
    return new GoldDataReader({ send } as unknown as S3Client, "gold", options);
  }

  function body(value: unknown) {
    const data = Buffer.from(JSON.stringify(value));
    return { Body: Readable.from([data]), ContentLength: data.length };
  }

  function dataset(
    files: { key: string; rows: unknown; modified?: string }[],
  ) {
    send.mockImplementation(async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        return {
          Contents: files.map((file) => ({
            Key: file.key,
            ...(file.modified ? { LastModified: new Date(file.modified) } : {}),
          })),
          IsTruncated: false,
        };
      }
      if (command instanceof GetObjectCommand) {
        const file = files.find((candidate) => candidate.key === command.input.Key);
        if (!file) throw Object.assign(new Error("not found"), { name: "NoSuchKey" });
        return body(file.rows);
      }
      throw new Error("Unexpected command");
    });
  }

  beforeEach(() => {
    send = jest.fn();
    reader = create();
  });

  describe("complete and bounded object listing", () => {
    it("reads beyond the first 1,000 objects and sends the opaque continuation token", async () => {
      const firstPage = Array.from({ length: 1000 }, (_, index) => ({
        Key: `${PREFIX}${String(index).padStart(4, "0")}.json`,
      }));
      send.mockResolvedValueOnce({
        Contents: firstPage,
        IsTruncated: true,
        NextContinuationToken: "opaque-next-token",
      });
      send.mockResolvedValueOnce({
        Contents: [{ Key: `${PREFIX}1000.json` }, { Key: `${PREFIX}_SUCCESS` }],
        IsTruncated: false,
      });
      const keys = await reader.listFiles(PREFIX);
      expect(keys).toHaveLength(1001);
      expect(keys[1000]).toBe(`${PREFIX}1000.json`);
      expect(send.mock.calls[1][0].input).toEqual({
        Bucket: "gold", Prefix: PREFIX, MaxKeys: 1000,
        ContinuationToken: "opaque-next-token",
      });
    });

    it("returns an empty list only when the scoped listing has no files", async () => {
      send.mockResolvedValue({ Contents: [], IsTruncated: false });
      await expect(reader.listFiles(PREFIX)).resolves.toEqual([]);
    });

    it("filters folder markers and non-JSON objects and sorts keys", async () => {
      send.mockResolvedValue({ Contents: [
        { Key: `${PREFIX}b.json` }, { Key: PREFIX },
        { Key: `${PREFIX}_SUCCESS` }, { Key: `${PREFIX}a.json` },
      ] });
      await expect(reader.listFiles(PREFIX)).resolves.toEqual([
        `${PREFIX}a.json`, `${PREFIX}b.json`,
      ]);
    });

    it("does not convert an S3 access failure into an empty dashboard", async () => {
      send.mockRejectedValue(new Error("AccessDenied: sensitive-provider-details"));
      await expect(reader.listFiles(PREFIX)).rejects.toThrow(ServiceUnavailableException);
      await expect(reader.listFiles(PREFIX)).rejects.not.toThrow("sensitive-provider-details");
    });

    it.each([
      { Key: "fact_transaction/another-tenant/secret.json" },
      { Key: "fact_transaction/tenant-123-other/secret.json" },
      { Key: undefined },
    ])("rejects an out-of-scope or malformed listed key %#", async (object) => {
      send.mockResolvedValue({ Contents: [object] });
      await expect(reader.listFiles(PREFIX)).rejects.toThrow(UnprocessableEntityException);
    });

    it.each([undefined, ""])('rejects a truncated page without a continuation token "%s"', async (token) => {
      send.mockResolvedValue({ IsTruncated: true, NextContinuationToken: token });
      await expect(reader.listFiles(PREFIX)).rejects.toThrow("continuation");
    });

    it("detects a repeated continuation token instead of looping", async () => {
      send.mockResolvedValue({ IsTruncated: true, NextContinuationToken: "same" });
      await expect(reader.listFiles(PREFIX)).rejects.toThrow("continuation");
      expect(send).toHaveBeenCalledTimes(2);
    });

    it("fails explicitly if the file limit would truncate the dataset", async () => {
      reader = create({ maxFiles: 1 });
      send.mockResolvedValue({ Contents: [
        { Key: `${PREFIX}a.json` }, { Key: `${PREFIX}b.json` },
      ] });
      await expect(reader.listFiles(PREFIX)).rejects.toThrow("file limit");
    });

    it("bounds endless empty pages even when every token differs", async () => {
      reader = create({ maxFiles: 2 });
      let page = 0;
      send.mockImplementation(async () => ({ IsTruncated: true, NextContinuationToken: String(++page) }));
      await expect(reader.listFiles(PREFIX)).rejects.toThrow("page limit");
      expect(send).toHaveBeenCalledTimes(3);
    });

    it("rejects duplicate listing entries rather than treating a racing listing as complete", async () => {
      send.mockResolvedValue({ Contents: [{ Key: `${PREFIX}a.json` }, { Key: `${PREFIX}a.json` }] });
      await expect(reader.listFiles(PREFIX)).rejects.toThrow("duplicate");
    });

    it.each(["fact_transaction/tenant-123", "../tenant-123/", `${PREFIX}../other/`, `${PREFIX}%2e%2e/`, `/${PREFIX}`, `${PREFIX}\\other/`])(
      "rejects ambiguous or unsafe prefix %s before a storage request", async (prefix) => {
        await expect(reader.listFiles(prefix)).rejects.toThrow(UnprocessableEntityException);
        expect(send).not.toHaveBeenCalled();
      },
    );
  });

  describe("streaming JSON validation", () => {
    it("reads valid UTF-8 split across binary chunks", async () => {
      const data = Buffer.from(JSON.stringify([{ name: "Montréal 🍁" }]));
      send.mockResolvedValue({ Body: Readable.from(Array.from(data, (byte) => Buffer.from([byte]))), ContentLength: data.length });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).resolves.toEqual([{ name: "Montréal 🍁" }]);
    });

    it("preserves a valid empty JSON array", async () => {
      send.mockResolvedValue(body([]));
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).resolves.toEqual([]);
    });

    it.each(["", "{not json}", "null", "{}", "42", '[null]', '[1]', '[[]]']) (
      "rejects malformed or non-row JSON %s", async (text) => {
        send.mockResolvedValue({ Body: Readable.from([Buffer.from(text)]) });
        await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow(UnprocessableEntityException);
      },
    );

    it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
      send.mockResolvedValue({ Body: Readable.from([Buffer.from([0x5b, 0x22, 0xff, 0x22, 0x5d])]) });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("UTF-8");
    });

    it("does not buffer an object whose declared length exceeds the limit", async () => {
      reader = create({ maxObjectBytes: 8 });
      const stream = Readable.from([Buffer.alloc(100)]);
      const destroy = jest.spyOn(stream, "destroy");
      send.mockResolvedValue({ Body: stream, ContentLength: 100 });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("byte limit");
      expect(destroy).toHaveBeenCalled();
    });

    it("enforces the byte limit while streaming without trusting ContentLength", async () => {
      reader = create({ maxObjectBytes: 8 });
      const stream = Readable.from([Buffer.from('[{"a":'), Buffer.from('12345}]')]);
      send.mockResolvedValue({ Body: stream, ContentLength: 2 });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("byte limit");
      expect(stream.destroyed).toBe(true);
    });

    it("rejects a truncated object even if the received bytes happen to be valid JSON", async () => {
      send.mockResolvedValue({ ...body([]), ContentLength: 100 });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("declared size");
    });

    it("rejects a missing body instead of returning no records", async () => {
      send.mockResolvedValue({});
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("empty object body");
    });

    it("reports an interrupted body as unavailable", async () => {
      const stream = Readable.from((async function* () {
        yield Buffer.from("[");
        throw new Error("socket disconnected");
      })());
      send.mockResolvedValue({ Body: stream });
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow(ServiceUnavailableException);
    });

    it("rejects a row count exceeding the configured bound", async () => {
      reader = create({ maxRows: 1 });
      send.mockResolvedValue(body([{}, {}]));
      await expect(reader.fetchJsonFile(`${PREFIX}data.json`)).rejects.toThrow("row limit");
    });
  });

  describe("tenant isolation and canonical snapshots", () => {
    it("reads only the requested tenant's canonical object", async () => {
      send.mockResolvedValue(body([row("one")]));
      await expect(reader.readTenantFile(`${TENANT}/fact_transaction.json`, TENANT)).resolves.toEqual([row("one")]);
      expect(send.mock.calls[0][0].input.Key).toBe(`${TENANT}/fact_transaction.json`);
    });

    it("distinguishes a missing canonical object from a present empty snapshot", async () => {
      send.mockRejectedValueOnce(Object.assign(new Error("missing"), { name: "NoSuchKey" }));
      send.mockResolvedValueOnce(body([]));
      await expect(reader.readTenantFile(`${TENANT}/fact_transaction.json`, TENANT)).resolves.toBeNull();
      await expect(reader.readTenantFile(`${TENANT}/fact_transaction.json`, TENANT)).resolves.toEqual([]);
    });

    it.each([
      { name: "AccessDenied", $metadata: { httpStatusCode: 403 } },
      { name: "NoSuchBucket", $metadata: { httpStatusCode: 404 } },
      { name: "TimeoutError" },
    ])("propagates canonical read failure %s instead of activating a stale fallback", async (error) => {
      send.mockRejectedValue(error);
      await expect(reader.readTenantFile(`${TENANT}/fact_transaction.json`, TENANT)).rejects.toThrow(ServiceUnavailableException);
    });

    it("does not treat disappearance of a listed snapshot as an empty dataset", async () => {
      send.mockResolvedValueOnce({ Contents: [{ Key: `${PREFIX}latest.json` }] });
      send.mockRejectedValueOnce(Object.assign(new Error("gone"), { name: "NoSuchKey" }));
      await expect(reader.readTenantSnapshot(PREFIX, TENANT)).rejects.toThrow(ServiceUnavailableException);
    });

    it.each([
      { transaction_key: "missing-owner" },
      { ...row("foreign"), organization_key: "another-tenant" },
      { ...row("number-owner"), organization_key: 123 },
    ])("rejects an entire snapshot containing a missing or foreign tenant %#", async (invalid) => {
      send.mockResolvedValue(body([row("valid"), invalid]));
      await expect(reader.readTenantFile(`${TENANT}/fact_transaction.json`, TENANT)).rejects.toThrow("outside the requested organization");
    });

    it("rejects a foreign prefix before listing and does not rely only on row filtering", async () => {
      await expect(reader.readTenantSnapshot("dim_account/another-tenant/", TENANT)).rejects.toThrow("path is outside");
      expect(send).not.toHaveBeenCalled();
    });

    it("supports exact organization_id partition segments", async () => {
      dataset([{ key: `dim_account/organization_id=${TENANT}/accounts.json`, rows: [row("a")] }]);
      await expect(reader.readTenantSnapshot(`dim_account/organization_id=${TENANT}/`, TENANT)).resolves.toEqual([row("a")]);
    });

    it("selects the newest complete dimension snapshot by modification time", async () => {
      dataset([
        { key: `${PREFIX}z-old.json`, rows: [row("removed")], modified: "2026-01-01" },
        { key: `${PREFIX}a-current.json`, rows: [row("current")], modified: "2026-02-01" },
      ]);
      await expect(reader.readTenantSnapshot(PREFIX, TENANT)).resolves.toEqual([row("current")]);
    });
  });

  describe("transaction snapshots and partitions", () => {
    it("does not resurrect transactions deleted from the newest full snapshot", async () => {
      dataset([
        { key: `${PREFIX}transactions_2026-01-01.json`, rows: [row("removed"), row("edited", 10)] },
        { key: `${PREFIX}transactions_2026-02-01.json`, rows: [row("edited", 20)] },
      ]);
      await expect(reader.readTenantTransactions<Transaction>(PREFIX, TENANT)).resolves.toEqual([row("edited", 20)]);
      expect(send.mock.calls.filter(([command]) => command instanceof GetObjectCommand)).toHaveLength(1);
    });

    it("honors an empty latest snapshot without reading old financial records", async () => {
      dataset([
        { key: `${PREFIX}a-old.json`, rows: [row("removed")] },
        { key: `${PREFIX}b-new.json`, rows: [] },
      ]);
      await expect(reader.readTenantTransactions<Transaction>(PREFIX, TENANT)).resolves.toEqual([]);
    });

    it("loads every partition beyond the previous five-file cutoff and replaces overlapping stable keys", async () => {
      const files = Array.from({ length: 8 }, (_, index) => ({
        key: `${PREFIX}month=${String(index + 1).padStart(2, "0")}/snapshot.json`,
        rows: [row(`month-${index + 1}`), row("corrected", index)],
        modified: `2026-${String(index + 1).padStart(2, "0")}-01`,
      }));
      dataset(files);
      const transactions = await reader.readTenantTransactions<Transaction>(PREFIX, TENANT);
      expect(transactions).toHaveLength(9);
      expect(transactions.find((transaction) => transaction.transaction_key === "month-1")).toEqual(row("month-1"));
      expect(transactions.find((transaction) => transaction.transaction_key === "corrected")).toEqual(row("corrected", 7));
    });

    it("uses only the latest snapshot inside each partition", async () => {
      dataset([
        { key: `${PREFIX}month=01/a.json`, rows: [row("deleted-in-january")] },
        { key: `${PREFIX}month=01/b.json`, rows: [] },
        { key: `${PREFIX}month=02/a.json`, rows: [row("february")] },
      ]);
      await expect(reader.readTenantTransactions<Transaction>(PREFIX, TENANT)).resolves.toEqual([row("february")]);
    });

    it("rejects mixed full snapshots and child partitions rather than guessing the merge", async () => {
      dataset([
        { key: `${PREFIX}full.json`, rows: [] },
        { key: `${PREFIX}month=01/part.json`, rows: [] },
      ]);
      await expect(reader.readTenantTransactions(PREFIX, TENANT)).rejects.toThrow("mixes complete snapshots");
    });

    it("reads all append-only files only when the caller explicitly selects that layout", async () => {
      dataset([
        { key: `${PREFIX}a.json`, rows: [row("old"), row("edited", 10)] },
        { key: `${PREFIX}b.json`, rows: [row("new"), row("edited", 20)] },
      ]);
      await expect(reader.readTenantTransactions<Transaction>(PREFIX, TENANT, { layout: "append" })).resolves.toEqual([
        row("old"), row("edited", 20), row("new"),
      ]);
    });

    it("bounds total processed rows across partitions before deduplication", async () => {
      reader = create({ maxRows: 2 });
      dataset([
        { key: `${PREFIX}one/a.json`, rows: [row("duplicate"), row("a")] },
        { key: `${PREFIX}two/a.json`, rows: [row("duplicate")] },
      ]);
      await expect(reader.readTenantTransactions(PREFIX, TENANT)).rejects.toThrow("row limit");
    });

    it("bounds cumulative bytes across many individually small partition objects", async () => {
      const rows = [row("same")];
      const size = Buffer.byteLength(JSON.stringify(rows));
      reader = create({ maxDatasetBytes: size + 1 });
      dataset([
        { key: `${PREFIX}one/a.json`, rows },
        { key: `${PREFIX}two/a.json`, rows },
      ]);
      await expect(reader.readTenantTransactions(PREFIX, TENANT)).rejects.toThrow("byte limit");
    });

    it.each(["", " ", " padded ", undefined, 12])("rejects missing or malformed stable transaction key %s", async (key) => {
      dataset([{ key: `${PREFIX}a.json`, rows: [{ ...row("a"), transaction_key: key }] }]);
      await expect(reader.readTenantTransactions(PREFIX, TENANT)).rejects.toThrow("stable transaction key");
    });

    it("rejects duplicate keys within one authoritative snapshot", async () => {
      dataset([{ key: `${PREFIX}a.json`, rows: [row("duplicate", 10), row("duplicate", 20)] }]);
      await expect(reader.readTenantTransactions(PREFIX, TENANT)).rejects.toThrow("duplicate transaction keys");
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER])(
    "rejects unbounded or invalid configured limits %s", (value) => {
      expect(() => create({ maxFiles: value })).toThrow(TypeError);
      expect(() => create({ maxRows: value })).toThrow(TypeError);
      expect(() => create({ maxObjectBytes: value })).toThrow(TypeError);
      expect(() => create({ maxDatasetBytes: value })).toThrow(TypeError);
    },
  );
});
