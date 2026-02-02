/**
 * HubSpot Service Tests
 * Tests for HubSpot CRM integration
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { HubSpotAdapter } from "../hubspot.adapter";

// ============================================================================
// Mocks
// ============================================================================

const mockHubSpotClient = {
  crm: {
    contacts: {
      basicApi: {
        create: jest.fn().mockResolvedValue({ id: "contact-123" }),
        update: jest.fn().mockResolvedValue({ id: "contact-123" }),
      },
      searchApi: {
        doSearch: jest.fn().mockResolvedValue({ results: [] }),
      },
    },
    deals: {
      basicApi: {
        create: jest.fn().mockResolvedValue({ id: "deal-123" }),
        update: jest.fn().mockResolvedValue({ id: "deal-123" }),
      },
    },
    associations: {
      v4: {
        basicApi: {
          create: jest.fn().mockResolvedValue({}),
        },
      },
    },
    properties: {
      coreApi: {
        create: jest.fn().mockResolvedValue({}),
      },
    },
  },
};

jest.mock("@hubspot/api-client", () => ({
  Client: jest.fn().mockImplementation(() => mockHubSpotClient),
}));

// ============================================================================
// HubSpotAdapter Tests
// ============================================================================

describe("HubSpotAdapter", () => {
  let service: HubSpotAdapter;
  let configService: ConfigService;

  describe("with access token configured", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HubSpotAdapter,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === "HUBSPOT_ACCESS_TOKEN") return "pat-test-token";
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<HubSpotAdapter>(HubSpotAdapter);
      configService = module.get<ConfigService>(ConfigService);

      // Initialize the service
      await service.onModuleInit();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe("isEnabled", () => {
      it("should return true when token is configured", () => {
        expect(service.isEnabled()).toBe(true);
      });
    });

    describe("upsertContact", () => {
      it("should create a new contact when not found", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [],
          },
        );

        const contactId = await service.upsertContact({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          company: "Test Corp",
        });

        expect(
          mockHubSpotClient.crm.contacts.searchApi.doSearch,
        ).toHaveBeenCalled();
        expect(
          mockHubSpotClient.crm.contacts.basicApi.create,
        ).toHaveBeenCalledWith({
          properties: expect.objectContaining({
            email: "test@example.com",
            firstname: "John",
            lastname: "Doe",
            company: "Test Corp",
          }),
        });
        expect(contactId).toBe("contact-123");
      });

      it("should update an existing contact when found", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [
              {
                id: "existing-contact-123",
                properties: { email: "test@example.com" },
              },
            ],
          },
        );

        const contactId = await service.upsertContact({
          email: "test@example.com",
          firstName: "Jane",
        });

        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalledWith("existing-contact-123", expect.any(Object));
        expect(contactId).toBe("existing-contact-123");
      });

      it("should handle custom PlainLedger properties", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [],
          },
        );

        await service.upsertContact({
          email: "test@example.com",
          plainledgerId: "user-123",
          organizationId: "org-456",
          subscriptionTier: "pro",
          connectedSources: 2,
        });

        expect(
          mockHubSpotClient.crm.contacts.basicApi.create,
        ).toHaveBeenCalledWith({
          properties: expect.objectContaining({
            plainledger_id: "user-123",
            plainledger_org_id: "org-456",
            plainledger_tier: "pro",
            plainledger_connected_sources: "2",
          }),
        });
      });
    });

    describe("updateLifecycleStage", () => {
      it("should update contact lifecycle stage", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );

        await service.updateLifecycleStage("test@example.com", "activated");

        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalledWith("contact-123", {
          properties: {
            lifecyclestage: "marketingqualifiedlead", // activated maps to this
          },
        });
      });

      it("should handle contact not found", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [],
          },
        );

        // Should not throw
        await expect(
          service.updateLifecycleStage("notfound@example.com", "activated"),
        ).resolves.not.toThrow();
      });
    });

    describe("getContact", () => {
      it("should return contact data when found", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [
              {
                id: "contact-123",
                properties: {
                  email: "test@example.com",
                  firstname: "John",
                  lastname: "Doe",
                  company: "Test Corp",
                  lifecyclestage: "customer",
                },
              },
            ],
          },
        );

        const contact = await service.getContact("test@example.com");

        expect(contact).toEqual({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          company: "Test Corp",
          phone: undefined,
          website: undefined,
          industry: undefined,
          lifecycleStage: "customer",
        });
      });

      it("should return null when contact not found", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [],
          },
        );

        const contact = await service.getContact("notfound@example.com");
        expect(contact).toBeNull();
      });
    });

    describe("createDeal", () => {
      it("should create a deal", async () => {
        const dealId = await service.createDeal({
          dealName: "Test Deal",
          dealStage: "qualifiedtobuy",
          amount: 99,
        });

        expect(
          mockHubSpotClient.crm.deals.basicApi.create,
        ).toHaveBeenCalledWith({
          properties: expect.objectContaining({
            dealname: "Test Deal",
            dealstage: "qualifiedtobuy",
            amount: "99",
          }),
        });
        expect(dealId).toBe("deal-123");
      });

      it("should associate deal with contact", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );

        await service.createDeal(
          {
            dealName: "Test Deal",
            dealStage: "qualifiedtobuy",
          },
          "test@example.com",
        );

        expect(
          mockHubSpotClient.crm.associations.v4.basicApi.create,
        ).toHaveBeenCalledWith(
          "deals",
          "deal-123",
          "contacts",
          "contact-123",
          expect.any(Array),
        );
      });
    });

    describe("syncSignup", () => {
      it("should sync signup to HubSpot", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [],
          },
        );

        await service.syncSignup({
          id: "user-123",
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          organizationId: "org-456",
          organizationName: "New Org",
        });

        expect(
          mockHubSpotClient.crm.contacts.basicApi.create,
        ).toHaveBeenCalledWith({
          properties: expect.objectContaining({
            email: "newuser@example.com",
            firstname: "New",
            lastname: "User",
            company: "New Org",
            lifecyclestage: "subscriber",
            plainledger_id: "user-123",
            plainledger_org_id: "org-456",
            plainledger_tier: "free",
          }),
        });
      });
    });

    describe("syncActivation", () => {
      it("should sync activation to HubSpot", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );

        await service.syncActivation("test@example.com", 2);

        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalledWith("contact-123", {
          properties: expect.objectContaining({
            lifecyclestage: "marketingqualifiedlead",
            plainledger_connected_sources: "2",
          }),
        });
      });
    });

    describe("syncTrialStart", () => {
      it("should sync trial start and create deal", async () => {
        // First call for updateLifecycleStage
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );
        // Second call for createDeal association
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );

        const trialEndDate = new Date("2026-02-15");

        await service.syncTrialStart({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          tier: "pro",
          trialEndDate,
        });

        // Should update lifecycle stage
        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalled();

        // Should create deal
        expect(
          mockHubSpotClient.crm.deals.basicApi.create,
        ).toHaveBeenCalledWith({
          properties: expect.objectContaining({
            dealname: expect.stringContaining("Test User"),
            dealstage: "qualifiedtobuy",
            plainledger_tier: "pro",
          }),
        });
      });
    });

    describe("syncConversion", () => {
      it("should sync conversion to HubSpot", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch
          .mockResolvedValueOnce({ results: [{ id: "contact-123" }] })
          .mockResolvedValueOnce({ results: [{ id: "contact-123" }] });

        await service.syncConversion({
          email: "test@example.com",
          tier: "premium",
          amount: 199,
          billingCycle: "yearly",
        });

        // Should update lifecycle stage to customer
        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalledWith(
          "contact-123",
          expect.objectContaining({
            properties: expect.objectContaining({
              lifecyclestage: "customer",
            }),
          }),
        );
      });
    });

    describe("syncChurn", () => {
      it("should sync churn to HubSpot", async () => {
        mockHubSpotClient.crm.contacts.searchApi.doSearch.mockResolvedValueOnce(
          {
            results: [{ id: "contact-123" }],
          },
        );

        await service.syncChurn("test@example.com", "Too expensive");

        expect(
          mockHubSpotClient.crm.contacts.basicApi.update,
        ).toHaveBeenCalledWith("contact-123", {
          properties: {
            lifecyclestage: "other", // churned maps to 'other'
          },
        });
      });
    });
  });

  describe("without access token configured", () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          HubSpotAdapter,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        ],
      }).compile();

      service = module.get<HubSpotAdapter>(HubSpotAdapter);
      await service.onModuleInit();
    });

    it("should return false for isEnabled", () => {
      expect(service.isEnabled()).toBe(false);
    });

    it("should gracefully handle upsertContact", async () => {
      const result = await service.upsertContact({
        email: "test@example.com",
      });
      expect(result).toBeNull();
    });

    it("should gracefully handle getContact", async () => {
      const result = await service.getContact("test@example.com");
      expect(result).toBeNull();
    });

    it("should gracefully handle createDeal", async () => {
      const result = await service.createDeal({
        dealName: "Test",
        dealStage: "test",
      });
      expect(result).toBeNull();
    });
  });
});
