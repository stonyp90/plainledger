/**
 * Upload Controller
 *
 * Handles file uploads for logos, profile pictures, and other assets.
 */

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
} from "@nestjs/common";
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

interface AuthenticatedRequest {
  user: {
    sub: string; // User ID from Keycloak
    email?: string;
    preferred_username?: string;
    organization?: string;
    tenant_id?: string;
  };
}

@Controller("uploads")
@ApiTags("uploads")
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly fileStorageService: FileStorageService) {}

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

    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestException("User ID not found in token");
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
      throw new BadRequestException("User ID not found in token");
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
