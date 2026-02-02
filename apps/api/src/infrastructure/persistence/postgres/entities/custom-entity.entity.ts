/**
 * Custom Entity Entity
 * 
 * PostgreSQL entity for custom entities (reusable pre-configured joins).
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("custom_entities")
@Index(["organizationId", "createdBy"])
@Index(["organizationId", "isPublic"])
export class CustomEntityEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  organizationId: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name: string;

  @Column({ name: "name_en", type: "varchar", length: 255, nullable: true })
  nameEn?: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @Column({ name: "description_en", type: "text", nullable: true })
  descriptionEn?: string;

  @Column({ name: "icon", type: "varchar", length: 50, nullable: true })
  icon?: string;

  @Column({ name: "definition", type: "jsonb" })
  definition: Record<string, unknown>;

  @Column({ name: "created_by", type: "uuid" })
  createdBy: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @Column({ name: "is_public", type: "boolean", default: false })
  isPublic: boolean;
}
