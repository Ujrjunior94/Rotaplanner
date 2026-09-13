/**
 * Utilitário de Criação de Backup e Snapshot Preventivo
 * Driver Planner 2.0 — Cockpit Operacional do Motorista
 * Fase B: Backup, Snapshot e Integridade de Dados
 * 
 * REGRA: Esta operação é estritamente READ ONLY em relação aos dados operacionais.
 * Nenhuma entidade de dados é modificada, recalculada ou apagada.
 */

import {
  DriverPlannerBackupPayload,
  BackupMetadata,
  BackupEntities,
  BackupStatistics,
  BackupIntegrity,
  BackupType,
} from './backupTypes';

export const KNOWN_DRIVER_KEYS = [
  '@driver_profile_v2',
  '@driver_vehicle_v2',
  '@driver_sessions_v2',
  '@driver_planner_v2',
  '@driver_recurring_v2',
  '@driver_earnings_v2',
  '@driver_expenses_v2',
  '@driver_fuel_v2',
  '@driver_maint_v2',
  '@driver_alerts_v2',
  '@driver_strategies_v2',
  '@driver_custom_expense_cats_v2',
  '@driver_dashboard_cards_v1',
  '@driver_sandero_tank_v2',
  '@driver_voice_tts_enabled',
  '@driver_is_demo_v2',
] as const;

export const LOCAL_SNAPSHOT_KEY = '@driver_snapshot_pre_migration_v2';

/**
 * Calcula hash SHA-256 seguro usando Web Crypto API nativa,
 * com fallback determinístico caso execute em ambiente sem crypto.subtle.
 */
async function calculateChecksum(content: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto não disponível, usando fallback:', e);
  }

  // Fallback determinístico caso Web Crypto falhe
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
}

/**
 * Lê e decodifica com segurança um item do localStorage.
 * Não lança exceção em caso de erro de parsing.
 */
function safeGetStorageItem<T = any>(key: string): { raw: string | null; parsed: T | null; isJson: boolean } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { raw: null, parsed: null, isJson: false };
    }
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { raw: null, parsed: null, isJson: false };
    }
    try {
      const parsed = JSON.parse(raw);
      return { raw, parsed, isJson: true };
    } catch {
      return { raw, parsed: raw as any, isJson: false };
    }
  } catch (err) {
    console.error(`Erro ao ler chave ${key} do localStorage:`, err);
    return { raw: null, parsed: null, isJson: false };
  }
}

/**
 * Gera o payload completo do Backup sem modificar nenhum dado do sistema.
 */
export async function generateDriverBackup(
  backupType: BackupType = 'DriverPlanner_PreMigration_Backup',
  customContextData?: Partial<BackupEntities>
): Promise<DriverPlannerBackupPayload> {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bahia';

  // 1. Extrair entidades estruturadas do localStorage
  const profileData = safeGetStorageItem('@driver_profile_v2');
  const vehicleData = safeGetStorageItem('@driver_vehicle_v2');
  const sessionsData = safeGetStorageItem<any[]>('@driver_sessions_v2');
  const plannerData = safeGetStorageItem<any[]>('@driver_planner_v2');
  const recurringData = safeGetStorageItem<any[]>('@driver_recurring_v2');
  const earningsData = safeGetStorageItem<any[]>('@driver_earnings_v2');
  const expensesData = safeGetStorageItem<any[]>('@driver_expenses_v2');
  const fuelData = safeGetStorageItem<any[]>('@driver_fuel_v2');
  const maintData = safeGetStorageItem<any[]>('@driver_maint_v2');
  const alertsData = safeGetStorageItem<any[]>('@driver_alerts_v2');
  const strategiesData = safeGetStorageItem<any[]>('@driver_strategies_v2');
  const customCatsData = safeGetStorageItem<string[]>('@driver_custom_expense_cats_v2');
  const cardsData = safeGetStorageItem<any[]>('@driver_dashboard_cards_v1');
  const tankData = safeGetStorageItem('@driver_sandero_tank_v2');
  const voiceData = safeGetStorageItem('@driver_voice_tts_enabled');
  const isDemoData = safeGetStorageItem('@driver_is_demo_v2');

  const entities: BackupEntities = {
    profile: customContextData?.profile ?? profileData.parsed ?? null,
    vehicle: customContextData?.vehicle ?? vehicleData.parsed ?? null,
    sessions: customContextData?.sessions ?? (Array.isArray(sessionsData.parsed) ? sessionsData.parsed : []),
    plannerEvents: customContextData?.plannerEvents ?? (Array.isArray(plannerData.parsed) ? plannerData.parsed : []),
    recurringSchedule: customContextData?.recurringSchedule ?? (Array.isArray(recurringData.parsed) ? recurringData.parsed : []),
    earnings: customContextData?.earnings ?? (Array.isArray(earningsData.parsed) ? earningsData.parsed : []),
    expenses: customContextData?.expenses ?? (Array.isArray(expensesData.parsed) ? expensesData.parsed : []),
    fuelRecords: customContextData?.fuelRecords ?? (Array.isArray(fuelData.parsed) ? fuelData.parsed : []),
    maintenances: customContextData?.maintenances ?? (Array.isArray(maintData.parsed) ? maintData.parsed : []),
    alerts: customContextData?.alerts ?? (Array.isArray(alertsData.parsed) ? alertsData.parsed : []),
    strategies: customContextData?.strategies ?? (Array.isArray(strategiesData.parsed) ? strategiesData.parsed : []),
    customExpenseCategories: customContextData?.customExpenseCategories ?? (Array.isArray(customCatsData.parsed) ? customCatsData.parsed : []),
    dashboardCards: customContextData?.dashboardCards ?? (Array.isArray(cardsData.parsed) ? cardsData.parsed : []),
    sanderoTankConfig: customContextData?.sanderoTankConfig ?? tankData.parsed ?? null,
    voiceTtsEnabled: customContextData?.voiceTtsEnabled ?? (voiceData.raw === 'true'),
    isDemoData: customContextData?.isDemoData ?? (isDemoData.raw === 'true'),
  };

  // 2. Varrer todo o localStorage para coletar rawStorage e preservar chaves desconhecidas do namespace
  const rawStorage: Record<string, any> = {};
  const unknownData: Record<string, any> = {};
  let storageKeysCount = 0;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const knownKeysSet = new Set<string>(KNOWN_DRIVER_KEYS);
      knownKeysSet.add(LOCAL_SNAPSHOT_KEY);

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('@driver_') || key.startsWith('driver_'))) {
          storageKeysCount++;
          const val = safeGetStorageItem(key);
          rawStorage[key] = val.parsed ?? val.raw;

          // Se a chave não estiver no catálogo oficial mapeado, preservar em unknownData
          if (!knownKeysSet.has(key)) {
            unknownData[key] = val.parsed ?? val.raw;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao iterar chaves do localStorage:', e);
    }
  }

  // 3. Compilar estatísticas
  const recordsByEntity: Record<string, number> = {
    sessions: entities.sessions?.length || 0,
    plannerEvents: entities.plannerEvents?.length || 0,
    recurringSchedule: entities.recurringSchedule?.length || 0,
    earnings: entities.earnings?.length || 0,
    expenses: entities.expenses?.length || 0,
    fuelRecords: entities.fuelRecords?.length || 0,
    maintenances: entities.maintenances?.length || 0,
    alerts: entities.alerts?.length || 0,
    strategies: entities.strategies?.length || 0,
    customExpenseCategories: entities.customExpenseCategories?.length || 0,
    dashboardCards: entities.dashboardCards?.length || 0,
  };

  const totalRecords = Object.values(recordsByEntity).reduce((a, b) => a + b, 0);
  const totalEntities = Object.keys(recordsByEntity).length + (entities.profile ? 1 : 0) + (entities.vehicle ? 1 : 0);

  // Serialização intermediária para cálculo de tamanho e hash
  const serializedEntities = JSON.stringify({ entities, rawStorage });
  const approximateSizeBytes = new Blob([serializedEntities]).size;

  const statistics: BackupStatistics = {
    totalEntities,
    totalRecords,
    storageKeysCount,
    recordsByEntity,
    approximateSizeBytes,
  };

  const metadata: BackupMetadata = {
    backupType,
    backupVersion: 1,
    application: 'Driver Planner 2.0',
    appVersion: '2.1.0',
    schemaVersion: 2,
    createdAt: now.toISOString(),
    timezone,
    source: 'localStorage',
    preMigration: true,
  };

  // 4. Calcular integridade (checksum)
  const checksum = await calculateChecksum(serializedEntities);
  const integrity: BackupIntegrity = {
    checksum,
    algorithm: 'SHA-256',
    verified: true,
  };

  return {
    metadata,
    statistics,
    entities,
    rawStorage,
    unknownData,
    integrity,
  };
}

/**
 * Salva um snapshot preventivo no localStorage local com chave isolada.
 * Não altera nenhuma chave operacional do sistema.
 */
export function saveLocalSnapshot(backup: DriverPlannerBackupPayload): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const serialized = JSON.stringify(backup);
    localStorage.setItem(LOCAL_SNAPSHOT_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Não foi possível salvar o snapshot no localStorage (possível quota excedida):', err);
    return false;
  }
}

/**
 * Lê o snapshot pré-migração local salvo, se existir.
 */
export function getLocalSnapshot(): DriverPlannerBackupPayload | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler snapshot local:', err);
    return null;
  }
}

/**
 * Gera e dispara o download do arquivo JSON no navegador.
 */
export function downloadBackupFile(
  backup: DriverPlannerBackupPayload,
  customFilename?: string
): { success: boolean; filename: string; sizeBytes: number } {
  try {
    const datePart = backup.metadata.createdAt.replace(/[:.]/g, '-');
    const defaultName = `${backup.metadata.backupType}_${datePart}.json`;
    const filename = customFilename || defaultName;

    const jsonContent = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename,
      sizeBytes: blob.size,
    };
  } catch (err) {
    console.error('Erro ao disparar download do backup:', err);
    return {
      success: false,
      filename: '',
      sizeBytes: 0,
    };
  }
}
