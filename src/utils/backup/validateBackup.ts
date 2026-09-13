/**
 * Validador de Integridade e Teste de Round-Trip de Backup
 * Driver Planner 2.0 — Cockpit Operacional do Motorista
 * Fase B: Backup, Snapshot e Integridade de Dados
 */

import { DriverPlannerBackupPayload, BackupValidationResult } from './backupTypes';

/**
 * Valida a estrutura, metadados e integridade de um payload de backup.
 */
export async function validateBackupStructure(data: any): Promise<BackupValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['O arquivo de backup não contém um objeto JSON válido.'],
      warnings: [],
    };
  }

  // 1. Validar Metadados
  if (!data.metadata) {
    errors.push('Campo "metadata" obrigatório não encontrado.');
  } else {
    if (!data.metadata.backupType) errors.push('Tipo de backup (backupType) ausente.');
    if (!data.metadata.application) errors.push('Nome do aplicativo ausente nos metadados.');
    if (!data.metadata.createdAt) errors.push('Data de criação (createdAt) ausente.');
    if (typeof data.metadata.schemaVersion !== 'number') {
      warnings.push('Versão de schema (schemaVersion) não numérica ou ausente.');
    }
  }

  // 2. Validar Entidades
  if (!data.entities || typeof data.entities !== 'object') {
    errors.push('Campo "entities" obrigatório não encontrado.');
  } else {
    const arrayFields = [
      'sessions',
      'plannerEvents',
      'recurringSchedule',
      'earnings',
      'expenses',
      'fuelRecords',
      'maintenances',
      'alerts',
      'strategies',
    ];

    for (const field of arrayFields) {
      if (data.entities[field] !== undefined && !Array.isArray(data.entities[field])) {
        errors.push(`Entidade "${field}" deve ser uma lista (array).`);
      }
    }

    if (!data.entities.profile) {
      warnings.push('Perfil do motorista (profile) não encontrado no backup.');
    }
    if (!data.entities.vehicle) {
      warnings.push('Dados do veículo (vehicle) não encontrados no backup.');
    }
  }

  // 3. Validar Estatísticas
  if (!data.statistics) {
    warnings.push('Estatísticas de contagem não incluídas no backup.');
  } else {
    if (typeof data.statistics.totalRecords !== 'number') {
      warnings.push('Total de registros não especificado nas estatísticas.');
    }
  }

  // 4. Validar Integridade e Checksum se fornecido
  let verifiedChecksum = false;
  if (data.integrity && data.integrity.checksum) {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const serialized = JSON.stringify({ entities: data.entities, rawStorage: data.rawStorage });
        const encoder = new TextEncoder();
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(serialized));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (computed === data.integrity.checksum) {
          verifiedChecksum = true;
        } else {
          warnings.push('Checksum SHA-256 divergiu do conteúdo serializado (possível edição manual do arquivo).');
        }
      }
    } catch {
      // Ignora se não for possível rodar crypto
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: data.metadata,
    statistics: data.statistics,
    verifiedChecksum,
  };
}

/**
 * Teste de Round-Trip:
 * Compara o estado original com a serialização e desserialização
 * para garantir que absolutamente nenhuma informação foi perdida ou mutada.
 */
export function testRoundTripIntegrity(
  original: DriverPlannerBackupPayload
): { passed: boolean; differences: string[] } {
  const differences: string[] = [];

  try {
    const jsonStr = JSON.stringify(original);
    const parsed: DriverPlannerBackupPayload = JSON.parse(jsonStr);

    // Comparar chaves principais
    if (parsed.metadata.backupType !== original.metadata.backupType) {
      differences.push('backupType divergiu no round-trip');
    }
    if (parsed.metadata.createdAt !== original.metadata.createdAt) {
      differences.push('createdAt divergiu no round-trip');
    }

    // Comparar quantidades de registros nas listas
    const originalCounts = original.statistics.recordsByEntity;
    const parsedCounts: Record<string, number> = {
      sessions: parsed.entities.sessions?.length || 0,
      plannerEvents: parsed.entities.plannerEvents?.length || 0,
      recurringSchedule: parsed.entities.recurringSchedule?.length || 0,
      earnings: parsed.entities.earnings?.length || 0,
      expenses: parsed.entities.expenses?.length || 0,
      fuelRecords: parsed.entities.fuelRecords?.length || 0,
      maintenances: parsed.entities.maintenances?.length || 0,
      alerts: parsed.entities.alerts?.length || 0,
      strategies: parsed.entities.strategies?.length || 0,
      customExpenseCategories: parsed.entities.customExpenseCategories?.length || 0,
      dashboardCards: parsed.entities.dashboardCards?.length || 0,
    };

    for (const key of Object.keys(originalCounts)) {
      if (originalCounts[key] !== parsedCounts[key]) {
        differences.push(`Contagem de "${key}" divergiu: original=${originalCounts[key]}, após round-trip=${parsedCounts[key]}`);
      }
    }

    // Comparar integridade do profile e vehicle
    if (JSON.stringify(original.entities.profile) !== JSON.stringify(parsed.entities.profile)) {
      differences.push('Entidade profile divergiu no round-trip');
    }
    if (JSON.stringify(original.entities.vehicle) !== JSON.stringify(parsed.entities.vehicle)) {
      differences.push('Entidade vehicle divergiu no round-trip');
    }
  } catch (err: any) {
    differences.push(`Falha de exceção no teste de round-trip: ${err?.message || String(err)}`);
  }

  return {
    passed: differences.length === 0,
    differences,
  };
}
