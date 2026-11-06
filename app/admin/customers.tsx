"use client";
import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Users, ArrowUpRight, Trash2, Phone, MessageCircle } from 'lucide-react';
import { Modal } from '../ui';

type Lead = { id: string; name: string; phone: string; address: string; product_name: string; quantity: number; note: string; created_at: number; status: string };
const STATUS: Record<string, string> = { new: 'Mới', contacted: 'Đã liên hệ', done: 'Hoàn tất' };
const zaloLink = (phone: string) => 'https://zalo.me/' + phone.replace(/^\+?84/, '0').replace(/\D/g, '');

export default function Customers() {
  const [leads, setLeads] = useState<Lead[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(''), [filter, setFilter] = useState('all'), [deleting, setDeleting] = useState<Lead | null>(null), [working, setWorking] = useState('');
  async function call(url: string, init?: RequestInit) {
    const r = await fetch(url, { ...init, cache: 'no-store' });
    if (r.status === 401) { window.location.replace('/admin/login'); throw new Error('Phiên đăng nhập đã hết hạn.'); }
    const x = await r.json().catch(() => ({})) as any;
    if (!r.ok) throw new Error(x.error ?? 'Không thể thực hiện yêu cầu.');
    return x;
  }
  async function load() { setBusy(true); setError(''); try { const x = await call('/api/admin/leads'); setLeads(x.leads); } catch (e) { setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.'); } finally { setBusy(false); } }
  async function setStatus(l: Lead, status: string) {
    setWorking(l.id); setError('');
    try { await call('/api/admin/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, status }) }); setLeads(prev => prev.map(x => x.id === l.id ? { ...x, status } : x)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật.'); } finally { setWorking(''); }
  }
  async function remove() {
    if (!deleting) return; setWorking(deleting.id); setError('');
    try { await call('/api/admin/leads?id=' + deleting.id, { method: 'DELETE' }); setLeads(prev => prev.filter(x => x.id !== deleting.id)); setDeleting(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể xóa.'); setDeleting(null); } finally { setWorking(''); }
  }
  useEffect(() => { load(); }, []);
  const shown = leads.filter(l => filter === 'all' || l.status === filter);
  const count = (s: string) => leads.filter(l => l.status === s).length;
  return <>
    <section className="integration-card"><div><span className="integration-dot ready" /><div><h2>Thông tin khách hàng được lưu tại Chen Shop</h2><p>Các yêu cầu gửi từ trang sản phẩm, túi hàng và form tư vấn hiển thị ở đây. Chỉ người có mật khẩu quản trị mới xem được.</p></div></div><div className="integration-actions"><a href="/lien-he" target="_blank" rel="noreferrer" className="btn outline">Mở form tư vấn <ArrowUpRight size={15} /></a></div></section>
    {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
    <section className="inventory">
      <div className="inventory-top">
        <div className="inventory-tabs">{[['all', 'Tất cả', leads.length], ['new', 'Mới', count('new')], ['contacted', 'Đã liên hệ', count('contacted')], ['done', 'Hoàn tất', count('done')]].map(([id, label, n]) => <button key={id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(String(id))}>{label}<span>{n}</span></button>)}</div>
        <button className="icon-btn" aria-label="Tải lại khách hàng" onClick={load} disabled={busy}><RefreshCw size={17} className={busy ? 'spin' : ''} /></button>
      </div>
      {!shown.length ? <div className="empty-state"><Users size={34} /><h3>{busy ? 'Đang tải yêu cầu…' : filter === 'all' ? 'Chưa có yêu cầu mới.' : 'Không có yêu cầu ở trạng thái này.'}</h3><p>Khách để lại thông tin trên trang sản phẩm hoặc mục Liên hệ sẽ xuất hiện ở đây.</p></div> :
        <div className="table-scroll"><table className="products-table leads-table"><thead><tr>{['THỜI GIAN', 'KHÁCH HÀNG', 'SẢN PHẨM', 'ĐỊA CHỈ / GHI CHÚ', 'TRẠNG THÁI', ''].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{shown.map(l => <tr key={l.id}>
          <td data-label="Thời gian">{new Date(l.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}<small>{l.id.slice(0, 8).toUpperCase()}</small></td>
          <td data-label="Khách hàng"><strong>{l.name}</strong><span className="lead-contact-links"><a href={'tel:' + l.phone}><Phone size={12} /> {l.phone}</a><a href={zaloLink(l.phone)} target="_blank" rel="noreferrer"><MessageCircle size={12} /> Zalo</a></span></td>
          <td data-label="Sản phẩm">{l.product_name}<small>Số lượng: {l.quantity}</small></td>
          <td data-label="Địa chỉ / ghi chú" className="lead-note-cell">{l.address || 'Chưa có địa chỉ'}<small>{l.note}</small></td>
          <td data-label="Trạng thái"><select className={`lead-status ${l.status}`} aria-label={`Trạng thái yêu cầu của ${l.name}`} value={l.status} disabled={working === l.id} onChange={e => setStatus(l, e.target.value)}>{Object.entries(STATUS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></td>
          <td><button className="icon-btn danger" aria-label={`Xóa yêu cầu của ${l.name}`} title="Xóa yêu cầu" disabled={working === l.id} onClick={() => setDeleting(l)}><Trash2 size={16} /></button></td>
        </tr>)}</tbody></table></div>}
    </section>
    <Modal open={!!deleting} onClose={() => { if (!working) setDeleting(null); }} title="Xóa yêu cầu?"><div className="delete-confirm"><div className="delete-icon"><Trash2 size={30} /></div><p>Yêu cầu của <strong>{deleting?.name}</strong> sẽ bị xóa vĩnh viễn.</p><p className="muted">Nếu đã xử lý xong, bạn có thể chọn trạng thái “Hoàn tất” thay vì xóa.</p><div><button className="btn outline" disabled={!!working} onClick={() => setDeleting(null)}>Giữ lại</button><button className="btn red" disabled={!!working} onClick={remove}>{working ? 'Đang xóa…' : 'Xóa yêu cầu'}</button></div></div></Modal>
  </>;
}
