import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Query, Resolver } from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { DomainError, EntityNotFoundError } from "@domain/errors/DomainError";
import { GraphQLModule } from "@infrastructure/graphql/graphql.module";
import { CorsExceptionFilter } from "../cors-exception.filter";
import { DomainExceptionFilter } from "../domain-exception.filter";

interface GraphQLResponse {
  data?: unknown;
  errors?: Array<{ message: string; extensions: { code: string } }>;
}

@Resolver()
class ErrorResolver {
  @Query(() => String)
  unauthenticated(): string {
    throw new UnauthorizedException("Invalid or expired token");
  }

  @Query(() => String)
  forbidden(): string {
    throw new ForbiddenException("Organization access denied");
  }

  @Query(() => String)
  invalidInput(): string {
    throw new BadRequestException("Invalid report period");
  }

  @Query(() => String)
  invalidDomainOperation(): string {
    throw new DomainError("Report dates are out of order");
  }
}

@Controller("exception-probe")
class ErrorController {
  @Get("missing")
  missing(): never {
    throw new EntityNotFoundError("Organization", "missing-org");
  }

  @Get("unauthenticated")
  unauthenticated(): never {
    throw new UnauthorizedException("Invalid or expired token");
  }
}

describe("Exception filters across GraphQL and HTTP transports", () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLModule],
      providers: [ErrorResolver],
      controllers: [ErrorController],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => key === "NODE_ENV" ? "production" : undefined,
      })
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new CorsExceptionFilter(), new DomainExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ["unauthenticated", "UNAUTHENTICATED", "Invalid or expired token"],
    ["forbidden", "FORBIDDEN", "Organization access denied"],
    ["invalidInput", "BAD_REQUEST", "Invalid report period"],
    ["invalidDomainOperation", "BAD_REQUEST", "Report dates are out of order"],
  ])("preserves %s errors for Apollo", async (field, code, message) => {
    const response = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ ${field} }` }),
    });
    expect(response.status).toBe(200);
    const result = await response.json() as GraphQLResponse;

    expect(result.data).toBeNull();
    expect(result.errors).toEqual([
      { message, path: [field], extensions: { code } },
    ]);
  });

  it("maps HTTP domain errors before the catch-all filter", async () => {
    const response = await fetch(`${baseUrl}/exception-probe/missing`);
    expect(response.status).toBe(404);

    expect(await response.json()).toMatchObject({
      statusCode: 404,
      message: "Organization with id 'missing-org' not found",
      error: "EntityNotFoundError",
    });
  });

  it("retains CORS headers on HTTP authentication failures", async () => {
    const response = await fetch(`${baseUrl}/exception-probe/unauthenticated`, {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(response.status).toBe(401);

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(await response.json()).toMatchObject({ message: "Invalid or expired token" });
  });
});
