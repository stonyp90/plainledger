import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { AccountType } from '@domain/entities/Account';
import { LedgerAccountTotal, LedgerTotals } from '@application/ports/outbound/ILedgerReportRepository';

export function validateReportDates(endDate: Date, startDate?: Date): void {
  if (!(endDate instanceof Date) || !Number.isFinite(endDate.getTime()) ||
    (startDate !== undefined && (!(startDate instanceof Date) || !Number.isFinite(startDate.getTime()) || startDate > endDate))) {
    throw new BadRequestException('Provide valid report dates with start date on or before end date');
  }
}

export function requirePostedLedger(totals: LedgerTotals): void {
  if (!totals.hasPostedEntries) {
    throw new UnprocessableEntityException('Financial report unavailable: no posted journal entries have been imported for this organization');
  }
}

export function normalBalanceCents(account: LedgerAccountTotal): number {
  return account.accountType === AccountType.ASSET || account.accountType === AccountType.EXPENSE
    ? account.debitCents - account.creditCents : account.creditCents - account.debitCents;
}

export function sumCents(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) throw new UnprocessableEntityException('Report total exceeds supported monetary precision');
  return total;
}
