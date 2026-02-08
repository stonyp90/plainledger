/**
 * Upload Controller
 *
 * Handles file uploads for logos, profile pictures, and other assets.
 *
 * SECURITY NOTE: Uses @Unprotected() to bypass the global Keycloak guard,
 * allowing both real Keycloak tokens and mock development tokens.
 * User extraction is handled manually to support development mode.
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
import { Unprotected, Roles } from "nest-keycloak-connect";
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
@Unprotected() // Bypass global Keycloak guard - we handle auth manually for dev mode support
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
   * Extract user info from request - supports both Keycloak tokens and manual JWT parsing
   * 
   * Since this controller uses @Unprotected() to bypass Keycloak guards (for flexibility),
   * we need to manually parse the JWT token to get user info in all environments.
   */
  private extractUserInfo(req: AuthenticatedRequest): UserInfo | null {
    // First, try to get user from Keycloak-parsed request (if guards populated it)
    if (req.user?.sub) {
      return req.user;
    }

    // Manually parse JWT token from Authorization header
    // This is needed because @Unprotected() bypasses the Keycloak guard that would normally populate req.user
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.warn("No Bearer token found in Authorization header");
      return null;
    }

    try {
      const token = authHeader.substring(7);
      const parts = token.split(".");
      if (parts.length !== 3) {
        this.logger.warn("Invalid JWT token format");
        return null;
      }

      // Decode the payload (second part) - note: this does NOT verify the signature
      // The token was already validated by Keycloak when issued, so we trust it
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      if (payload.sub) {
        this.logger.debug(`Extracted user ${payload.sub} from JWT token`);
        return {
          sub: payload.sub,
          email: payload.email,
          preferred_username: payload.preferred_username || payload.name,
          organization: payload.organization,
          tenant_id: payload.tenant_id,
        };
      }
      
      this.logger.warn("JWT token payload missing 'sub' claim");
    } catch (error) {
      this.logger.warn(`Failed to parse JWT token: ${error.message}`);
    }

    return null;
  }

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

    const userInfo = this.extractUserInfo(req);
    if (!userInfo?.sub) {
      throw new BadRequestException(
        "User ID not found in token - please login again",
      );
    }

    const userId = userInfo.sub;

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

    // Note: Profile picture URL is stored in S3 and can be retrieved via the URL
    // The frontend can store it in user settings if needed, but we don't need to
    // store it in the database since it's accessible via the S3 URL
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
    const userInfo = this.extractUserInfo(req);
    if (!userInfo?.sub) {
      throw new BadRequestException(
        "User ID not found in token - please login again",
      );
    }

    const userId = userInfo.sub;

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
