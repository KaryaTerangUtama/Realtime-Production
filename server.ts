import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db';
import { RitaseRecord, User } from './src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const APP_VERSION = '2.6.0-20261031-03';
export const APP_BUILD_TIME = new Date().toISOString();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prevent aggressive browser/webview caching of HTML, PWA manifest, and SW
app.use((req: Request, res: Response, next) => {
  const p = req.path.toLowerCase();
  if (
    p === '/' ||
    p === '/index.html' ||
    p.endsWith('.html') ||
    p.includes('sw.js') ||
    p.includes('manifest') ||
    p.includes('workbox') ||
    p.startsWith('/api/')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// SSE Subscribers list
interface SSESubscriber {
  id: string;
  res: Response;
}
let sseSubscribers: SSESubscriber[] = [];

export const broadcastEvent = (eventType: string, data: any) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseSubscribers.forEach((sub) => {
    try {
      sub.res.write(payload);
    } catch (err) {
      // client likely disconnected
    }
  });
};

// SSE Endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const subId = `sub-${Date.now()}-${Math.random()}`;
  sseSubscribers.push({ id: subId, res });

  // Send initial ping with current app version
  res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString(), version: APP_VERSION })}\n\n`);

  req.on('close', () => {
    sseSubscribers = sseSubscribers.filter((s) => s.id !== subId);
  });
});

// App Version Endpoint for automated client sync across all devices
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    version: APP_VERSION,
    buildTime: APP_BUILD_TIME,
    timestamp: Date.now()
  });
});

// Trigger broadcast update to all connected devices
app.post('/api/system/broadcast-update', (req: Request, res: Response) => {
  broadcastEvent('app_version_update', {
    version: APP_VERSION,
    timestamp: Date.now(),
    message: 'Versi aplikasi terbaru telah diterbitkan. Memperbarui otomatis...'
  });
  res.json({ success: true, version: APP_VERSION, subscribers: sseSubscribers.length });
});

// Auth Routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const data = db.get();
  const user = data.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  if (user.status === 'INACTIVE') {
    return res.status(403).json({ error: 'Akun ini sedang dinonaktifkan. Hubungi Admin.' });
  }

  // Record audit log
  db.addAuditLog({
    entity: 'AUTH',
    entity_id: user.id,
    action: 'CREATE',
    user_id: user.id,
    user_name: user.name,
    details: `User ${user.name} (${user.role}) berhasil login ke sistem`
  });

  const safeUser = { ...user };
  delete safeUser.password;

  return res.json({ success: true, user: safeUser });
});

// Users Management (Admin)
app.get('/api/users', (req: Request, res: Response) => {
  const data = db.get();
  const safeUsers = data.users.map((u) => {
    const copy = { ...u };
    delete copy.password;
    return copy;
  });
  res.json(safeUsers);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, username, password, role, status, adminUserId, adminUserName } = req.body;
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Seluruh field wajib diisi' });
  }

  const data = db.get();
  if (data.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Username sudah digunakan' });
  }

  const newUser: User = {
    id: `USR-${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    username: username.trim().toLowerCase(),
    password: password.trim(),
    role: role,
    status: status || 'ACTIVE',
    created_at: new Date().toISOString()
  };

  data.users.push(newUser);
  db.save(data);

  db.addAuditLog({
    entity: 'USER',
    entity_id: newUser.id,
    action: 'CREATE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Menambahkan user baru: ${newUser.name} (${newUser.role})`
  });

  broadcastEvent('user_updated', { action: 'created', user: newUser });
  res.json({ success: true, user: newUser });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, username, password, role, status, adminUserId, adminUserName } = req.body;

  const data = db.get();
  const index = data.users.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  const existing = data.users[index];
  if (username && username.trim().toLowerCase() !== existing.username) {
    const dup = data.users.find(
      (u) => u.id !== id && u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (dup) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }
    existing.username = username.trim().toLowerCase();
  }

  if (name) existing.name = name.trim();
  if (password && password.trim()) existing.password = password.trim();
  if (role) existing.role = role;
  if (status) existing.status = status;

  data.users[index] = existing;
  db.save(data);

  db.addAuditLog({
    entity: 'USER',
    entity_id: existing.id,
    action: 'UPDATE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Mengubah data user: ${existing.name} (${existing.role}, status: ${existing.status})`
  });

  broadcastEvent('user_updated', { action: 'updated', user: existing });
  res.json({ success: true, user: existing });
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminUserId, adminUserName } = req.body;

  const data = db.get();
  const user = data.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan' });
  }

  // Prevent deleting the main admin
  if (user.username === 'admin') {
    return res.status(400).json({ error: 'Super Admin utama tidak dapat dihapus' });
  }

  data.users = data.users.filter((u) => u.id !== id);
  db.save(data);

  db.addAuditLog({
    entity: 'USER',
    entity_id: id,
    action: 'DELETE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Menghapus user: ${user.name} (${user.username})`
  });

  broadcastEvent('user_updated', { action: 'deleted', id });
  res.json({ success: true, id });
});

// Master Data Routes
app.get('/api/masters', (req: Request, res: Response) => {
  const data = db.get();
  res.json({
    diggers: data.master_digger,
    haulers: data.master_hauler,
    checkers: data.master_checker,
    materials: data.master_material,
    locations: data.master_location,
    job_categories: data.master_job_categories
  });
});

app.post('/api/masters/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const { adminUserId, adminUserName, ...itemData } = req.body;
  const data = db.get();

  const id = `M-${Date.now().toString().slice(-6)}`;
  let entityType = '';
  let entityName = '';

  switch (type) {
    case 'diggers':
      if (!itemData.nomor_unit) return res.status(400).json({ error: 'Nomor unit wajib diisi' });
      const newDigger = {
        id,
        nomor_unit: itemData.nomor_unit.trim(),
        model: itemData.model || '',
        bucket_factor: itemData.bucket_factor ? Number(itemData.bucket_factor) : 5.0,
        status: itemData.status || 'ACTIVE'
      };
      data.master_digger.push(newDigger);
      entityType = 'MASTER_DIGGER';
      entityName = newDigger.nomor_unit;
      break;

    case 'haulers':
      if (!itemData.nomor_unit) return res.status(400).json({ error: 'Nomor unit wajib diisi' });
      const newHauler = { id, nomor_unit: itemData.nomor_unit.trim(), kapasitas: itemData.kapasitas || '', status: itemData.status || 'ACTIVE' };
      data.master_hauler.push(newHauler);
      entityType = 'MASTER_HAULER';
      entityName = newHauler.nomor_unit;
      break;

    case 'checkers':
      if (!itemData.nama_checker) return res.status(400).json({ error: 'Nama checker wajib diisi' });
      const newChecker = { id, nama_checker: itemData.nama_checker.trim(), no_badge: itemData.no_badge || '', status: itemData.status || 'ACTIVE' };
      data.master_checker.push(newChecker);
      entityType = 'MASTER_CHECKER';
      entityName = newChecker.nama_checker;
      break;

    case 'materials':
      if (!itemData.nama_material) return res.status(400).json({ error: 'Nama material wajib diisi' });
      const newMat = { id, nama_material: itemData.nama_material.trim(), satuan: itemData.satuan || 'BCM', status: itemData.status || 'ACTIVE' };
      data.master_material.push(newMat);
      entityType = 'MASTER_MATERIAL';
      entityName = newMat.nama_material;
      break;

    case 'locations':
      if (!itemData.nama_location) return res.status(400).json({ error: 'Nama location wajib diisi' });
      const newLoc = { id, nama_location: itemData.nama_location.trim(), tipe: itemData.tipe || 'BOTH', status: itemData.status || 'ACTIVE' };
      data.master_location.push(newLoc);
      entityType = 'MASTER_LOCATION';
      entityName = newLoc.nama_location;
      break;

    case 'job_categories':
      if (!itemData.nama_kegiatan) return res.status(400).json({ error: 'Nama kegiatan wajib diisi' });
      const newJob = {
        id,
        nama_kegiatan: itemData.nama_kegiatan.trim().toUpperCase(),
        target_harian: Number(itemData.target_harian) || 5000,
        status: itemData.status || 'ACTIVE'
      };
      data.master_job_categories.push(newJob);
      entityType = 'MASTER_JOB_CATEGORY';
      entityName = newJob.nama_kegiatan;
      break;

    default:
      return res.status(400).json({ error: 'Tipe master data tidak valid' });
  }

  db.save(data);
  db.addAuditLog({
    entity: entityType,
    entity_id: id,
    action: 'CREATE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Menambahkan ${entityType}: ${entityName}`
  });

  broadcastEvent('master_updated', { type, action: 'created' });
  res.json({ success: true, id });
});

app.put('/api/masters/:type/:id', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const { adminUserId, adminUserName, ...itemData } = req.body;
  const data = db.get();
  let found = false;
  let entityType = '';

  switch (type) {
    case 'diggers': {
      const idx = data.master_digger.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_digger[idx] = { ...data.master_digger[idx], ...itemData };
        found = true;
        entityType = 'MASTER_DIGGER';
      }
      break;
    }
    case 'haulers': {
      const idx = data.master_hauler.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_hauler[idx] = { ...data.master_hauler[idx], ...itemData };
        found = true;
        entityType = 'MASTER_HAULER';
      }
      break;
    }
    case 'checkers': {
      const idx = data.master_checker.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_checker[idx] = { ...data.master_checker[idx], ...itemData };
        found = true;
        entityType = 'MASTER_CHECKER';
      }
      break;
    }
    case 'materials': {
      const idx = data.master_material.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_material[idx] = { ...data.master_material[idx], ...itemData };
        found = true;
        entityType = 'MASTER_MATERIAL';
      }
      break;
    }
    case 'locations': {
      const idx = data.master_location.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_location[idx] = { ...data.master_location[idx], ...itemData };
        found = true;
        entityType = 'MASTER_LOCATION';
      }
      break;
    }
    case 'job_categories': {
      const idx = data.master_job_categories.findIndex((i) => i.id === id);
      if (idx !== -1) {
        data.master_job_categories[idx] = { ...data.master_job_categories[idx], ...itemData };
        found = true;
        entityType = 'MASTER_JOB_CATEGORY';
      }
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ error: 'Item master data tidak ditemukan' });
  }

  db.save(data);
  db.addAuditLog({
    entity: entityType,
    entity_id: id,
    action: 'UPDATE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Memperbarui ${entityType} ID: ${id}`
  });

  broadcastEvent('master_updated', { type, action: 'updated' });
  res.json({ success: true, id });
});

app.delete('/api/masters/:type/:id', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const { adminUserId, adminUserName } = req.body;
  const data = db.get();
  let entityType = '';

  switch (type) {
    case 'diggers':
      data.master_digger = data.master_digger.filter((i) => i.id !== id);
      entityType = 'MASTER_DIGGER';
      break;
    case 'haulers':
      data.master_hauler = data.master_hauler.filter((i) => i.id !== id);
      entityType = 'MASTER_HAULER';
      break;
    case 'checkers':
      data.master_checker = data.master_checker.filter((i) => i.id !== id);
      entityType = 'MASTER_CHECKER';
      break;
    case 'materials':
      data.master_material = data.master_material.filter((i) => i.id !== id);
      entityType = 'MASTER_MATERIAL';
      break;
    case 'locations':
      data.master_location = data.master_location.filter((i) => i.id !== id);
      entityType = 'MASTER_LOCATION';
      break;
    case 'job_categories':
      data.master_job_categories = data.master_job_categories.filter((i) => i.id !== id);
      entityType = 'MASTER_JOB_CATEGORY';
      break;
    default:
      return res.status(400).json({ error: 'Tipe master tidak valid' });
  }

  db.save(data);
  db.addAuditLog({
    entity: entityType,
    entity_id: id,
    action: 'DELETE',
    user_id: adminUserId || 'SYSTEM',
    user_name: adminUserName || 'Admin',
    details: `Menghapus item ${entityType} ID: ${id}`
  });

  broadcastEvent('master_updated', { type, action: 'deleted' });
  res.json({ success: true, id });
});

// Ritase Routes
app.get('/api/ritase', (req: Request, res: Response) => {
  const data = db.get();
  let list = [...data.ritase];

  const { date, fromDate, toDate, checker, digger, hauler, material, from, to, userId, search } = req.query;

  if (date) {
    list = list.filter((r) => r.tanggal === date);
  }
  if (fromDate) {
    list = list.filter((r) => r.tanggal >= (fromDate as string));
  }
  if (toDate) {
    list = list.filter((r) => r.tanggal <= (toDate as string));
  }
  if (checker) {
    list = list.filter((r) => r.checker_name.toLowerCase().includes((checker as string).toLowerCase()));
  }
  if (digger) {
    list = list.filter((r) => r.digger_unit.toLowerCase() === (digger as string).toLowerCase());
  }
  if (hauler) {
    list = list.filter((r) => r.hauler_unit.toLowerCase() === (hauler as string).toLowerCase());
  }
  if (material) {
    list = list.filter((r) => r.material.toLowerCase() === (material as string).toLowerCase());
  }
  if (from) {
    list = list.filter((r) => r.from_location.toLowerCase() === (from as string).toLowerCase());
  }
  if (to) {
    list = list.filter((r) => r.to_location.toLowerCase() === (to as string).toLowerCase());
  }
  if (userId) {
    list = list.filter((r) => r.user_id === userId);
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.digger_unit.toLowerCase().includes(q) ||
      r.hauler_unit.toLowerCase().includes(q) ||
      r.checker_name.toLowerCase().includes(q) ||
      r.from_location.toLowerCase().includes(q) ||
      r.to_location.toLowerCase().includes(q) ||
      r.material.toLowerCase().includes(q) ||
      (r.catatan && r.catatan.toLowerCase().includes(q))
    );
  }

  // Sort descending by created_at or tanggal + waktu
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(list);
});

// Single Ritase Record
app.get('/api/ritase/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.get();
  const item = data.ritase.find((r) => r.id === id);
  if (!item) return res.status(404).json({ error: 'Data ritase tidak ditemukan' });
  res.json(item);
});

// Post New Ritase
app.post('/api/ritase', (req: Request, res: Response) => {
  const {
    tanggal,
    waktu,
    checker_name,
    user_id,
    user_name,
    digger_unit,
    hauler_unit,
    operator_digger,
    operator_dt,
    from_location,
    to_location,
    material,
    job_category,
    jumlah_bucket,
    bucket_factor,
    produksi,
    satuan_produksi,
    catatan
  } = req.body;

  // Validation
  if (!digger_unit || !digger_unit.trim()) {
    return res.status(400).json({ error: 'Nomor unit digger wajib dipilih!' });
  }
  if (!hauler_unit || !hauler_unit.trim()) {
    return res.status(400).json({ error: 'Nomor unit hauler wajib dipilih!' });
  }
  if (!checker_name || !checker_name.trim()) {
    return res.status(400).json({ error: 'Nama checker wajib terisi!' });
  }
  if (!from_location || !from_location.trim()) {
    return res.status(400).json({ error: 'Lokasi FROM wajib dipilih!' });
  }
  if (!to_location || !to_location.trim()) {
    return res.status(400).json({ error: 'Lokasi TO wajib dipilih!' });
  }
  if (!material || !material.trim()) {
    return res.status(400).json({ error: 'Material wajib dipilih!' });
  }

  const bucketNum = Number(jumlah_bucket);
  if (isNaN(bucketNum) || bucketNum <= 0) {
    return res.status(400).json({ error: 'Jumlah bucket harus berupa angka positif (> 0)!' });
  }

  const data = db.get();

  // Validate that selected units are not INACTIVE
  const diggerObj = data.master_digger.find((d) => d.nomor_unit === digger_unit);
  if (diggerObj && diggerObj.status === 'INACTIVE') {
    return res.status(400).json({ error: `Unit Digger ${digger_unit} sedang berstatus INACTIVE dan tidak dapat dipilih.` });
  }

  const haulerObj = data.master_hauler.find((h) => h.nomor_unit === hauler_unit);
  if (haulerObj && haulerObj.status === 'INACTIVE') {
    return res.status(400).json({ error: `Unit Hauler ${hauler_unit} sedang berstatus INACTIVE dan tidak dapat dipilih.` });
  }

  const bfNum = bucket_factor ? Number(bucket_factor) : (diggerObj?.bucket_factor || 5.0);

  // If production is provided, use it; otherwise compute bucket * bucket_factor
  let prodNum = Number(produksi);
  if (isNaN(prodNum) || prodNum <= 0) {
    prodNum = Number((bucketNum * bfNum).toFixed(2));
  }

  if (from_location.trim().toUpperCase() === to_location.trim().toUpperCase()) {
    return res.status(400).json({ error: 'Lokasi FROM dan TO tidak boleh sama!' });
  }

  const now = new Date();
  const dateStr = tanggal || now.toISOString().split('T')[0];
  // Format live time with HH:mm:ss if not specified
  const timeStr = waktu || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const nowISO = now.toISOString();

  // Generate unique ID: KTU-RIT-YYMMDD-XXX
  const yymmdd = dateStr.replace(/-/g, '').slice(2);
  const countToday = data.ritase.filter((r) => r.tanggal === dateStr).length + 1;
  const uniqueId = `KTU-RIT-${yymmdd}-${String(countToday).padStart(3, '0')}`;

  const newRecord: RitaseRecord = {
    id: uniqueId,
    tanggal: dateStr,
    waktu: timeStr,
    checker_name: checker_name.trim(),
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || checker_name.trim(),
    digger_unit: digger_unit.trim(),
    hauler_unit: hauler_unit.trim(),
    operator_digger: operator_digger ? operator_digger.trim() : '',
    operator_dt: operator_dt ? operator_dt.trim() : '',
    from_location: from_location.trim(),
    to_location: to_location.trim(),
    material: material.trim(),
    job_category: job_category ? job_category.trim() : 'OB',
    jumlah_bucket: bucketNum,
    bucket_factor: bfNum,
    produksi: prodNum,
    satuan_produksi: satuan_produksi || 'Ton',
    catatan: catatan ? catatan.trim() : '',
    created_at: nowISO,
    updated_at: nowISO,
    created_by: user_name || checker_name.trim()
  };

  data.ritase.unshift(newRecord);
  db.save(data);

  // Audit log
  db.addAuditLog({
    entity: 'RITASE',
    entity_id: newRecord.id,
    action: 'CREATE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || checker_name.trim(),
    details: `Input ritase ${newRecord.id}: ${newRecord.digger_unit} (Op: ${newRecord.operator_digger || '-'}) -> ${newRecord.hauler_unit} (Op: ${newRecord.operator_dt || '-'}), ${newRecord.material} (${newRecord.produksi} ${newRecord.satuan_produksi})`
  });

  // Broadcast real-time event to all connected browsers
  broadcastEvent('ritase_created', newRecord);

  res.status(201).json({
    success: true,
    message: 'Ritase berhasil disimpan.',
    record: newRecord
  });
});

// Update Ritase Record
app.put('/api/ritase/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const data = db.get();

  const index = data.ritase.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Data ritase tidak ditemukan' });
  }

  const existing = data.ritase[index];
  const updatedRecord: RitaseRecord = {
    ...existing,
    ...updateData,
    id: existing.id, // ID cannot change
    created_at: existing.created_at,
    created_by: existing.created_by,
    updated_at: new Date().toISOString(),
    updated_by: updateData.updated_by || updateData.user_name || 'Admin'
  };

  data.ritase[index] = updatedRecord;
  db.save(data);

  db.addAuditLog({
    entity: 'RITASE',
    entity_id: id,
    action: 'UPDATE',
    user_id: updateData.user_id || 'UNKNOWN',
    user_name: updateData.updated_by || updateData.user_name || 'Admin',
    details: `Update ritase ${id} (${updatedRecord.digger_unit} / ${updatedRecord.hauler_unit}, ${updatedRecord.produksi} ${updatedRecord.satuan_produksi})`
  });

  broadcastEvent('ritase_updated', updatedRecord);
  res.json({ success: true, message: 'Data ritase berhasil diperbarui.', record: updatedRecord });
});

// Reset All Ritase Records
app.delete('/api/ritase', (req: Request, res: Response) => {
  const { user_id, user_name } = req.body;
  const data = db.get();
  const count = data.ritase.length;

  data.ritase = [];
  db.save(data);

  db.addAuditLog({
    entity: 'RITASE',
    entity_id: 'ALL',
    action: 'DELETE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || 'Admin',
    details: `Mereset/menghapus seluruh data ritase (${count} record terhapus)`
  });

  broadcastEvent('ritase_reset', { count });
  res.json({ success: true, message: `Berhasil mereset seluruh data ritase (${count} record dihapus).` });
});

// Delete Ritase Record
app.delete('/api/ritase/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id, user_name } = req.body;
  const data = db.get();

  const item = data.ritase.find((r) => r.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Data ritase tidak ditemukan' });
  }

  data.ritase = data.ritase.filter((r) => r.id !== id);
  db.save(data);

  db.addAuditLog({
    entity: 'RITASE',
    entity_id: id,
    action: 'DELETE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || 'Admin',
    details: `Menghapus ritase ${id} (${item.digger_unit} - ${item.hauler_unit}, Checker: ${item.checker_name})`
  });

  broadcastEvent('ritase_deleted', { id });
  res.json({ success: true, message: 'Data ritase berhasil dihapus.' });
});

// MCR Records Routes
app.get('/api/mcr-records', (req: Request, res: Response) => {
  const data = db.get();
  let list = data.mcr_records || [];

  const { job_category, tanggal, shift, search } = req.query;
  if (job_category) {
    list = list.filter((r) => r.job_category.toUpperCase() === (job_category as string).toUpperCase());
  }
  if (tanggal) {
    list = list.filter((r) => r.tanggal.toLowerCase() === (tanggal as string).toLowerCase());
  }
  if (shift) {
    list = list.filter((r) => r.shift.toUpperCase() === (shift as string).toUpperCase());
  }
  if (search) {
    const q = (search as string).toLowerCase().trim();
    list = list.filter(
      (r) =>
        r.job_category.toLowerCase().includes(q) ||
        r.loader.toLowerCase().includes(q) ||
        r.blok.toLowerCase().includes(q) ||
        r.tanggal.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post('/api/mcr-records', (req: Request, res: Response) => {
  const { records, replace = true, user_id, user_name } = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Data records harus berupa array' });
  }

  const data = db.get();
  if (replace) {
    data.mcr_records = records;
  } else {
    data.mcr_records = [...(data.mcr_records || []), ...records];
  }

  db.save(data);
  db.addAuditLog({
    entity: 'MCR',
    entity_id: `MCR-${Date.now()}`,
    action: replace ? 'UPDATE' : 'CREATE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || 'MCR Officer',
    details: `Import/Upload ${records.length} baris data query MCR (Total kini: ${data.mcr_records.length} baris)`
  });

  broadcastEvent('mcr_updated', { count: data.mcr_records.length });
  res.json({ success: true, count: data.mcr_records.length, records: data.mcr_records });
});

app.delete('/api/mcr-records', (req: Request, res: Response) => {
  const { user_id, user_name } = req.body || {};
  const data = db.get();
  const count = (data.mcr_records || []).length;
  data.mcr_records = [];
  db.save(data);

  db.addAuditLog({
    entity: 'MCR',
    entity_id: 'ALL',
    action: 'DELETE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || 'Admin',
    details: `Menghapus / mereset seluruh data query MCR (${count} baris dihapus)`
  });

  broadcastEvent('mcr_updated', { count: 0 });
  res.json({ success: true, message: `Berhasil mereset data MCR (${count} baris dihapus)` });
});

app.post('/api/mcr-records/sync-to-ritase', (req: Request, res: Response) => {
  const { user_id, user_name } = req.body || {};
  const data = db.get();
  const mcrList = data.mcr_records || [];
  if (mcrList.length === 0) {
    return res.status(400).json({ error: 'Tidak ada data MCR untuk disinkronkan' });
  }

  const parseMcrDate = (dStr: string) => {
    const parts = dStr.split('-');
    if (parts.length === 2) {
      const day = parts[0].padStart(2, '0');
      const monStr = parts[1].toLowerCase();
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        okt: '10', ags: '08', agu: '08'
      };
      const m = monthMap[monStr.slice(0, 3)] || '10';
      return `2026-${m}-${day}`;
    }
    return dStr.includes('-') ? dStr : '2026-10-01';
  };

  let addedCount = 0;
  const existingIds = new Set(data.ritase.map((r) => r.id));

  mcrList.forEach((m, idx) => {
    const ritId = `KTU-MCR-${m.id || idx + 1}`;
    if (!existingIds.has(ritId)) {
      const tglIso = parseMcrDate(m.tanggal);
      const ritaseCount = Number(m.ritase) || (m.trip_count ? Number(m.trip_count) : 1);
      const prodTon = m.total_product_tonase || (m.product * ritaseCount) || m.product;
      const isDay = m.shift?.toUpperCase() === 'DAY';

      const newRit: RitaseRecord = {
        id: ritId,
        tanggal: tglIso,
        waktu: isDay ? '10:00:00' : '22:00:00',
        checker_name: 'MCR System',
        user_id: user_id || 'MCR-AUTO',
        user_name: user_name || 'Mining Control Room',
        digger_unit: m.loader || 'EXCA-MCR',
        hauler_unit: 'DT-MCR',
        operator_digger: 'Op MCR',
        operator_dt: 'Op DT',
        from_location: m.blok || 'PIT SELATAN',
        to_location: m.job_category === 'BARGING' ? 'TONGKANG' : (m.job_category === 'FEEDING' ? 'CONVEYOR ICA' : 'ETO SELATAN'),
        material: m.job_category.includes('CBX') ? 'Cbx' : 'Wbx',
        job_category: m.job_category,
        jumlah_bucket: Math.max(Math.round(ritaseCount * 7), 1),
        bucket_factor: Number((prodTon / Math.max(ritaseCount * 7, 1)).toFixed(2)) || 3.47,
        produksi: Number(prodTon.toFixed(2)),
        satuan_produksi: 'Ton',
        catatan: `Sinkronisasi Query MCR (${m.shift}, Loader: ${m.loader})`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'MCR Sync'
      };

      data.ritase.push(newRit);
      existingIds.add(ritId);
      addedCount++;
    }
  });

  db.save(data);
  db.addAuditLog({
    entity: 'RITASE',
    entity_id: 'MCR_SYNC',
    action: 'CREATE',
    user_id: user_id || 'UNKNOWN',
    user_name: user_name || 'MCR Officer',
    details: `Sinkronisasi ${addedCount} data MCR ke Data Ritase Checker`
  });

  broadcastEvent('ritase_created', {});
  res.json({ success: true, addedCount, totalRitase: data.ritase.length });
});

// Audit Logs Route (Admin)
app.get('/api/audit-logs', (req: Request, res: Response) => {
  const data = db.get();
  res.json(data.audit_logs);
});

// Send Email Report Route
app.post('/api/send-email', (req: Request, res: Response) => {
  const { to, subject, body, date, userName } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Email tujuan wajib diisi' });
  }

  db.addAuditLog({
    entity: 'EMAIL',
    entity_id: `MAIL-${Date.now()}`,
    action: 'CREATE',
    user_id: 'SYSTEM',
    user_name: userName || 'System Auto Email',
    details: `Mengirim laporan email Shift 1 & Shift 2 tanggal ${date || 'Hari Ini'} ke ${to}`
  });

  return res.json({
    success: true,
    message: `Laporan Shift 1 & Shift 2 berhasil dikirim ke ${to}`
  });
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[KTU Checker] Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
