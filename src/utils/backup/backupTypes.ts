/**
 * Tipos e Interfaces do Mecanismo de Backup e Snapshot Preventivo
 * Driver Planner 2.0 — Cockpit Operacional do Motorista
 * Fase B: Backup, Snapshot e Integridade de Dados
 */

export type BackupType = 'DriverPlanner_PreMigration_Backup' | 'DriverPlanner_Manual_Backup';

export interface BackupMetadata {
  backupType: BackupType;
  backupVersion: number;
  application: string;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  timezone: string;
  source: 'localStorage';
  preMigration: boolean;
}

export interface BackupEntities {
  profile?: any;
  vehicle?: any;
  sessions?: any[];
  plannerEvents?: any[];
  recurringSchedule?: any[];
  earnings?: any[];
  expenses?: any[];
  fuelRecords?: any[];
  maintenances?: any[];
  alerts?: any[];
  strategies?: any[];
  customExpenseCategories?: string[];
  dashboardCards?: any[];
  sanderoTankConfig?: any;
  voiceTtsEnabled?: boolean;
  isDemoData?: boolean;
}

export interface BackupStatistics {
  totalEntities: number;
  totalRecords: number;
  storageKeysCount: number;
  recordsByEntity: Record<string, number>;
  approximateSizeBytes: number;
}

export interface BackupIntegrity {
  checksum: string;
  algorithm: string;
  verified: boolean;
}

export interface DriverPlannerBackupPayload {
  metadata: BackupMetadata;
  statistics: BackupStatistics;
  entities: BackupEntities;
  rawStorage: Record<string, any>;
  unknownData: Record<string, any>;
  integrity: BackupIntegrity;
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: BackupMetadata;
  statistics?: BackupStatistics;
  verifiedChecksum?: boolean;
}
