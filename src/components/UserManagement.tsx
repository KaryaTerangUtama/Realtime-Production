import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Eye,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Search,
  Power
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  users: User[];
  currentUser: User | null;
  onCreateUser: (payload: any) => Promise<boolean>;
  onUpdateUser: (id: string, payload: any) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<boolean>;
  onResetRitase?: () => Promise<void>;
  ritaseCount?: number;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onResetRitase,
  ritaseCount
}) => {
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'CHECKER' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'CHECKER',
      status: 'ACTIVE'
    });
    setErrorMsg(null);
  };

  const openCreate = () => {
    resetForm();
    setCreateModal(true);
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      username: u.username,
      password: '',
      role: u.role,
      status: u.status
    });
    setErrorMsg(null);
    setEditModal(true);
  };

  const openDelete = (u: User) => {
    setSelectedUser(u);
    setDeleteModal(true);
  };

  const handleToggleStatus = async (u: User) => {
    if (u.username === 'admin') {
      alert('Super Admin utama tidak dapat dinonaktifkan.');
      return;
    }
    const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await onUpdateUser(u.id, {
      ...u,
      status: nextStatus,
      adminUserId: currentUser?.id,
      adminUserName: currentUser?.name
    });
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const ok = await onCreateUser({
        ...formData,
        adminUserId: currentUser?.id,
        adminUserName: currentUser?.name
      });
      if (ok) {
        setCreateModal(false);
        resetForm();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat user baru');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        status: formData.status,
        adminUserId: currentUser?.id,
        adminUserName: currentUser?.name
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      const ok = await onUpdateUser(selectedUser.id, payload);
      if (ok) {
        setEditModal(false);
        setSelectedUser(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const ok = await onDeleteUser(selectedUser.id);
      if (ok) {
        setDeleteModal(false);
        setSelectedUser(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#7B1113] text-[#FAF7F2] border border-[#580A0B]">
            <ShieldCheck className="w-3 h-3 text-amber-300" /> ADMIN
          </span>
        );
      case 'CHECKER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1B4332] text-[#E8F5E9] border border-[#2D6A4F]">
            <UserCheck className="w-3 h-3 text-emerald-300" /> CHECKER
          </span>
        );
      case 'PENGAWAS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#7C2D12] text-[#FFEDD5] border border-[#9A3412]">
            <ShieldCheck className="w-3 h-3 text-amber-300" /> PENGAWAS
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#1E3A8A] text-[#DBEAFE] border border-[#1D4ED8]">
            <Eye className="w-3 h-3 text-blue-300" /> VIEWER
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#FAF7F2] rounded-2xl p-5 shadow-xs border border-[#E2D7C5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-[#E5C992] px-2.5 py-0.5 rounded-md border border-[#D1B378]">
                Akses Kontrol & Hak Akses
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#181A1F] tracking-tight mt-1">
              MANAJEMEN PENGGUNA (MULTI-USER)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Kelola akun petugas Checker di pit, pengawas Viewer, dan Administrator sistem ritase PT. Karya Terang Utama.
            </p>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] font-bold text-xs shadow-xs transition-colors cursor-pointer border border-[#580A0B]"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          <span>TAMBAH PENGGUNA BARU</span>
        </button>
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E2D7C5] shadow-xs">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Total Pengguna</span>
          <div className="text-2xl font-black text-[#181A1F] font-mono mt-1">{users.length}</div>
          <span className="text-[11px] text-stone-500">Terdaftar di sistem</span>
        </div>
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E2D7C5] shadow-xs">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Checker</span>
          <div className="text-2xl font-black text-emerald-800 font-mono mt-1">
            {users.filter((u) => u.role === 'CHECKER').length}
          </div>
          <span className="text-[11px] text-stone-500">Petugas pencatat ritase</span>
        </div>
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E2D7C5] shadow-xs">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Administrator</span>
          <div className="text-2xl font-black text-[#7B1113] font-mono mt-1">
            {users.filter((u) => u.role === 'ADMIN').length}
          </div>
          <span className="text-[11px] text-stone-500">Akses penuh & master</span>
        </div>
        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E2D7C5] shadow-xs">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Viewer</span>
          <div className="text-2xl font-black text-blue-800 font-mono mt-1">
            {users.filter((u) => u.role === 'VIEWER').length}
          </div>
          <span className="text-[11px] text-stone-500">Monitoring & summary</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#FAF7F2] rounded-2xl shadow-xs border border-[#E2D7C5] overflow-hidden">
        <div className="p-4 border-b border-[#E2D7C5] bg-[#F5EFE6] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
            />
          </div>
          <span className="text-xs text-stone-600 font-bold">
            Total <strong className="text-[#181A1F]">{filteredUsers.length}</strong> pengguna
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-[#14161B] text-[#FAF7F2] uppercase font-black border-b border-[#282A32]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">NO</th>
                <th className="py-3 px-4">USER ID</th>
                <th className="py-3 px-4">NAMA LENGKAP</th>
                <th className="py-3 px-4">USERNAME</th>
                <th className="py-3 px-4">ROLE HAK AKSES</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D7C5]">
              {filteredUsers.map((u, idx) => {
                const isActive = u.status === 'ACTIVE';
                return (
                  <tr key={u.id} className="hover:bg-[#EDE4D5] transition-colors odd:bg-[#FAF7F2] even:bg-[#F5EFE6]">
                    <td className="py-3 px-4 text-center font-bold text-stone-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-600">
                      {u.id}
                    </td>
                    <td className="py-3 px-4 font-black text-[#181A1F] text-sm">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-700 font-semibold">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        title="Klik untuk ubah status Active/Inactive"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#E8F5E9] text-emerald-900 border border-emerald-300 hover:bg-[#C8E6C9]'
                            : 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{u.status}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit User"
                          className="p-1.5 rounded-lg hover:bg-amber-200/60 text-amber-800 transition-colors cursor-pointer border border-transparent hover:border-amber-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => openDelete(u)}
                            title="Hapus User"
                            className="p-1.5 rounded-lg hover:bg-rose-200/60 text-[#7B1113] transition-colors cursor-pointer border border-transparent hover:border-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveCreate}
            className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide">
                Tambah Pengguna Baru
              </h3>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Nama Lengkap <span className="text-[#7B1113]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dedi Pratama"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Username <span className="text-[#7B1113]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="dedi.checker"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Password <span className="text-[#7B1113]">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Role / Peran</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="CHECKER">CHECKER (Dapat input ritase lapangan)</option>
                  <option value="PENGAWAS">PENGAWAS (Melihat dashboard & data ritase)</option>
                  <option value="ADMIN">ADMIN (Akses penuh + master data)</option>
                  <option value="VIEWER">VIEWER (Melihat dashboard & data ritase)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Status Akun</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ACTIVE">ACTIVE (Dapat login)</option>
                  <option value="INACTIVE">INACTIVE (Diblokir)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden"
          >
            <div className="bg-[#14161B] p-5 border-b-2 border-[#7B1113] flex items-center justify-between">
              <h3 className="text-sm font-black text-[#FAF7F2] uppercase tracking-wide">
                Edit User: {selectedUser.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="p-1 text-[#D8CEBF] hover:text-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs bg-[#FAF7F2]">
              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs border border-rose-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs text-[#181A1F] font-bold focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  disabled={selectedUser.username === 'admin'}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] disabled:opacity-50 focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Reset Password <span className="text-stone-500 font-normal">(Kosongkan jika tidak diubah)</span>
                </label>
                <input
                  type="password"
                  placeholder="Ketik password baru..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-mono text-[#181A1F] focus:outline-none focus:border-[#7B1113]"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Role</label>
                <select
                  disabled={selectedUser.username === 'admin'}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] disabled:opacity-50 focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="CHECKER">CHECKER</option>
                  <option value="PENGAWAS">PENGAWAS</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Status</label>
                <select
                  disabled={selectedUser.username === 'admin'}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-[#F5EFE6] border border-[#D6C7B2] rounded-xl text-xs font-bold text-[#181A1F] disabled:opacity-50 focus:outline-none focus:border-[#7B1113]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2D7C5]">
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="px-4 py-2.5 border border-[#D6C7B2] bg-[#EDE4D5] rounded-xl text-xs font-bold text-[#181A1F] hover:bg-[#E2D7C5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold rounded-xl disabled:opacity-50 border border-[#580A0B] cursor-pointer"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14161B]/85 p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border-2 border-[#E2D7C5] overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#7B1113] flex items-center justify-center mx-auto border border-rose-300">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-[#181A1F]">
                Hapus Pengguna {selectedUser.name}?
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                Akun pengguna <strong>@{selectedUser.username}</strong> ({selectedUser.role}) akan dihapus dari sistem. Catatan ritase masa lampau yang diinput oleh user ini tetap akan tersimpan di database.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-[#E2D7C5]">
              <button
                type="button"
                onClick={() => setDeleteModal(false)}
                className="px-5 py-2.5 rounded-xl border border-[#D6C7B2] bg-[#EDE4D5] text-[#181A1F] text-xs font-bold hover:bg-[#E2D7C5] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] text-xs font-bold disabled:opacity-50 border border-[#580A0B] cursor-pointer"
              >
                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* RESET RITASE DATA SECTION (ADMIN) */}
      {currentUser?.role === 'ADMIN' && (
        <div className="bg-[#FAF7F2] rounded-3xl p-6 shadow-xs border-2 border-amber-300 space-y-4 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#181A1F] uppercase tracking-wider">
                  Zona Berbahaya: Reset Seluruh Data Ritase Terinput
                </h3>
                <p className="text-xs text-stone-600">
                  Total record ritase saat ini di database: <strong className="text-[#7B1113] font-mono">{ritaseCount || 0} Record</strong>. Tombol ini akan menghapus seluruh data ritase secara permanen.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onResetRitase}
              className="px-5 py-3 rounded-xl bg-[#7B1113] hover:bg-[#5E0B0C] text-[#FAF7F2] font-black text-xs shadow-md transition-all cursor-pointer border border-[#580A0B] flex items-center justify-center gap-2 shrink-0"
            >
              <Trash2 className="w-4 h-4 text-amber-300" />
              <span>RESET SELURUH DATA RITASE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
