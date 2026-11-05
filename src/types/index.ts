export type UserRole = 'ADMIN' | 'CHECKER' | 'VIEWER' | 'MCR' | 'PENGAWAS';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface MasterDigger {
  id: string;
  nomor_unit: string;
  model?: string;
  bucket_factor?: number; // Default bucket factor
  bucket_factors?: { WBX?: number; CBX?: number; Crushing?: number; FLG?: number; [key: string]: number | undefined }; // Material specific factors
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MasterHauler {
  id: string;
  nomor_unit: string;
  kapasitas?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MasterChecker {
  id: string;
  nama_checker: string;
  no_badge?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MasterMaterial {
  id: string;
  nama_material: string;
  satuan: 'Ton';
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MasterLocation {
  id: string;
  nama_location: string;
  tipe: 'FROM' | 'TO' | 'BOTH';
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MasterJobCategory {
  id: string;
  nama_kegiatan: string;
  target_harian: number; // Target ton per hari
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface RitaseRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss atau HH:mm
  checker_name: string;
  user_id: string;
  user_name: string;
  digger_unit: string;
  hauler_unit: string;
  operator_digger?: string; // Nama Operator Digger/Excavator
  operator_dt?: string;     // Nama Operator DT/Hauler
  from_location: string;
  to_location: string;
  material: string;
  job_category: string;
  jumlah_bucket: number;
  bucket_factor?: number;   // Bucket factor unit digger saat submit
  produksi: number;         // jumlah_bucket * bucket_factor
  satuan_produksi: string;
  kode_lot?: string;        // Kode Tumpukan / Kode Lot for Supply Jetty, Barging, Catching
  catatan?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface AuditLog {
  id: string;
  entity: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  user_id: string;
  user_name: string;
  details: string;
  timestamp: string;
}

export interface McrRecord {
  id: string;
  job_category: string;
  product: number; // Tonase atau faktor dari kolom Product
  tanggal: string; // e.g. 1-Oct, 2-Oct, atau YYYY-MM-DD
  shift: string;   // DAY, NIGHT
  loader: string;  // e.g. B 23, WL 10 (Digger)
  hauler?: string; // e.g. D 228, D 231 (Hauler / DT)
  type_loader?: string;
  type_hauler?: string;
  blok: string;    // e.g. BLOK UTARA, BLOK SELATAN
  ritase: number;  // Ritase count
  total_product_tonase: number; // Total tonase dihitung dari kolom Product * Ritase atau Total_Product_Tonase
  total_payload_dt?: number;
  trip_count?: number;
  created_at?: string;
  source?: string;
}

export interface DatabaseSchema {
  ritase: RitaseRecord[];
  users: User[];
  master_digger: MasterDigger[];
  master_hauler: MasterHauler[];
  master_checker: MasterChecker[];
  master_material: MasterMaterial[];
  master_location: MasterLocation[];
  master_job_categories: MasterJobCategory[];
  audit_logs: AuditLog[];
  mcr_records: McrRecord[];
}
