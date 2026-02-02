import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmbeddingService } from "../embedding.service";
import OpenAI from "openai";

// Mock OpenAI
jest.mock("openai");

describe("EmbeddingService", () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "OPENAI_API_KEY") return "test-api-key";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("isAvailable", () => {
    it("should return true when OpenAI is configured", () => {
      expect(service.isAvailable()).toBe(true);
    });

    it("should return false when OpenAI is not configured", async () => {
      const moduleWithoutKey = await Test.createTestingModule({
        providers: [
          EmbeddingService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const serviceWithoutKey =
        moduleWithoutKey.get<EmbeddingService>(EmbeddingService);
      expect(serviceWithoutKey.isAvailable()).toBe(false);
    });
  });

  describe("generateEmbedding", () => {
    it("should generate embedding for text", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResponse = {
        data: [
          {
            embedding: mockEmbedding,
          },
        ],
      };

      const mockInstance = {
        embeddings: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockInstance as any,
      );

      // Recreate service with mocked OpenAI
      const module = await Test.createTestingModule({
        providers: [
          EmbeddingService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "OPENAI_API_KEY") return "test-api-key";
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<EmbeddingService>(EmbeddingService);
      const result = await testService.generateEmbedding("test text");

      expect(result).toEqual(mockEmbedding);
      expect(mockInstance.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: "test text",
        dimensions: 1536,
      });
    });

    it("should throw error for empty text", async () => {
      await expect(service.generateEmbedding("")).rejects.toThrow(
        "Text cannot be empty",
      );
    });
  });

  describe("batchGenerateEmbeddings", () => {
    it("should generate embeddings for multiple texts", async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
      ];
      const mockResponse = {
        data: mockEmbeddings.map((emb) => ({ embedding: emb })),
      };

      const mockInstance = {
        embeddings: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockInstance as any,
      );

      const module = await Test.createTestingModule({
        providers: [
          EmbeddingService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "OPENAI_API_KEY") return "test-api-key";
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<EmbeddingService>(EmbeddingService);
      const result = await testService.batchGenerateEmbeddings([
        "text 1",
        "text 2",
      ]);

      expect(result).toEqual(mockEmbeddings);
      expect(mockInstance.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: ["text 1", "text 2"],
        dimensions: 1536,
      });
    });

    it("should filter out empty texts", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResponse = {
        data: [{ embedding: mockEmbedding }],
      };

      const mockInstance = {
        embeddings: {
          create: jest.fn().mockResolvedValue(mockResponse),
        },
      };

      (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
        () => mockInstance as any,
      );

      const module = await Test.createTestingModule({
        providers: [
          EmbeddingService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "OPENAI_API_KEY") return "test-api-key";
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const testService = module.get<EmbeddingService>(EmbeddingService);
      const result = await testService.batchGenerateEmbeddings([
        "valid text",
        "",
        "  ",
      ]);

      expect(result).toHaveLength(1);
      expect(mockInstance.embeddings.create).toHaveBeenCalledWith({
        model: "text-embedding-3-small",
        input: ["valid text"],
        dimensions: 1536,
      });
    });
  });

  describe("embedding text generation", () => {
    it("should generate account embedding text", () => {
      const text = service.generateAccountEmbeddingText(
        "Office Supplies",
        "Expense",
        "6100",
      );
      expect(text).toContain("Office Supplies");
      expect(text).toContain("Code: 6100");
      expect(text).toContain("Type: Expense");
    });

    it("should generate transaction embedding text", () => {
      const text = service.generateTransactionEmbeddingText(
        "Office supplies purchase",
        "Monthly office supplies",
        "INV-123",
      );
      expect(text).toContain("Office supplies purchase");
      expect(text).toContain("Memo: Monthly office supplies");
      expect(text).toContain("Ref: INV-123");
    });
  });

  describe("vector string conversion", () => {
    it("should convert embedding to vector string", () => {
      const embedding = [0.1, 0.2, 0.3];
      const vectorString = service.embeddingToVectorString(embedding);
      expect(vectorString).toBe("[0.1,0.2,0.3]");
    });

    it("should parse vector string to embedding", () => {
      const vectorString = "[0.1,0.2,0.3]";
      const embedding = service.vectorStringToEmbedding(vectorString);
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
