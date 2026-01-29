import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Headers,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";
import { Roles, Public } from "nest-keycloak-connect";
import { GenerateBalanceSheetUseCase } from "@application/use-cases/generate-balance-sheet.use-case";
import { DomainError, EntityNotFoundError } from "@domain/errors/DomainError";
import { IDatalakeDataService } from "@application/ports/outbound/IDatalakeDataService";
import { Inject } from "@nestjs/common";

@Controller("reports")
@ApiTags("reports")
@ApiBearerAuth()
export class ReportController {
  constructor(
    private readonly generateBalanceSheetUseCase: GenerateBalanceSheetUseCase,
    @Inject("IDatalakeDataService")
    private readonly datalakeDataService: IDatalakeDataService,
  ) {}

  @Get(":tenantId/balance-sheet")
  @Roles({ roles: ["admin", "owner", "accountant", "viewer"] })
  @ApiOperation({ summary: "Generate balance sheet report" })
  @ApiQuery({
    name: "asOfDate",
    required: true,
    type: String,
    description: "Date in YYYY-MM-DD format",
  })
  @ApiQuery({ name: "comparisonDate", required: false, type: String })
  @ApiQuery({ name: "locale", required: false, enum: ["en", "fr"] })
  @ApiResponse({ status: 200, description: "Balance sheet generated" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async getBalanceSheet(
    @Param("tenantId") tenantId: string,
    @Query("asOfDate") asOfDate: string,
    @Query("comparisonDate") comparisonDate?: string,
    @Query("locale") locale?: "en" | "fr",
  ) {
    try {
      const asOfDateParsed = new Date(asOfDate);
      if (isNaN(asOfDateParsed.getTime())) {
        throw new BadRequestException(
          "Invalid asOfDate format. Use YYYY-MM-DD",
        );
      }

      let comparisonDateParsed: Date | undefined;
      if (comparisonDate) {
        comparisonDateParsed = new Date(comparisonDate);
        if (isNaN(comparisonDateParsed.getTime())) {
          throw new BadRequestException(
            "Invalid comparisonDate format. Use YYYY-MM-DD",
          );
        }
      }

      return await this.generateBalanceSheetUseCase.execute({
        tenantId,
        asOfDate: asOfDateParsed,
        comparisonDate: comparisonDateParsed,
        locale: locale || "fr",
      });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof DomainError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(":tenantId/income-statement")
  @Roles({ roles: ["admin", "owner", "accountant", "viewer"] })
  @ApiOperation({ summary: "Generate income statement report (placeholder)" })
  @ApiQuery({ name: "startDate", required: true, type: String })
  @ApiQuery({ name: "endDate", required: true, type: String })
  @ApiQuery({ name: "locale", required: false, enum: ["en", "fr"] })
  @ApiResponse({ status: 200, description: "Income statement generated" })
  async getIncomeStatement(
    @Param("tenantId") tenantId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("locale") locale?: "en" | "fr",
  ) {
    // Placeholder - would implement similar to balance sheet
    return {
      message: "Income Statement report - Coming soon",
      tenantId,
      startDate,
      endDate,
      locale: locale || "fr",
    };
  }

  @Get(":tenantId/cash-flow")
  @Roles({ roles: ["admin", "owner", "accountant", "viewer"] })
  @ApiOperation({
    summary: "Generate cash flow statement report (placeholder)",
  })
  @ApiResponse({ status: 200, description: "Cash flow statement generated" })
  async getCashFlowStatement(
    @Param("tenantId") tenantId: string,
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    // Placeholder
    return {
      message: "Cash Flow Statement report - Coming soon",
      tenantId,
      startDate,
      endDate,
    };
  }

  @Post("share")
  @Roles({ roles: ["admin", "owner", "accountant"] })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a shareable link for a report" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        reportId: { type: "string", nullable: true },
        reportType: { type: "string" },
        shareUrl: { type: "string" },
        password: { type: "string", nullable: true },
        expiresIn: {
          type: "string",
          enum: ["1d", "7d", "30d", "90d", "never"],
        },
        allowDownload: { type: "boolean" },
        requireAuth: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Share link created successfully" })
  async createShareLink(
    @Body()
    body: {
      reportId?: string;
      reportType: string;
      shareUrl: string;
      password?: string;
      expiresIn: string;
      allowDownload: boolean;
      requireAuth: boolean;
    },
    @Headers("x-tenant-id") _tenantId?: string,
  ) {
    // Generate share token
    const shareToken = `shr_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (body.expiresIn !== "never") {
      const days = parseInt(body.expiresIn.replace("d", ""));
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // TODO: Save to database - reporting.shared_report_links table
    // For now, return mock response
    return {
      id: `share-${Date.now()}`,
      shareToken,
      shareUrl: body.shareUrl,
      expiresAt: expiresAt?.toISOString(),
      allowDownload: body.allowDownload,
      requireAuth: body.requireAuth,
      createdAt: new Date().toISOString(),
    };
  }

  @Get("share/:shareToken")
  @Public()
  @ApiOperation({ summary: "Get share link details" })
  @ApiResponse({ status: 200, description: "Share link found" })
  @ApiResponse({ status: 404, description: "Share link not found" })
  async getShareLink(@Param("shareToken") shareToken: string) {
    // TODO: Query database for share link
    // For now, return mock response
    return {
      id: `share-123`,
      shareToken,
      shareUrl: `http://localhost:5173/share/report/${shareToken}`,
      expiresAt: null,
      allowDownload: true,
      requireAuth: false,
      isActive: true,
    };
  }

  @Patch("share/:shareToken")
  @Roles({ roles: ["admin", "owner", "accountant"] })
  @ApiOperation({ summary: "Update share link settings" })
  @ApiResponse({ status: 200, description: "Share link updated" })
  async updateShareLink(
    @Param("shareToken") _shareToken: string,
    @Body()
    _body: {
      expiresIn?: string;
      allowDownload?: boolean;
      requireAuth?: boolean;
      isActive?: boolean;
    },
  ) {
    // TODO: Update database
    return {
      success: true,
      message: "Share link updated",
    };
  }

  @Delete("share/:shareToken")
  @Roles({ roles: ["admin", "owner", "accountant"] })
  @ApiOperation({ summary: "Delete a share link" })
  @ApiResponse({ status: 200, description: "Share link deleted" })
  async deleteShareLink(@Param("shareToken") _shareToken: string) {
    // TODO: Delete from database
    return {
      success: true,
      message: "Share link deleted",
    };
  }
}
