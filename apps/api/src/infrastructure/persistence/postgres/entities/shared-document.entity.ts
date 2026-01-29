import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * SharedDocument Entity
 *
 * Stores metadata for password-protected document shares.
 * Documents are stored in S3, this tracks the share link details.
 */
@Entity({ name: "shared_documents", schema: "integration" })
@Index(["organization_id"])
@Index(["created_by"])
@Index(["expires_at"])
@Index(["share_token"], { unique: true })
export class SharedDocumentEntity {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ name: "created_by", type: "uuid" })
  createdBy: string;

  // Document info
  @Column({ name: "original_filename", type: "varchar", length: 255 })
  originalFilename: string;

  @Column({ name: "file_size", type: "bigint" })
  fileSize: number;

  @Column({ name: "mime_type", type: "varchar", length: 100 })
  mimeType: string;

  @Column({ name: "s3_key", type: "varchar", length: 500 })
  s3Key: string;

  // Share settings
  @Column({ name: "share_token", type: "varchar", length: 64, unique: true })
  shareToken: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "max_downloads", type: "int", nullable: true })
  maxDownloads?: number;

  @Column({ name: "download_count", type: "int", default: 0 })
  downloadCount: number;

  // Optional description for the share
  @Column({ type: "text", nullable: true })
  description?: string;

  // Status
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "deactivated_at", type: "timestamptz", nullable: true })
  deactivatedAt?: Date;

  @Column({
    name: "deactivated_reason",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  deactivatedReason?: string;

  // Audit
  @Column({ name: "last_accessed_at", type: "timestamptz", nullable: true })
  lastAccessedAt?: Date;

  @Column({
    name: "last_accessed_ip",
    type: "varchar",
    length: 45,
    nullable: true,
  })
  lastAccessedIp?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
