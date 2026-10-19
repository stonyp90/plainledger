import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { IsString, IsOptional, Length, IsInt, Min, Max, Matches } from "class-validator";
import { CreateClaimedTenant, TenantGuard } from "../../auth/tenant.guard";
import { Roles } from "nest-keycloak-connect";
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import { GetOrganizationUseCase } from "@application/use-cases/get-organization.use-case";

class CreateOrganizationDto {
  @IsString()
  @Length(1, 100)
  tenantId: string;
  @IsString()
  @Length(1, 255)
  name: string;
  @IsOptional()
  @IsString()
  @Length(1, 255)
  legalName?: string;
  @IsOptional()
  @IsString()
  @Length(1, 50)
  taxNumber?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEndMonth?: number;
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
  @IsOptional()
  @IsString()
  @Length(1, 100)
  industry?: string;
}

@Controller("organizations")
@ApiTags("organizations")
@ApiBearerAuth()
export class OrganizationController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
  ) {}

  @Post()
  @UseGuards(TenantGuard)
  @CreateClaimedTenant()
  @Roles({ roles: ["admin", "owner"] })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new organization" })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: "Organization created successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  @ApiResponse({ status: 409, description: "Organization already exists" })
  async create(@Body() dto: CreateOrganizationDto) {
    return await this.createOrganizationUseCase.execute(dto);
  }

  @Get(":tenantId")
  @UseGuards(TenantGuard)
  @Roles({ roles: ["admin", "owner", "accountant", "viewer"] })
  @ApiOperation({ summary: "Get organization by tenant ID" })
  @ApiResponse({ status: 200, description: "Organization found" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async findOne(@Param("tenantId") tenantId: string) {
    return await this.getOrganizationUseCase.execute({ tenantId });
  }
}
