import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { validateReportDates } from '@application/use-cases/financial-report-validation';

export function authenticatedOrganization(context?: { req?: { user?: { organizationId?: string } } }): string {
  const organization = context?.req?.user?.organizationId;
  if (typeof organization !== 'string' || !organization.trim()) throw new UnauthorizedException('An authenticated organization is required');
  return organization;
}

export function reportPagination(pagination?: { page?: number; pageSize?: number }): { page: number; pageSize: number } {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 20;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 250 ||
      !Number.isSafeInteger((page - 1) * pageSize)) {
    throw new BadRequestException('Page must be a positive integer and pageSize must be between 1 and 250');
  }
  return { page, pageSize };
}

export function parseReportDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Use a valid YYYY-MM-DD date');
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Use a valid YYYY-MM-DD date');
  return date;
}

export function validateFinancialFilter(filter?: {
  search?: string; minAmount?: number; maxAmount?: number;
  dateRange?: { startDate: Date; endDate: Date };
}): void {
  if (filter?.search !== undefined && (typeof filter.search !== 'string' || filter.search.length > 200)) {
    throw new BadRequestException('Search text must contain at most 200 characters');
  }
  for (const value of [filter?.minAmount, filter?.maxAmount]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new BadRequestException('Amount bounds must be finite and nonnegative');
  }
  if (filter?.minAmount !== undefined && filter?.maxAmount !== undefined && filter.minAmount > filter.maxAmount) {
    throw new BadRequestException('Minimum amount cannot exceed maximum amount');
  }
  if (filter?.dateRange) validateReportDates(filter.dateRange.endDate, filter.dateRange.startDate);
}
