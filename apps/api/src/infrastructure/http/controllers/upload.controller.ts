/**
 * Upload Controller
 *
 * Handles file uploads for logos, profile pictures, and other assets.
 *
 * Authentication is handled by the global Keycloak AuthGuard.
 * Role-based access for logo endpoints is enforced by @Roles().
 */
/// <reference types="multer" />

import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Roles } from "nest-keycloak-connect";
import {
  FileStorageService,
  UploadResult,
} from "@infrastructure/storage/file-storage.service";
import { SettingsService } from "@infrastructure/services/settings.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OrganizationEntity } from "@infrastructure/persistence/postgres/entities/organization.entity";
import { Request } from "express";

interface UserInfo {
  sub: string; // User ID from Keycloak or mock
  email?: string;
  preferred_username?: string;
  organization?: string;
  tenant_id?: string;
}

interface AuthenticatedRequest extends Request {
  user?: UserInfo;
}

@Controller("uploads")
@ApiTags("uploads")
@ApiBearerAuth()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  /**
   * Upload organization logo
   */
  @Post("logo/:tenantId")
  @Roles({ roles: ["admin", "owner"] })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload organization logo" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Logo image file (JPG, PNG, GIF, WebP)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Logo uploaded successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        url: { type: "string" },
        key: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid file" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Param("tenantId") tenantId: string,
    @Req() _req: AuthenticatedRequest,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate the image
    const validation = this.fileStorageService.validateImage(
      file.buffer,
      file.mimetype,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // TODO: Verify user has access to this tenant
    // For now, we trust the Keycloak roles

    const result = await this.fileStorageService.uploadLogo(
      file.buffer,
      tenantId,
      file.mimetype,
    );

    if (!result.success) {
      throw new BadRequestException(result.error || "Failed to upload logo");
    }

    // Save logo URL to organization settings
    try {
      // Get organization ID from tenant ID
      const org = await this.organizationRepository.findOne({
        where: { tenantId },
      });
      
      if (org?.id) {
        // Get current branding settings
        const currentSettings = await this.settingsService.getOrganizationSettings(org.id);
        const currentBranding = currentSettings?.brandingSettings || {};
        
        // Update branding with new logo URL
        await this.settingsService.updateOrganizationBranding(org.id, {
          ...currentBranding,
          logo: result.url,
        });
        
        this.logger.log(`Logo URL saved to organization settings: ${org.id}`);
      } else {
        this.logger.warn(`Organization not found for tenantId: ${tenantId}`);
      }
    } catch (error) {
      // Log but don't fail the upload if settings update fails
      this.logger.warn(`Failed to save logo URL to settings: ${error.message}`);
    }

    return result;
  }

  /**
   * Delete organization logo
   */
  @Delete("logo/:tenantId")
  @Roles({ roles: ["admin", "owner"] })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete organization logo" })
  @ApiResponse({ status: 200, description: "Logo deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async deleteLogo(
    @Param("tenantId") tenantId: string,
    @Req() _req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // Try to delete common image formats
    const extensions = ["png", "jpg", "gif", "webp"];
    let deleted = false;

    for (const ext of extensions) {
      const key = `logos/${tenantId}/logo.${ext}`;
      const result = await this.fileStorageService.deleteFile(key);
      if (result) deleted = true;
    }

    // Clear logo URL from organization settings
    try {
      const org = await this.organizationRepository.findOne({
        where: { tenantId },
      });
      
      if (org?.id) {
        const currentSettings = await this.settingsService.getOrganizationSettings(org.id);
        const currentBranding = currentSettings?.brandingSettings || {};
        
        // Remove logo from branding settings
        await this.settingsService.updateOrganizationBranding(org.id, {
          ...currentBranding,
          logo: undefined,
        });
        
        this.logger.log(`Logo URL cleared from organization settings: ${org.id}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clear logo URL from settings: ${error.message}`);
    }

    return { success: deleted };
  }

  /**
   * Upload user profile picture
   */
  @Post("profile-picture")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload user profile picture" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Profile picture image (JPG, PNG, GIF, WebP)",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Profile picture uploaded successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        url: { type: "string" },
        key: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid file" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException(
        "User ID not found in token - please login again",
      );
    }

    // Validate the image
    const validation = this.fileStorageService.validateImage(
      file.buffer,
      file.mimetype,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const result = await this.fileStorageService.uploadProfilePicture(
      file.buffer,
      userId,
      file.mimetype,
    );

    if (!result.success) {
      throw new BadRequestException(
        result.error || "Failed to upload profile picture",
      );
    }

    this.logger.log(`Profile picture uploaded for user: ${userId}`);

    return result;
  }

  /**
   * Delete user profile picture
   */
  @Delete("profile-picture")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete user profile picture" })
  @ApiResponse({
    status: 200,
    description: "Profile picture deleted successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async deleteProfilePicture(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException(
        "User ID not found in token - please login again",
      );
    }

    // Try to delete common image formats
    const extensions = ["png", "jpg", "gif", "webp"];
    let deleted = false;

    for (const ext of extensions) {
      const key = `avatars/${userId}/avatar.${ext}`;
      const result = await this.fileStorageService.deleteFile(key);
      if (result) deleted = true;
    }

    return { success: deleted };
  }
}
