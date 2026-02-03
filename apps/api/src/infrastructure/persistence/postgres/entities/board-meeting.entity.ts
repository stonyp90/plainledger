/**
 * BoardMeeting Entity
 * Stores board meeting data including agenda, participants, votes, and notes
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type MeetingType = "regular" | "special" | "annual" | "emergency";

@Entity({ name: "board_meetings", schema: "reporting" })
@Index(["organizationId", "status"])
@Index(["organizationId", "date"])
export class BoardMeetingEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id", type: "uuid" })
  organizationId: string;

  @Column({ name: "title", type: "varchar", length: 255 })
  title: string;

  @Column({ name: "title_en", type: "varchar", length: 255, nullable: true })
  titleEn?: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @Column({ name: "description_en", type: "text", nullable: true })
  descriptionEn?: string;

  @Column({ name: "date", type: "date" })
  date: string;

  @Column({ name: "start_time", type: "varchar", length: 10 })
  startTime: string;

  @Column({ name: "end_time", type: "varchar", length: 10 })
  endTime: string;

  @Column({ name: "status", type: "varchar", length: 20, default: "scheduled" })
  status: MeetingStatus;

  @Column({ name: "type", type: "varchar", length: 20, default: "regular" })
  type: MeetingType;

  @Column({ name: "location", type: "varchar", length: 500, nullable: true })
  location?: string;

  @Column({ name: "virtual_link", type: "varchar", length: 500, nullable: true })
  virtualLink?: string;

  @Column({ name: "participants", type: "jsonb" })
  participants: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    isPresent: boolean;
    joinedAt?: string;
  }>;

  @Column({ name: "agenda", type: "jsonb" })
  agenda: Array<{
    id: string;
    order: number;
    type: string;
    title: string;
    titleEn: string;
    description?: string;
    descriptionEn?: string;
    duration: number;
    presenter?: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    notes: Array<{
      id: string;
      content: string;
      author: string;
      timestamp: string;
      isPrivate: boolean;
    }>;
    votingItems?: Array<{
      id: string;
      title: string;
      titleEn: string;
      description: string;
      descriptionEn: string;
      votes: Array<{
        participantId: string;
        vote: string;
        timestamp: string;
        comment?: string;
      }>;
      status: string;
      result?: string;
      requiredMajority: number;
    }>;
    actionItems?: Array<{
      id: string;
      title: string;
      titleEn: string;
      description: string;
      descriptionEn: string;
      assignee: string;
      dueDate: string;
      status: string;
      priority: string;
      createdAt: string;
      completedAt?: string;
    }>;
    attachments?: string[];
  }>;

  @Column({ name: "slides", type: "jsonb", nullable: true })
  slides?: Array<{
    id: string;
    type: string;
    title: string;
    titleEn: string;
    content?: any;
    notes?: string;
    agendaItemId?: string;
  }>;

  @Column({ name: "board_panels", type: "jsonb", nullable: true })
  boardPanels?: Array<{
    id: string;
    type: string;
    title: string;
    titleEn: string;
    size: string;
    order: number;
    config?: any;
    visible: boolean;
  }>;

  @Column({ name: "notes", type: "jsonb", nullable: true })
  notes?: Array<{
    id: string;
    content: string;
    author: string;
    timestamp: string;
    isPrivate: boolean;
    agendaItemId?: string;
  }>;

  @Column({ name: "action_items", type: "jsonb", nullable: true })
  actionItems?: Array<{
    id: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    assignee: string;
    dueDate: string;
    status: string;
    priority: string;
    createdAt: string;
    completedAt?: string;
  }>;

  @Column({ name: "decisions", type: "text", array: true, nullable: true })
  decisions?: string[];

  @Column({ name: "quorum_required", type: "int", default: 51 })
  quorumRequired: number;

  @Column({ name: "created_by", type: "varchar", length: 100 })
  createdBy: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
