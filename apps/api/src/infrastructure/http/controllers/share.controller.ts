/**
 * Share Controller
 * Handles sharing visualizations via email with embedded chart images
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { IsString, IsArray, IsOptional, IsEmail, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SESAdapter } from "@infrastructure/adapters/email/ses/ses.adapter";
import { FileStorageService } from "@infrastructure/storage/file-storage.service";
import { EmailTemplatesService } from "@infrastructure/templates/email-templates.service";
import { ConfigService } from "@nestjs/config";

class ShareVisualizationDto {
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  imageData: string; // Base64 PNG data

  @IsString()
  shareUrl: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  expiresIn: string;
}

@Controller("share")
@ApiTags("share")
@ApiBearerAuth()
export class ShareController {
  private readonly logger = new Logger(ShareController.name);

  constructor(
    private readonly sesAdapter: SESAdapter,
    private readonly fileStorageService: FileStorageService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly configService: ConfigService,
  ) {}

  @Post("visualization")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Share a visualization via email" })
  @ApiBody({ type: ShareVisualizationDto })
  @ApiResponse({
    status: 200,
    description: "Visualization shared successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        messageId: { type: "string" },
        imageUrl: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async shareVisualization(
    @Body() dto: ShareVisualizationDto,
    @Headers("x-tenant-id") tenantId?: string,
  ) {
    try {
      // Validate base64 image data
      if (!dto.imageData || !dto.imageData.startsWith("data:image/png;base64,")) {
        throw new BadRequestException("Invalid image data format. Expected base64 PNG.");
      }

      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = dto.imageData.replace(/^data:image\/png;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Validate image buffer
      const validation = this.fileStorageService.validateImage(
        imageBuffer,
        "image/png",
        10, // Max 10MB for chart images
      );
      if (!validation.valid) {
        throw new BadRequestException(validation.error);
      }

      // Upload image to S3
      const uploadResult = await this.fileStorageService.uploadFile(imageBuffer, {
        contentType: "image/png",
        folder: "visualizations",
        tenantId,
        filename: `chart-${Date.now()}.png`,
      });

      if (!uploadResult.success) {
        this.logger.error(`Failed to upload visualization image: ${uploadResult.error}`);
        throw new BadRequestException("Failed to upload image");
      }

      // Get base URL for email links
      const baseUrl = this.configService.get<string>(
        "APP_URL",
        "https://app.plainledger.ca",
      );

      // Send email to each recipient
      const emailResults = await Promise.allSettled(
        dto.recipients.map(async (recipient) => {
          // Render email template
          const html = this.emailTemplates.shareVisualization({
            firstName: recipient.split("@")[0], // Use email prefix as firstName fallback
            title: dto.title,
            message: dto.message,
            imageUrl: uploadResult.url,
            shareUrl: dto.shareUrl,
            password: dto.password,
            expiresIn: dto.expiresIn,
            baseUrl,
          });

          // Send email via SES
          const result = await this.sesAdapter.sendEmail({
            to: recipient,
            subject: `${dto.title} - Shared from PlainLedger`,
            html,
            category: "transactional",
          });

          return { recipient, result };
        }),
      );

      // Check if any emails failed
      const failures = emailResults.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        this.logger.warn(
          `Failed to send ${failures.length} of ${dto.recipients.length} emails`,
        );
      }

      const successCount = emailResults.length - failures.length;

      return {
        success: successCount > 0,
        messageId: `share-${Date.now()}`,
        imageUrl: uploadResult.url,
        emailsSent: successCount,
        emailsFailed: failures.length,
      };
    } catch (error) {
      this.logger.error(`Failed to share visualization: ${error.message}`, error.stack);
      throw error;
    }
  }
}
