/**
 * Keycloak Admin Controller
 * Temporary endpoints for admin operations
 */

import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";

@Controller("admin/keycloak")
export class KeycloakAdminController {
  private readonly logger = new Logger(KeycloakAdminController.name);

  constructor(
    private readonly userProfileRepository: PostgresUserProfileRepository,
    @InjectRepository(UserProfileEntity)
    private readonly userProfileEntityRepository: Repository<UserProfileEntity>,
  ) {}

  /**
   * Temporary endpoint to check and update user emails in database
   * TODO: Remove after migration is complete
   */
  @Post("check-and-update-user-emails")
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkAndUpdateUserEmails() {
    this.logger.log("Checking and updating user emails from .com to .ca");

    const updates = [
      { old: "admin@plainledger.com", new: "admin@plainledger.ca" },
      { old: "accountant@plainledger.com", new: "accountant@plainledger.ca" },
      { old: "demo@plainledger.com", new: "demo@plainledger.ca" },
    ];

    const results = [];

    for (const update of updates) {
      try {
        // Check if old email exists
        const oldUser = await this.userProfileEntityRepository.findOne({
          where: { email: update.old },
        });

        if (oldUser) {
          // Update email directly using query builder
          await this.userProfileEntityRepository
            .createQueryBuilder()
            .update(UserProfileEntity)
            .set({ email: update.new })
            .where("id = :id", { id: oldUser.id })
            .execute();

          results.push({
            email: update.old,
            status: "updated",
            id: oldUser.id,
            newEmail: update.new,
          });
          this.logger.log(`Updated ${update.old} → ${update.new}`);
        } else {
          // Check if already updated
          const newUser = await this.userProfileEntityRepository.findOne({
            where: { email: update.new },
          });
          if (newUser) {
            results.push({
              email: update.old,
              status: "already_updated",
              id: newUser.id,
            });
          } else {
            results.push({
              email: update.old,
              status: "not_found",
            });
          }
        }
      } catch (error) {
        this.logger.error(`Failed to update ${update.old}: ${error.message}`);
        results.push({
          email: update.old,
          status: "error",
          error: error.message,
        });
      }
    }

    // List all users with plainledger emails
    const allUsers = await this.userProfileEntityRepository
      .createQueryBuilder("user")
      .where("user.email LIKE :pattern", { pattern: "%@plainledger.%" })
      .orderBy("user.email", "ASC")
      .getMany();

    const userList = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
    }));

    return {
      success: true,
      updates: results,
      totalUsers: userList.length,
      users: userList,
    };
  }
}
