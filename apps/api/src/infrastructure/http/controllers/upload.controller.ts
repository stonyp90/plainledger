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
  ) {}

  /**
   * Extract user info from request - supports both Keycloak tokens and mock dev tokens
   */
  private extractUserInfo(req: AuthenticatedRequest): UserInfo | null {
    // First, try to get user from Keycloak-parsed request (normal auth flow)
    if (req.user?.sub) {
      return req.user;
    }

    // In development mode, try to extract from Authorization header (mock token support)
    const isProduction =
      this.configService.get<string>("NODE_ENV") === "production";
    if (isProduction) {
      return null; // No fallback in production
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    try {
      const token = authHeader.substring(7);
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      if (payload.sub) {
        this.logger.debug(
          `Development mode: extracted user ${payload.sub} from token`,
        );
        return {
          sub: payload.sub,
          email: payload.email,
          preferred_username: payload.preferred_username || payload.name,
          organization: payload.organization,
          tenant_id: payload.tenant_id,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse token in development mode: ${error.message}`,
      );
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
