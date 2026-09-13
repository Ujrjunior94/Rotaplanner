/**
 * Script de Testes Automatizados da Fase B — Backup e Integridade
 * Executa todas as validações sem alterar nenhum arquivo de produção.
 */

import { generateDriverBackup, saveLocalSnapshot, getLocalSnapshot } from '../src/utils/backup/createBackup';
import { validateBackupStructure, testRoundTripIntegrity } from '../src/utils/backup/validateBackup';

// Mock simples de localStorage em memória para teste no Node
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  // Helper para inspecionar dump completo
  dump(): Record<string, string> {
    return { ...this.store };
  }
}

async function runPhaseBTestSuite() {
  console.log('====================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES — FASE B (DRIVER PLANNER 2.0)');
  console.log('====================================================\n');

  const mockStorage = new LocalStorageMock();
  // @ts-ignore
  globalThis.localStorage = mockStorage;
  // @ts-ignore
  globalThis.window = { localStorage: mockStorage };

  // ----------------------------------------------------
  // TESTE 1: Backup sem dados (Storage Vazio)
  // ----------------------------------------------------
  console.log('▶ Teste 1: Backup com armazenamento limpo/vazio');
  const emptyBackup = await generateDriverBackup('DriverPlanner_PreMigration_Backup');
  const emptyValidation = await validateBackupStructure(emptyBackup);
  if (!emptyValidation.isValid) {
    throw new Error(`Teste 1 Falhou: ${emptyValidation.errors.join(', ')}`);
  }
  if (emptyBackup.statistics.totalRecords !== 0) {
    throw new Error(`Teste 1 Falhou: esperava 0 registros, obteve ${emptyBackup.statistics.totalRecords}`);
  }
  console.log('  ✔ Sucesso: Estrutura válida com 0 registros gerada corretamente.\n');

  // ----------------------------------------------------
  // TESTE 2: Mock de dados reais com caracteres especiais e chave desconhecida
  // ----------------------------------------------------
  console.log('▶ Teste 2: Popular dados com acentos, moedas e chaves customizadas');
  mockStorage.setItem('@driver_profile_v2', JSON.stringify({
    name: 'João da Silva & Cia — Motorista Pro ⭐',
    minAcceptableRateKm: 2.20,
    minAcceptableRateHour: 38.00,
    gasPriceReference: 5.89,
    dailyTarget: 250.00,
    weeklyTarget: 1500.00,
  }));

  mockStorage.setItem('@driver_vehicle_v2', JSON.stringify({
    make: 'Renault',
    model: 'Sandero Expression 1.0 12V SCe',
    year: 2020,
    plate: 'BRA2E19',
    tankCapacity: 50,
    currentFuelPrice: 5.89,
    avgConsumption: 13.8,
    currentOdometer: 192026,
    financed: false,
    financingInstallment: 850.00,
    financingInstallmentsLeft: 24,
  }));

  mockStorage.setItem('@driver_sessions_v2', JSON.stringify([
    {
      id: 'sess-001',
      startTime: '2026-09-04T14:00:00Z',
      endTime: '2026-09-04T22:00:00Z',
      startOdometer: 191850,
      endOdometer: 192016,
      grossEarnings: 120.50,
      tips: 5.00,
      tripsCount: 8,
      fuelExpenses: 30.14,
      otherExpenses: 130.60,
      fuelReserve: 24.90,
      maintenanceReserve: 16.60,
      netProfit: -40.24,
      notes: 'Turno teste com caso de teste A (04/09) com acentuação e observação: R$ 120 abastecido.',
    }
  ]));

  mockStorage.setItem('@driver_expenses_v2', JSON.stringify([
    {
      id: 'exp-001',
      date: '2026-09-04',
      category: 'Combustível',
      description: 'Posto Shell — 19L Gasolina Comum a R$ 6,33/L',
      amount: 120.00,
    }
  ]));

  // Inserir chave customizada desconhecida do namespace do app
  mockStorage.setItem('@driver_custom_telemetry_experimental_key', JSON.stringify({
    customSetting: 'valor_preservado_de_teste',
    experimentalFlags: [1, 2, 3],
  }));

  console.log('  ✔ Dados de teste injetados com sucesso.\n');

  // ----------------------------------------------------
  // TESTE 3: Captura de estado ANTES do Backup (Teste de Não-Mutabilidade)
  // ----------------------------------------------------
  console.log('▶ Teste 3: Capturando snapshot do storage antes da operação...');
  const stateBefore = mockStorage.dump();

  // Gerar backup completo
  const fullBackup = await generateDriverBackup('DriverPlanner_PreMigration_Backup');

  // Capturar estado DEPOIS do Backup
  const stateAfter = mockStorage.dump();

  // Comparar ANTES vs DEPOIS
  const keysBefore = Object.keys(stateBefore).sort();
  const keysAfter = Object.keys(stateAfter).sort();

  let mutationsCount = 0;
  if (keysBefore.length !== keysAfter.length) {
    mutationsCount++;
    console.error(`Divergência de chaves: antes=${keysBefore.length}, depois=${keysAfter.length}`);
  }

  for (const key of keysBefore) {
    if (stateBefore[key] !== stateAfter[key]) {
      mutationsCount++;
      console.error(`Mutação detectada na chave ${key}!`);
    }
  }

  if (mutationsCount > 0) {
    throw new Error(`FALHA CRÍTICA: ${mutationsCount} mutações detectadas no storage pela operação de backup!`);
  }
  console.log('  ✔ SUCESSO ABSOLUTO DE NÃO-MUTABILIDADE: 0 alterações nos dados existentes!\n');

  // ----------------------------------------------------
  // TESTE 4: Preservação de Chaves Desconhecidas (unknownData)
  // ----------------------------------------------------
  console.log('▶ Teste 4: Verificação de preservação de dados desconhecidos');
  if (!fullBackup.unknownData['@driver_custom_telemetry_experimental_key']) {
    throw new Error('Teste 4 Falhou: chave desconhecida @driver_custom_telemetry_experimental_key foi descartada!');
  }
  console.log('  ✔ Sucesso: Chave desconhecida preservada intacta no backup bruto.\n');

  // ----------------------------------------------------
  // TESTE 5: Validação Estrutural e Metadados
  // ----------------------------------------------------
  console.log('▶ Teste 5: Validação da estrutura, metadados e integridade');
  const validation = await validateBackupStructure(fullBackup);
  if (!validation.isValid) {
    throw new Error(`Teste 5 Falhou: ${validation.errors.join(', ')}`);
  }
  if (!fullBackup.metadata.preMigration) {
    throw new Error('Teste 5 Falhou: flag preMigration deve ser true.');
  }
  if (fullBackup.metadata.backupType !== 'DriverPlanner_PreMigration_Backup') {
    throw new Error(`Teste 5 Falhou: backupType inesperado ${fullBackup.metadata.backupType}`);
  }
  console.log(`  ✔ Metadados verificados: App="${fullBackup.metadata.application}", Schema=${fullBackup.metadata.schemaVersion}, Tipo=${fullBackup.metadata.backupType}`);
  console.log(`  ✔ Checksum SHA-256 gerado: ${fullBackup.integrity.checksum}`);
  console.log(`  ✔ Total de registros contabilizados: ${fullBackup.statistics.totalRecords}\n`);

  // ----------------------------------------------------
  // TESTE 6: Teste de Round-Trip (Serializar -> Parse -> Comparar)
  // ----------------------------------------------------
  console.log('▶ Teste 6: Teste de Round-Trip');
  const roundTrip = testRoundTripIntegrity(fullBackup);
  if (!roundTrip.passed) {
    throw new Error(`Teste 6 Falhou: diferenças encontradas no round-trip: ${roundTrip.differences.join(', ')}`);
  }
  console.log('  ✔ Sucesso no Round-Trip: 0 diferenças entre objeto em memória e deserialização.\n');

  // ----------------------------------------------------
  // TESTE 7: Snapshot Preventivo Local
  // ----------------------------------------------------
  console.log('▶ Teste 7: Salvamento e leitura de Snapshot Local');
  const savedSnapshot = saveLocalSnapshot(fullBackup);
  if (!savedSnapshot) {
    throw new Error('Teste 7 Falhou: saveLocalSnapshot retornou false.');
  }
  const loadedSnapshot = getLocalSnapshot();
  if (!loadedSnapshot) {
    throw new Error('Teste 7 Falhou: getLocalSnapshot retornou null.');
  }
  if (loadedSnapshot.metadata.createdAt !== fullBackup.metadata.createdAt) {
    throw new Error('Teste 7 Falhou: Snapshot lido difere do gravado.');
  }
  console.log('  ✔ Sucesso: Snapshot local gravado e recuperado perfeitamente.\n');

  console.log('====================================================');
  console.log('🎉 TODOS OS 7 TESTES DA FASE B PASSARAM COM 100% DE SUCESSO!');
  console.log('====================================================\n');
}

runPhaseBTestSuite().catch(err => {
  console.error('❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
