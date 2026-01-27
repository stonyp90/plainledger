import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { IAccountRepository } from "@application/ports/outbound/IAccountRepository";
import { Account, AccountType, AccountSubtype } from "@domain/entities/Account";
import { AccountCode } from "@domain/value-objects/AccountCode";
import { AccountEntity } from "./entities/account.entity";

/**
 * PostgreSQL implementation of IAccountRepository
 */
@Injectable()
export class PostgresAccountRepository implements IAccountRepository {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly repository: Repository<AccountEntity>,
  ) {}

  async findById(id: string): Promise<Account | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCode(
    organizationId: string,
    code: AccountCode,
  ): Promise<Account | null> {
    const entity = await this.repository.findOne({
      where: { organizationId, code: code.value },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      accountType?: AccountType;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Account[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("account")
      .where("account.organization_id = :organizationId", { organizationId });

    if (options?.accountType) {
      queryBuilder.andWhere("account.account_type = :accountType", {
        accountType: options.accountType,
      });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere("account.is_active = :isActive", {
        isActive: options.isActive,
      });
    }

    queryBuilder
      .orderBy("account.display_order", "ASC")
      .addOrderBy("account.code", "ASC")
      .take(options?.limit || 1000)
      .skip(options?.offset || 0);

    const entities = await queryBuilder.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findByTypes(
    organizationId: string,
    types: AccountType[],
  ): Promise<Account[]> {
    const entities = await this.repository.find({
      where: {
        organizationId,
        accountType: In(types),
        isActive: true,
      },
      order: {
        displayOrder: "ASC",
        code: "ASC",
      },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(account: Account): Promise<void> {
    const entity = this.toEntity(account);
    await this.repository.save(entity);
  }

  async saveMany(accounts: Account[]): Promise<void> {
    const entities = accounts.map((a) => this.toEntity(a));
    await this.repository.save(entities);
  }

  async update(account: Account): Promise<void> {
    const entity = this.toEntity(account);
    await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async existsByCode(
    organizationId: string,
    code: AccountCode,
  ): Promise<boolean> {
    const count = await this.repository.count({
      where: { organizationId, code: code.value },
    });
    return count > 0;
  }

  /**
   * Map database entity to domain entity
   */
  private toDomain(entity: AccountEntity): Account {
    return Account.fromPersistence({
      id: entity.id,
      organizationId: entity.organizationId,
      code: AccountCode.fromPersistence(entity.code),
      name: entity.name,
      nameFr: entity.nameFr,
      accountType: entity.accountType as AccountType,
      accountSubtype: entity.accountSubtype as AccountSubtype,
      parentAccountId: entity.parentAccountId,
      isActive: entity.isActive,
      isSystem: entity.isSystem,
      displayOrder: entity.displayOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * Map domain entity to database entity
   */
  private toEntity(account: Account): AccountEntity {
    const entity = new AccountEntity();
    entity.id = account.id;
    entity.organizationId = account.organizationId;
    entity.code = account.code.value;
    entity.name = account.name;
    entity.nameFr = account.nameFr;
    entity.accountType = account.accountType;
    entity.accountSubtype = account.accountSubtype;
    entity.parentAccountId = account.parentAccountId;
    entity.isActive = account.isActive;
    entity.isSystem = account.isSystem;
    entity.displayOrder = account.displayOrder;
    entity.createdAt = account.createdAt;
    entity.updatedAt = account.updatedAt;
    return entity;
  }
}
