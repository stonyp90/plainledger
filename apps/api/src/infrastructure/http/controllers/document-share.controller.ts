/**
 * Document Share Controller
 *
 * API endpoints for password-protected document sharing.
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  HttpCode,
  HttpStatus,
  Ip,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { Public } from "nest-keycloak-connect";
import {
  DocumentShareService,
  ShareResult,
  DownloadResult,
  ShareInfo,
} from "@infrastructure/storage/document-share.service";

interface AuthenticatedRequest {
  user: {
    sub: string;
    email?: string;
    preferred_username?: string;
    organization?: string;
    tenant_id?: string;
  };
}

class CreateShareDto {
  password: string;
  expiresInHours?: number;
  maxDownloads?: number;
  description?: string;
}

class AccessShareDto {
  password: string;
}

@Controller("v1/document-shares")
@ApiTags("document-shares")
export class DocumentShareController {
  constructor(private readonly documentShareService: DocumentShareService) {}

  /**
   * Upload and create a new password-protected share
   */
  @Post()
  @Public() // TODO: Remove for production - temporarily public for local testing
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create a password-protected document share" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "password"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Document file to share",
        },
        password: {
          type: "string",
          description: "Password to protect the share (min 6 characters)",
        },
        expiresInHours: {
          type: "number",
          description: "Expiration time in hours (default: 168 = 7 days)",
        },
        maxDownloads: {
          type: "number",
          description: "Maximum number of downloads allowed (optional)",
        },
        description: {
          type: "string",
          description: "Description for the share (optional)",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Share created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        shareUrl: { type: "string" },
        shareToken: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        maxDownloads: { type: "number" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createShare(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateShareDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ShareResult> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!body.password || body.password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters");
    }

    // Validate file type
    if (!this.documentShareService.validateFileType(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, and archives.`,
      );
    }

    // For local dev testing, use fallback UUID values if no auth
    const userId = req.user?.sub || "00000000-0000-0000-0000-000000000001";
    const organizationId =
      req.user?.tenant_id ||
      req.user?.organization ||
      "00000000-0000-0000-0000-000000000000";

    return this.documentShareService.createShare({
      organizationId,
      createdBy: userId,
      file: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      password: body.password,
      expiresInHours: body.expiresInHours,
      maxDownloads: body.maxDownloads,
      description: body.description,
    });
  }

  /**
   * List all shares for the current organization
   */
  @Get()
  @Public() // TODO: Remove for production - temporarily public for local testing
  @ApiBearerAuth()
  @ApiOperation({ summary: "List document shares for your organization" })
  @ApiResponse({
    status: 200,
    description: "List of document shares",
  })
  async listShares(@Req() req: AuthenticatedRequest): Promise<ShareInfo[]> {
    // For local dev testing, use fallback UUID values if no auth
    const organizationId =
      req.user?.tenant_id ||
      req.user?.organization ||
      "00000000-0000-0000-0000-000000000000";

    return this.documentShareService.listShares(organizationId);
  }

  /**
   * List shares created by the current user
   */
  @Get("my")
  @Public() // TODO: Remove for production - temporarily public for local testing
  @ApiBearerAuth()
  @ApiOperation({ summary: "List document shares created by you" })
  @ApiResponse({
    status: 200,
    description: "List of your document shares",
  })
  async listMyShares(@Req() req: AuthenticatedRequest): Promise<ShareInfo[]> {
    // For local dev testing, use fallback values if no auth
    // Using a valid UUID for dev testing
    const userId = req.user?.sub || "00000000-0000-0000-0000-000000000001";

    return this.documentShareService.listUserShares(userId);
  }

  /**
   * Get share info (public endpoint, no auth required)
   */
  @Get("public/:shareToken/info")
  @Public()
  @ApiOperation({ summary: "Get share information (public, no auth required)" })
  @ApiParam({ name: "shareToken", description: "The share token" })
  @ApiResponse({
    status: 200,
    description: "Share information",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        originalFilename: { type: "string" },
        fileSize: { type: "number" },
        mimeType: { type: "string" },
        description: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        downloadCount: { type: "number" },
        maxDownloads: { type: "number" },
        createdAt: { type: "string", format: "date-time" },
        isActive: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Share not found" })
  async getShareInfo(
    @Param("shareToken") shareToken: string,
  ): Promise<ShareInfo | { error: string }> {
    const info = await this.documentShareService.getShareInfo(shareToken);

    if (!info) {
      return { error: "Share not found" };
    }

    return info;
  }

  /**
   * Access a share with password (public endpoint)
   */
  @Post("public/:shareToken/access")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Access a share with password (public, no auth required)",
  })
  @ApiParam({ name: "shareToken", description: "The share token" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["password"],
      properties: {
        password: {
          type: "string",
          description: "Password for the share",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Download URL generated",
    schema: {
      type: "object",
      properties: {
        downloadUrl: { type: "string" },
        filename: { type: "string" },
        mimeType: { type: "string" },
        fileSize: { type: "number" },
        expiresInSeconds: { type: "number" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid password" })
  @ApiResponse({ status: 404, description: "Share not found" })
  @ApiResponse({ status: 410, description: "Share expired or deactivated" })
  async accessShare(
    @Param("shareToken") shareToken: string,
    @Body() body: AccessShareDto,
    @Ip() clientIp: string,
  ): Promise<DownloadResult> {
    if (!body.password) {
      throw new BadRequestException("Password is required");
    }

    return this.documentShareService.accessShare({
      shareToken,
      password: body.password,
      clientIp,
    });
  }

  /**
   * Deactivate a share
   */
  @Post(":shareId/deactivate")
  @Public() // TODO: Remove for production - temporarily public for local testing
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate a document share" })
  @ApiParam({ name: "shareId", description: "The share ID" })
  @ApiResponse({ status: 200, description: "Share deactivated" })
  @ApiResponse({ status: 404, description: "Share not found" })
  async deactivateShare(
    @Param("shareId") shareId: string,
    @Body("reason") reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // For local dev testing, use fallback UUID values if no auth
    const organizationId =
      req.user?.tenant_id ||
      req.user?.organization ||
      "00000000-0000-0000-0000-000000000000";

    await this.documentShareService.deactivateShare(
      shareId,
      organizationId,
      reason,
    );
    return { success: true };
  }

  /**
   * Delete a share permanently
   */
  @Delete(":shareId")
  @Public() // TODO: Remove for production - temporarily public for local testing
  @ApiBearerAuth()
  // @Roles({ roles: ["admin", "owner"] }) // Disabled for local testing
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a document share permanently" })
  @ApiParam({ name: "shareId", description: "The share ID" })
  @ApiResponse({ status: 200, description: "Share deleted" })
  @ApiResponse({ status: 404, description: "Share not found" })
  async deleteShare(
    @Param("shareId") shareId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // For local dev testing, use fallback UUID values if no auth
    const organizationId =
      req.user?.tenant_id ||
      req.user?.organization ||
      "00000000-0000-0000-0000-000000000000";

    await this.documentShareService.deleteShare(shareId, organizationId);
    return { success: true };
  }

  /**
   * Get allowed file types
   */
  @Get("allowed-types")
  @Public()
  @ApiOperation({ summary: "Get allowed file types for document sharing" })
  @ApiResponse({
    status: 200,
    description: "List of allowed MIME types",
  })
  getAllowedTypes(): { mimeTypes: string[] } {
    return {
      mimeTypes: this.documentShareService.getAllowedMimeTypes(),
    };
  }
}
