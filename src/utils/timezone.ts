/**
 * Utilitário de Fuso Horário e Data Operacional
 * Driver Planner 2.0 — Cockpit Operacional do Motorista
 * 
 * Fuso horário padrão: America/Bahia (UTC-3 sem horário de verão)
 * REGRA ABSOLUTA: NUNCA usar new Date().toISOString().split('T')[0] para determinar
 * o dia operacional de um turno ou lançamento no Brasil/Bahia.
 */

export const DEFAULT_TIMEZONE = 'America/Bahia';

/**
 * Converte qualquer Date, timestamp numérico ou string ISO para a data operacional (YYYY-MM-DD)
 * no fuso horário especificado (padrão: America/Bahia).
 */
export function getOperationalDate(
  dateInput: Date | string | number = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(d.getTime())) {
      // Se for string YYYY-MM-DD direta válida, retorna ela mesma
      if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      return getTodayOperationalDate(timezone);
    }

    // Usa Intl.DateTimeFormat para obter ano, mês e dia no fuso horário correto
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(d); // Formato en-CA é exatamente YYYY-MM-DD
  } catch (err) {
    console.warn(`Erro ao calcular data operacional com timezone ${timezone}:`, err);
    // Fallback seguro usando offset local se Intl falhar
    const d = new Date(dateInput);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Retorna a data operacional de "hoje" no fuso configurado.
 */
export function getTodayOperationalDate(timezone: string = DEFAULT_TIMEZONE): string {
  return getOperationalDate(new Date(), timezone);
}

/**
 * Formata um horário (HH:mm) para exibição a partir de uma data ou string ISO no timezone do usuário.
 */
export function formatOperationalTime(
  dateInput: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(d.getTime())) return '--:--';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '--:--';
  }
}

/**
 * Retorna a data e hora atual em ISO string e a data operacional associada.
 */
export function getNowWithOperationalDate(timezone: string = DEFAULT_TIMEZONE): {
  nowIso: string;
  operationalDate: string;
  timezone: string;
} {
  const now = new Date();
  return {
    nowIso: now.toISOString(),
    operationalDate: getOperationalDate(now, timezone),
    timezone,
  };
}

/**
 * Normaliza um registro antigo (migração suave) para garantir que possua operationalDate.
 * Se o registro tiver startTime ou date, deriva a operationalDate no timezone correto.
 */
export function ensureOperationalDate<T extends { operationalDate?: string; startTime?: string; date?: string; createdAt?: string }>(
  item: T,
  timezone: string = DEFAULT_TIMEZONE
): T & { operationalDate: string; timezone: string } {
  if (item.operationalDate && /^\d{4}-\d{2}-\d{2}$/.test(item.operationalDate)) {
    return {
      ...item,
      operationalDate: item.operationalDate,
      timezone: (item as any).timezone || timezone,
    };
  }

  // Se tem startTime (Sessões)
  if (item.startTime) {
    return {
      ...item,
      operationalDate: getOperationalDate(item.startTime, timezone),
      timezone,
    };
  }

  // Se tem date (PlannerEvent, ExpenseItem, FuelRecord)
  if (item.date) {
    // Se a data já for YYYY-MM-DD, mantemos
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      return {
        ...item,
        operationalDate: item.date,
        timezone,
      };
    }
    return {
      ...item,
      operationalDate: getOperationalDate(item.date, timezone),
      timezone,
    };
  }

  // Se tem createdAt
  if (item.createdAt) {
    return {
      ...item,
      operationalDate: getOperationalDate(item.createdAt, timezone),
      timezone,
    };
  }

  return {
    ...item,
    operationalDate: getTodayOperationalDate(timezone),
    timezone,
  };
}
