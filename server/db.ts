import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { DatabaseSchema, RitaseRecord, User, MasterDigger, MasterHauler, MasterChecker, MasterMaterial, MasterLocation, MasterJobCategory, AuditLog, McrRecord } from '../src/types/index';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const DEFAULT_MCR_CSV = path.resolve(process.cwd(), 'public/assets/aistudio/Book1_a19ba2da.csv');

export const loadDefaultMcrRecords = (): McrRecord[] => {
  try {
    if (!fs.existsSync(DEFAULT_MCR_CSV)) return [];
    const content = fs.readFileSync(DEFAULT_MCR_CSV, 'utf-8');
    const workbook = XLSX.read(content, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    if (rows.length <= 1) return [];

    const headers = (rows[0] as any[]).map((h) => String(h || '').trim().replace(/\s+/g, ' ').toLowerCase());
    const findIdx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));

    const tglIdx = findIdx(['tanggal', 'date']);
    const shiftIdx = findIdx(['shift']);
    const loaderIdx = findIdx(['loader', 'digger']);
    const typeLoaderIdx = findIdx(['type loader', 'model']);
    const haulerIdx = findIdx(['hauler', 'dt', 'dump truck']);
    const typeHaulerIdx = findIdx(['type hauler']);
    const blokIdx = findIdx(['blok', 'pit']);
    const ritIdx = findIdx(['ritase', 'rit']);
    const prodIdx = findIdx(['product', 'tonase']);
    const jobIdx = findIdx(['job category', 'kegiatan']);

    const records: McrRecord[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      if (!row || row.length === 0) continue;

      const getCol = (idx: number) => (idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '');
      const jobCategory = getCol(jobIdx) || 'UNASSIGNED';
      if (!jobCategory || jobCategory.toLowerCase() === 'job category') continue;

      const product = parseFloat(getCol(prodIdx)) || 0;
      const tanggal = getCol(tglIdx) || '27-Oct';
      const shift = (getCol(shiftIdx) || 'DAY').toUpperCase();
      const loader = getCol(loaderIdx) || '-';
      const typeLoader = getCol(typeLoaderIdx) || '';
      const hauler = getCol(haulerIdx) || '-';
      const typeHauler = getCol(typeHaulerIdx) || '';
      const blok = getCol(blokIdx) || '-';
      const ritase = parseFloat(getCol(ritIdx)) || 0;

      records.push({
        id: `MCR-${String(i).padStart(4, '0')}`,
        job_category: jobCategory.toUpperCase(),
        product,
        tanggal,
        shift,
        loader,
        type_loader: typeLoader,
        hauler,
        type_hauler: typeHauler,
        blok,
        ritase,
        total_product_tonase: product,
        total_payload_dt: 0,
        trip_count: Math.round(ritase) || 1,
        created_at: new Date().toISOString(),
        source: 'Book1_a19ba2da.csv'
      });
    }
    return records;
  } catch (err) {
    console.error('Failed to parse default MCR csv:', err);
    return [];
  }
};

// Initial seed data
const getInitialData = (): DatabaseSchema => {
  const today = '2026-09-28';
  const yesterday = '2026-09-27';

  const users: User[] = [
    {
      id: 'USR-001',
      name: 'Administrator KTU',
      username: 'admin',
      password: '123',
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'USR-002',
      name: 'MCR Control',
      username: 'mcr',
      password: '1234',
      role: 'ADMIN',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'USR-003',
      name: 'Checker Lapangan',
      username: 'checker',
      password: '12345',
      role: 'CHECKER',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'USR-004',
      name: 'Operation Viewer',
      username: 'operation',
      password: '123456',
      role: 'VIEWER',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00.000Z'
    }
  ];

  const master_digger: MasterDigger[] = [
    { id: 'DIG-001', nomor_unit: 'EXCA 296 LA', model: 'ZX 210 LC - 5G', bucket_factor: 1.60, bucket_factors: { WBX: 1.67, CBX: 1.60, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-002', nomor_unit: 'EXCA 297 LA', model: 'ZX 210 LC - 5G', bucket_factor: 1.60, bucket_factors: { WBX: 1.67, CBX: 1.60, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-003', nomor_unit: 'EXCA 300 LA', model: 'PC 200 - 10 MO', bucket_factor: 1.49, bucket_factors: { WBX: 1.67, CBX: 1.49, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-004', nomor_unit: 'EXCA 301 LA', model: 'PC 200 - 10 MO', bucket_factor: 1.49, bucket_factors: { WBX: 1.67, CBX: 1.49, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-005', nomor_unit: 'EXCA 157', model: 'PC 200 - 8 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-006', nomor_unit: 'EXCA 156', model: 'PC 200 - 8 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-007', nomor_unit: 'EXCA 165', model: 'PC 200 - 10 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-008', nomor_unit: 'EXCA 169 G', model: 'PC 200 - 10 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-009', nomor_unit: 'EXCA 189', model: 'PC 210 - 10 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-010', nomor_unit: 'EXCA 209', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-011', nomor_unit: 'EXCA 257', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-012', nomor_unit: 'EXCA 260', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-013', nomor_unit: 'EXCA 259', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-014', nomor_unit: 'EXCA 308', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-015', nomor_unit: 'EXCA 309', model: 'PC 200 - 10 MO CE', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-016', nomor_unit: 'EXCA 190', model: 'PC 210 - 10 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-017', nomor_unit: 'EXCA 155', model: 'PC 200 - 8 MO', bucket_factor: 1.80, bucket_factors: { WBX: 1.80, CBX: 1.80, Crushing: 0.00, FLG: 1.00 }, status: 'ACTIVE' },
    { id: 'DIG-018', nomor_unit: 'B 02', model: 'SH 350 LDH-6', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-019', nomor_unit: 'B 05', model: 'ZX 350 H - 5G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-020', nomor_unit: 'B 06', model: 'ZX 350 H - 5G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-021', nomor_unit: 'B 10', model: 'ZX 350 H - 5G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-022', nomor_unit: 'B 11', model: 'SH 350 LDH-6', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-023', nomor_unit: 'B 12', model: 'HX 340 SL', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-024', nomor_unit: 'B 15', model: 'HX 340 SL', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-025', nomor_unit: 'B 16', model: 'HX 340 SL', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-026', nomor_unit: 'B 17', model: 'HX 340 SL', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-027', nomor_unit: 'B 18', model: 'HX 340 SL', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-028', nomor_unit: 'B 19', model: 'ZX 350 H - 7G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-029', nomor_unit: 'B 20', model: 'ZX 350 H - 7G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-030', nomor_unit: 'B 21', model: 'ZX 350 H - 7G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-031', nomor_unit: 'B 22', model: 'ZX 350 H - 7G', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-032', nomor_unit: 'B 23', model: 'PC 300-8M2', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-033', nomor_unit: 'B 25', model: 'PC 300-8M2', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-034', nomor_unit: 'B 26', model: 'PC 300-8M2', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-035', nomor_unit: 'B 28', model: 'PC 300-8M2', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-036', nomor_unit: 'B 31', model: 'SY 365 H', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-037', nomor_unit: 'B 32', model: 'SY 365 H', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-038', nomor_unit: 'B 33', model: 'SY 365 H', bucket_factor: 3.47, bucket_factors: { WBX: 3.59, CBX: 3.47, Crushing: 3.39, FLG: 2.26 }, status: 'ACTIVE' },
    { id: 'DIG-039', nomor_unit: 'B 29', model: 'ZX 490 LC-7G', bucket_factor: 5.04, bucket_factors: { WBX: 6.12, CBX: 5.04, Crushing: 6.12, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-040', nomor_unit: 'B 30', model: 'ZX 490 LC-7G', bucket_factor: 5.04, bucket_factors: { WBX: 6.12, CBX: 5.04, Crushing: 6.12, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-041', nomor_unit: 'WL 07', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-042', nomor_unit: 'WL 08', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-043', nomor_unit: 'WL 09', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-044', nomor_unit: 'WL 10', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-045', nomor_unit: 'WL 11', model: 'L936H', bucket_factor: 3.84, bucket_factors: { WBX: 3.78, CBX: 3.84, Crushing: 0.00, FLG: 2.64 }, status: 'ACTIVE' },
    { id: 'DIG-046', nomor_unit: 'WL 12', model: 'L936H', bucket_factor: 3.84, bucket_factors: { WBX: 3.78, CBX: 3.84, Crushing: 0.00, FLG: 2.64 }, status: 'ACTIVE' },
    { id: 'DIG-047', nomor_unit: 'WL 15', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-048', nomor_unit: 'WL 16', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' },
    { id: 'DIG-049', nomor_unit: 'WL 17', model: 'L956 HE', bucket_factor: 5.49, bucket_factors: { WBX: 4.99, CBX: 5.49, Crushing: 4.99, FLG: 3.77 }, status: 'ACTIVE' }
  ];

  const master_hauler: MasterHauler[] = [
    // QUESTER
    { id: 'HL-001', nomor_unit: 'D 117', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-002', nomor_unit: 'D 118', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-003', nomor_unit: 'D 119', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-004', nomor_unit: 'D 120', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-005', nomor_unit: 'D 121', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-006', nomor_unit: 'D 122', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-007', nomor_unit: 'D 125', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-008', nomor_unit: 'D 127', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-009', nomor_unit: 'D 128', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-010', nomor_unit: 'D 129', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-011', nomor_unit: 'D 130', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-012', nomor_unit: 'D 131', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-013', nomor_unit: 'D 132', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-014', nomor_unit: 'D 175', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-015', nomor_unit: 'D 176', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-016', nomor_unit: 'D 177', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-017', nomor_unit: 'D 178', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-018', nomor_unit: 'D 179', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-019', nomor_unit: 'D 180', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-020', nomor_unit: 'D 181', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-021', nomor_unit: 'D 182', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-022', nomor_unit: 'D 183', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-023', nomor_unit: 'D 185', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-063', nomor_unit: 'D 133', kapasitas: 'QUESTER', status: 'ACTIVE' },
    { id: 'HL-064', nomor_unit: 'D 75', kapasitas: 'QUESTER', status: 'ACTIVE' },

    // HINO
    { id: 'HL-024', nomor_unit: 'D 165', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-025', nomor_unit: 'D 166', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-026', nomor_unit: 'D 167', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-027', nomor_unit: 'D 168', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-028', nomor_unit: 'D 169', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-029', nomor_unit: 'D 170', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-030', nomor_unit: 'D 171', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-031', nomor_unit: 'D 172', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-032', nomor_unit: 'D 173', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-033', nomor_unit: 'D 186', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-034', nomor_unit: 'D 187', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-035', nomor_unit: 'D 188', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-036', nomor_unit: 'D 189', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-037', nomor_unit: 'D 190', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-038', nomor_unit: 'D 191', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-039', nomor_unit: 'D 192', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-040', nomor_unit: 'D 193', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-041', nomor_unit: 'D 219', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-042', nomor_unit: 'D 220', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-043', nomor_unit: 'D 221', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-044', nomor_unit: 'D 222', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-045', nomor_unit: 'D 223', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-046', nomor_unit: 'D 225', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-047', nomor_unit: 'D 226', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-048', nomor_unit: 'D 227', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-049', nomor_unit: 'D 228', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-050', nomor_unit: 'D 229', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-051', nomor_unit: 'D 230', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-052', nomor_unit: 'D 231', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-053', nomor_unit: 'D 232', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-054', nomor_unit: 'D 233', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-055', nomor_unit: 'D 235', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-056', nomor_unit: 'D 236', kapasitas: 'HINO', status: 'ACTIVE' },
    { id: 'HL-057', nomor_unit: 'D 217', kapasitas: 'HINO', status: 'ACTIVE' },

    // FOTON
    { id: 'HL-058', nomor_unit: 'D 197', kapasitas: 'FOTON', status: 'ACTIVE' },
    { id: 'HL-059', nomor_unit: 'D 198', kapasitas: 'FOTON', status: 'ACTIVE' },
    { id: 'HL-060', nomor_unit: 'D 206', kapasitas: 'FOTON', status: 'ACTIVE' },
    { id: 'HL-061', nomor_unit: 'D 211', kapasitas: 'FOTON', status: 'ACTIVE' },
    { id: 'HL-062', nomor_unit: 'D 208', kapasitas: 'FOTON', status: 'ACTIVE' }
  ];

  const master_checker: MasterChecker[] = [
    { id: 'CHK-001', nama_checker: 'FIRMIANUS YOHANES', no_badge: 'KTU-CHK-01', status: 'ACTIVE' },
    { id: 'CHK-002', nama_checker: 'DIAN OGI SUGANDA', no_badge: 'KTU-CHK-02', status: 'ACTIVE' },
    { id: 'CHK-003', nama_checker: 'PLORIANUS', no_badge: 'KTU-CHK-03', status: 'ACTIVE' },
    { id: 'CHK-004', nama_checker: 'IQBAL AL MUKHLIS', no_badge: 'KTU-CHK-04', status: 'ACTIVE' },
    { id: 'CHK-005', nama_checker: 'DUTA DANIEL ALDI', no_badge: 'KTU-CHK-05', status: 'ACTIVE' },
    { id: 'CHK-006', nama_checker: 'DANDI ARWANDA', no_badge: 'KTU-CHK-06', status: 'ACTIVE' },
    { id: 'CHK-007', nama_checker: 'JULFANDI', no_badge: 'KTU-CHK-07', status: 'ACTIVE' },
    { id: 'CHK-008', nama_checker: 'SARIS', no_badge: 'KTU-CHK-08', status: 'ACTIVE' },
    { id: 'CHK-009', nama_checker: 'SUDARMAN', no_badge: 'KTU-CHK-09', status: 'ACTIVE' },
    { id: 'CHK-010', nama_checker: 'ARIF ARAHMAN', no_badge: 'KTU-CHK-10', status: 'ACTIVE' },
    { id: 'CHK-011', nama_checker: 'FEBRI SAPUTRA', no_badge: 'KTU-CHK-11', status: 'ACTIVE' },
    { id: 'CHK-012', nama_checker: 'AJI SAHRONI', no_badge: 'KTU-CHK-12', status: 'ACTIVE' },
    { id: 'CHK-013', nama_checker: 'AJI SAPUTRA', no_badge: 'KTU-CHK-13', status: 'ACTIVE' },
    { id: 'CHK-014', nama_checker: 'ERI ZAKI AFWAN ALFIAN', no_badge: 'KTU-CHK-14', status: 'ACTIVE' }
  ];

  const master_material: MasterMaterial[] = [
    { id: 'MAT-001', nama_material: 'Wbx', satuan: 'Ton', status: 'ACTIVE' },
    { id: 'MAT-002', nama_material: 'Cbx', satuan: 'Ton', status: 'ACTIVE' },
    { id: 'MAT-003', nama_material: 'Crushing', satuan: 'Ton', status: 'ACTIVE' },
    { id: 'MAT-004', nama_material: 'FLG', satuan: 'Ton', status: 'ACTIVE' }
  ];

  const master_location: MasterLocation[] = [
    { id: 'LOC-001', nama_location: 'BATUBARA ICA', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-002', nama_location: 'BAWAH CONVEYOR', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-003', nama_location: 'BK 7', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-004', nama_location: 'CONVEYOR ICA', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-005', nama_location: 'CRUSHING STOCK', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-006', nama_location: 'EFO BK 13', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-007', nama_location: 'EFO BK 16', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-008', nama_location: 'EFO HG 1', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-009', nama_location: 'EFO HG 5', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-010', nama_location: 'EFO JENTIM META', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-011', nama_location: 'EFO SELATAN', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-012', nama_location: 'EFO WS ANTAM', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-013', nama_location: 'ETO SELATAN', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-014', nama_location: 'ETO UTARA', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-015', nama_location: 'HG 5', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-016', nama_location: 'ICA', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-017', nama_location: 'JETTY ANTAM', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-018', nama_location: 'KOLAM PAK HAJI', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-019', nama_location: 'SUJIMAN', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-020', nama_location: 'TONGKANG', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-021', nama_location: 'V NOTCH', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-022', nama_location: 'WP / ETO', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-023', nama_location: 'WP UTARA', tipe: 'TO', status: 'ACTIVE' },
    { id: 'LOC-024', nama_location: 'WP 9-10', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-025', nama_location: 'WP SELATAN', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-026', nama_location: 'FLG JETTY ANTAM', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-027', nama_location: 'FLG VNOTH', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-028', nama_location: 'CRUSHING STOCK WS ATM', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-029', nama_location: 'FLG BK 30', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-030', nama_location: 'JEPANG', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-031', nama_location: 'INDONESIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-032', nama_location: 'KOREA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-033', nama_location: 'OMAN', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-034', nama_location: 'MESIR', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-035', nama_location: 'YUNANI', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-036', nama_location: 'WALES', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-037', nama_location: 'ETO BK 16', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-038', nama_location: 'CRUSHING STOCK BK 16', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-039', nama_location: 'EKUADOR', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-040', nama_location: 'QATAR', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-041', nama_location: 'VATIKAN', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-042', nama_location: 'NEPAL', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-043', nama_location: 'MALAYSIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-044', nama_location: 'WP 1/2', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-045', nama_location: 'EFO BK 30', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-046', nama_location: 'EFO UTARA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-047', nama_location: 'KOREA 9/10', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-048', nama_location: 'JENTIM META', tipe: 'BOTH', status: 'ACTIVE' },
    { id: 'LOC-049', nama_location: 'NORWEGIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-050', nama_location: 'ZAMBIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-051', nama_location: 'CEKO', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-052', nama_location: 'WP 3/4 LAMA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-053', nama_location: 'KOSOVO', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-054', nama_location: 'WALES A', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-055', nama_location: 'PIT SELATAN', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-056', nama_location: 'PIT UTARA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-057', nama_location: 'PIT/ETO', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-058', nama_location: 'KUWAIT', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-059', nama_location: 'EFO BK 7', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-060', nama_location: 'FLG PERU', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-061', nama_location: 'FINLANDIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-062', nama_location: 'HUNGARIA', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-063', nama_location: 'CRUSHING STOCK WS ANTAM', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-064', nama_location: 'FLG BK 30', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-065', nama_location: 'FLG JETTY ANTAM', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-066', nama_location: 'FLG VNOTH', tipe: 'FROM', status: 'ACTIVE' },
    { id: 'LOC-067', nama_location: 'WP 1-10', tipe: 'BOTH', status: 'ACTIVE' }
  ];

  const master_job_categories: MasterJobCategory[] = [
    { id: 'JOB-001', nama_kegiatan: 'ORE GETTING', target_harian: 10000, status: 'ACTIVE' },
    { id: 'JOB-002', nama_kegiatan: 'FEEDING', target_harian: 3000, status: 'ACTIVE' },
    { id: 'JOB-003', nama_kegiatan: 'CATCHING', target_harian: 2000, status: 'ACTIVE' },
    { id: 'JOB-004', nama_kegiatan: 'DIRECT ICA', target_harian: 1500, status: 'ACTIVE' },
    { id: 'JOB-005', nama_kegiatan: 'DIRECT CATCHING', target_harian: 1500, status: 'ACTIVE' },
    { id: 'JOB-006', nama_kegiatan: 'SUPPLY ICA', target_harian: 1000, status: 'ACTIVE' },
    { id: 'JOB-007', nama_kegiatan: 'SUPPLY JETTY', target_harian: 1000, status: 'ACTIVE' },
    { id: 'JOB-008', nama_kegiatan: 'BARGING', target_harian: 2000, status: 'ACTIVE' },
    { id: 'JOB-009', nama_kegiatan: 'DIRECT BARGING', target_harian: 2000, status: 'ACTIVE' },
    { id: 'JOB-010', nama_kegiatan: 'STOCK CBX', target_harian: 5000, status: 'ACTIVE' }
  ];

  // Pre-seed initial ritase records for Shift 1 and Shift 2 across multiple days
  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const yyyyMmDd7DaysAgo = d7.toISOString().split('T')[0];

  const d5 = new Date();
  d5.setDate(d5.getDate() - 5);
  const yyyyMmDd5DaysAgo = d5.toISOString().split('T')[0];

  const d3 = new Date();
  d3.setDate(d3.getDate() - 3);
  const yyyyMmDd3DaysAgo = d3.toISOString().split('T')[0];

  const d2 = new Date();
  d2.setDate(d2.getDate() - 2);
  const yyyyMmDd2DaysAgo = d2.toISOString().split('T')[0];

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yyyyMmDdYesterday = yesterdayDate.toISOString().split('T')[0];

  const todayDate = new Date();
  const yyyyMmDdToday = todayDate.toISOString().split('T')[0];

  const ritase: RitaseRecord[] = [];

  const audit_logs: AuditLog[] = [
    {
      id: 'AUD-001',
      entity: 'SYSTEM',
      entity_id: 'INIT',
      action: 'CREATE',
      user_id: 'USR-001',
      user_name: 'Administrator KTU',
      details: 'Inisialisasi sistem database checker PT. Karya Terang Utama',
      timestamp: `${today}T06:00:00.000Z`
    }
  ];

  const mcr_records: McrRecord[] = loadDefaultMcrRecords();

  return {
    ritase,
    users,
    master_digger,
    master_hauler,
    master_checker,
    master_material,
    master_location,
    master_job_categories,
    audit_logs,
    mcr_records
  };
};

class DatabaseManager {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.ensureDataFile();
  }

  private ensureDataFile(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      this.cache = initial;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        const initial = getInitialData();
        let changed = false;
        if (!parsed.ritase || parsed.ritase.length === 0) {
          parsed.ritase = initial.ritase;
          changed = true;
        }
        if (!parsed.master_material || parsed.master_material.length === 0) {
          parsed.master_material = initial.master_material;
          changed = true;
        }
        if (!parsed.master_checker || parsed.master_checker.length === 0) {
          parsed.master_checker = initial.master_checker;
          changed = true;
        }
        if (!parsed.master_location || parsed.master_location.length === 0) {
          parsed.master_location = initial.master_location;
          changed = true;
        } else {
          initial.master_location.forEach((initL) => {
            const existing = parsed.master_location.find((l) => l.nama_location.toLowerCase() === initL.nama_location.toLowerCase());
            if (existing) {
              existing.tipe = initL.tipe;
              changed = true;
            } else {
              parsed.master_location.push(initL);
              changed = true;
            }
          });
        }
        if (!parsed.master_digger || parsed.master_digger.length === 0) {
          parsed.master_digger = initial.master_digger;
          changed = true;
        } else {
          initial.master_digger.forEach((initD) => {
            const existing = parsed.master_digger.find((d) => d.nomor_unit === initD.nomor_unit);
            if (existing) {
              existing.bucket_factors = initD.bucket_factors;
              existing.bucket_factor = initD.bucket_factor;
              existing.model = initD.model;
              changed = true;
            } else {
              parsed.master_digger.push(initD);
              changed = true;
            }
          });
        }
        if (!parsed.master_hauler || parsed.master_hauler.length === 0) {
          parsed.master_hauler = initial.master_hauler;
          changed = true;
        } else {
          initial.master_hauler.forEach((initH) => {
            const existing = parsed.master_hauler.find((h) => h.nomor_unit === initH.nomor_unit);
            if (existing) {
              existing.kapasitas = initH.kapasitas;
              changed = true;
            } else {
              parsed.master_hauler.push(initH);
              changed = true;
            }
          });
        }
        if (!parsed.master_job_categories || parsed.master_job_categories.length === 0) {
          parsed.master_job_categories = initial.master_job_categories;
          changed = true;
        } else {
          initial.master_job_categories.forEach((initJ) => {
            const existing = parsed.master_job_categories.find((j) => j.nama_kegiatan.toLowerCase() === initJ.nama_kegiatan.toLowerCase());
            if (existing) {
              if (existing.target_harian === undefined || existing.target_harian === 0) {
                existing.target_harian = initJ.target_harian;
                changed = true;
              }
            } else {
              parsed.master_job_categories.push(initJ);
              changed = true;
            }
          });
        }
        // Ensure ritase records have operator fields
        if (parsed.ritase && parsed.ritase.length > 0) {
          parsed.ritase.forEach((r, idx) => {
            if (!r.operator_digger) {
              const defaultDigOps = ['Slamet W.', 'Agus Priyanto', 'Bambang S.', 'Hendra K.', 'Wahyu H.'];
              r.operator_digger = defaultDigOps[idx % defaultDigOps.length];
              changed = true;
            }
            if (!r.operator_dt) {
              const defaultDtOps = ['Joko Widodo', 'Rudi Hartono', 'Iwan Fals', 'Mulyadi', 'Dani Ramadhan', 'Arif Setiawan'];
              r.operator_dt = defaultDtOps[idx % defaultDtOps.length];
              changed = true;
            }
            if (!r.bucket_factor) {
              const dig = parsed.master_digger.find((d) => d.nomor_unit === r.digger_unit);
              r.bucket_factor = dig?.bucket_factor || 5.0;
              changed = true;
            }
          });
        }
        if (!parsed.mcr_records || parsed.mcr_records.length === 0) {
          parsed.mcr_records = loadDefaultMcrRecords();
          changed = true;
        }
        this.cache = parsed;
        if (changed) {
          this.save(parsed);
        }
      } catch (err) {
        console.error('Error reading db file, falling back to seed:', err);
        const initial = getInitialData();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
        this.cache = initial;
      }
    }
  }

  public get(): DatabaseSchema {
    if (!this.cache) {
      this.ensureDataFile();
    }
    return this.cache!;
  }

  public save(data: DatabaseSchema): void {
    this.cache = data;
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file safely:', err);
      // Fallback direct write
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const data = this.get();
    const newLog: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log
    };
    data.audit_logs.unshift(newLog);
    // Keep max 500 audit logs to prevent infinite file bloating
    if (data.audit_logs.length > 500) {
      data.audit_logs = data.audit_logs.slice(0, 500);
    }
    this.save(data);
  }
}

export const db = new DatabaseManager();
