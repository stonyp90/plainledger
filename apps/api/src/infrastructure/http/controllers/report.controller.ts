import {
  Controller,
  Get,
  Query,
  Param,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { GenerateBalanceSheetUseCase } from '@application/use-cases/generate-balance-sheet.use-case';
import { DomainError, EntityNotFoundError } from '@domain/errors/DomainError';

@Controller('reports')
@ApiTags('reports')
@ApiBearerAuth()
export class ReportController {
  constructor(
    private readonly generateBalanceSheetUseCase: GenerateBalanceSheetUseCase,
  ) {}

  @Get(':tenantId/balance-sheet')
  @Roles({ roles: ['admin', 'owner', 'accountant', 'viewer'] })
  @ApiOperation({ summary: 'Generate balance sheet report' })
  @ApiQuery({ name: 'asOfDate', required: true, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'comparisonDate', required: false, type: String })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'fr'] })
  @ApiResponse({ status: 200, description: 'Balance sheet generated' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getBalanceSheet(
    @Param('tenantId') tenantId: string,
    @Query('asOfDate') asOfDate: string,
    @Query('comparisonDate') comparisonDate?: string,
    @Query('locale') locale?: 'en' | 'fr',
  ) {
    try {
      const asOfDateParsed = new Date(asOfDate);
      if (isNaN(asOfDateParsed.getTime())) {
        throw new BadRequestException('Invalid asOfDate format. Use YYYY-MM-DD');
      }

      let comparisonDateParsed: Date | undefined;
      if (comparisonDate) {
        comparisonDateParsed = new Date(comparisonDate);
        if (isNaN(comparisonDateParsed.getTime())) {
          throw new BadRequestException('Invalid comparisonDate format. Use YYYY-MM-DD');
        }
      }

      return await this.generateBalanceSheetUseCase.execute({
        tenantId,
        asOfDate: asOfDateParsed,
        comparisonDate: comparisonDateParsed,
        locale: locale || 'fr',
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

  @Get(':tenantId/income-statement')
  @Roles({ roles: ['admin', 'owner', 'accountant', 'viewer'] })
  @ApiOperation({ summary: 'Generate income statement report (placeholder)' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'locale', required: false, enum: ['en', 'fr'] })
  @ApiResponse({ status: 200, description: 'Income statement generated' })
  async getIncomeStatement(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('locale') locale?: 'en' | 'fr',
  ) {
    // Placeholder - would implement similar to balance sheet
    return {
      message: 'Income Statement report - Coming soon',
      tenantId,
      startDate,
      endDate,
      locale: locale || 'fr',
    };
  }

  @Get(':tenantId/cash-flow')
  @Roles({ roles: ['admin', 'owner', 'accountant', 'viewer'] })
  @ApiOperation({ summary: 'Generate cash flow statement report (placeholder)' })
  @ApiResponse({ status: 200, description: 'Cash flow statement generated' })
  async getCashFlowStatement(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Placeholder
    return {
      message: 'Cash Flow Statement report - Coming soon',
      tenantId,
      startDate,
      endDate,
    };
  }
}
