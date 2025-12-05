import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import './AdminDashboard.css'; // Import CSS (sẽ sửa ở bước 3)

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = "http://localhost:3000";
const PAGE_SIZE = 15;

const showToast = (setter, msg, isError = false) => {
  setter({ text: msg, error: isError });
  setTimeout(() => setter(null), 3000);
};

function TabStats({ stats }) {
  const chartDataModel = {
    labels: stats.statsByModel.map(s => `${s.HX_TENHANGXE} ${s.MODEL_TENMODEL}`),
    datasets: [{
      label: 'Số lượt thuê',
      data: stats.statsByModel.map(s => s.soLuot),
      backgroundColor: '#198754',
    }]
  };
  const chartDataOwner = {
    labels: stats.statsByOwner.map(s => s.CX_HOTENCX),
    datasets: [{
      label: 'Số lượt thuê',
      data: stats.statsByOwner.map(s => s.soLuot),
      backgroundColor: '#0d6efd',
    }]
  };
  const chartDataTime = {
    labels: stats.statsByTime.map(s => s.thang),
    datasets: [{
      label: 'Số lượt thuê',
      data: stats.statsByTime.map(s => s.soLuot),
      backgroundColor: '#ffc107',
    }]
  };
  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
  };

  return (
    <div className="row g-4">
      <div className="col-lg-6">
        <h5 className="text-center">Top Model được thuê nhiều nhất</h5>
        <Bar data={chartDataModel} options={chartOptions} />
      </div>
      <div className="col-lg-6">
        <h5 className="text-center">Top Chủ xe có nhiều lượt thuê nhất</h5>
        <Bar data={chartDataOwner} options={chartOptions} />
      </div>
      <div className="col-12 mt-5">
        <h5 className="text-center">Lượt thuê trong 12 tháng qua</h5>
        <Bar data={chartDataTime} options={{ ...chartOptions, indexAxis: 'x' }} />
      </div>
    </div>
  );
}

function TabUsers({ users }) {
  return (
    <div className="row g-4">
      <div className="col-md-6">
        <h5>Khách hàng ({users.customers.length})</h5>
        <div className="table-responsive" style={{ maxHeight: '60vh' }}>
          <table className="table table-sm table-striped table-hover">
            <thead className="table-dark sticky-top">
              <tr>
                <th>Tên</th>
                <th>CCCD</th>
                <th>Email</th>
                <th>SĐT</th>
              </tr>
            </thead>
            <tbody>
              {users.customers.map(c => (
                <tr key={c.KH_SOCCCD}>
                  <td>{c.KH_TENND}</td>
                  <td>{c.KH_SOCCCD}</td>
                  <td>{c.KH_EMAIL}</td>
                  <td>{c.KH_SODIENTHOAI}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="col-md-6">
        <h5>Chủ xe ({users.owners.length})</h5>
        <div className="table-responsive" style={{ maxHeight: '60vh' }}>
          <table className="table table-sm table-striped table-hover">
            <thead className="table-dark sticky-top">
              <tr>
                <th>Tên</th>
                <th>Mã CX</th>
                <th>Email</th>
                <th>SĐT</th>
              </tr>
            </thead>
            <tbody>
              {users.owners.map(o => (
                <tr key={o.CX_MACX}>
                  <td>{o.CX_HOTENCX}</td>
                  <td>{o.CX_MACX}</td>
                  <td>{o.CX_EMAIL}</td>
                  <td>{o.CX_SODT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabBrands({ data, reloadData, setError }) {
  const [brands, setBrands] = useState(data.brands || []);
  const [formBrand, setFormBrand] = useState({ HX_MAHANGXE: '', HX_TENHANGXE: '', HX_LINKHINH: '' });
  const [isEditBrand, setIsEditBrand] = useState(false);

  useEffect(() => {
    setBrands(data.brands || []);
  }, [data]);

  const handleApiCall = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      showToast(setError, successMsg, false);
      reloadData();
      setFormBrand({ HX_MAHANGXE: '', HX_TENHANGXE: '', HX_LINKHINH: '' });
      setIsEditBrand(false);
    } catch (err) {
      showToast(setError, err.message, true);
    }
  };

  const submitBrand = (e) => {
    e.preventDefault();
    if (isEditBrand) {
      handleApiCall(`${API_BASE}/admin/brands/${formBrand.HX_MAHANGXE}`, 'PUT', formBrand, 'Cập nhật hãng xe thành công');
    } else {
      // (SỬA) Gửi đi không cần Mã Hãng, server tự tạo
      handleApiCall(`${API_BASE}/admin/brands`, 'POST', { HX_TENHANGXE: formBrand.HX_TENHANGXE, HX_LINKHINH: formBrand.HX_LINKHINH }, 'Thêm hãng xe thành công');
    }
  };
  
  const editBrand = (brand) => {
    setFormBrand(brand);
    setIsEditBrand(true);
  };

  return (
    <div className="row g-5">
      {/* Cột Form Hãng Xe */}
      <div className="col-md-5">
        <h4>{isEditBrand ? 'Chỉnh sửa Hãng xe' : 'Thêm Hãng xe mới'}</h4>
        <form onSubmit={submitBrand} className="card p-3">
          {isEditBrand && (
            <div className="mb-2">
              <label>Mã hãng</label>
              <input type="text" className="form-control form-control-sm"
                value={formBrand.HX_MAHANGXE}
                disabled={true} // Không cho sửa Mã
              />
            </div>
          )}
          <div className="mb-2">
            <label>Tên hãng *</label>
            <input type="text" className="form-control form-control-sm"
              value={formBrand.HX_TENHANGXE}
              onChange={(e) => setFormBrand({...formBrand, HX_TENHANGXE: e.target.value})}
              required
            />
          </div>
          <div className="mb-2">
            <label>Link hình (Logo)</label>
            <input type="text" className="form-control form-control-sm"
              value={formBrand.HX_LINKHINH || ''}
              onChange={(e) => setFormBrand({...formBrand, HX_LINKHINH: e.target.value})}
            />
          </div>
          <div className="d-flex gap-2 mt-2">
            <button type="submit" className="btn btn-success btn-sm">{isEditBrand ? 'Lưu cập nhật' : 'Thêm mới'}</button>
            {isEditBrand && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setIsEditBrand(false); setFormBrand({ HX_MAHANGXE: '', HX_TENHANGXE: '', HX_LINKHINH: '' }); }}>Hủy</button>}
          </div>
        </form>
      </div>
      
      {/* Cột Bảng Hãng Xe */}
      <div className="col-md-7">
        <h4>Danh sách Hãng xe</h4>
        <div className="table-responsive" style={{ maxHeight: '60vh' }}>
          <table className="table table-sm table-striped table-hover">
            <thead className="table-dark sticky-top">
              <tr><th>Mã</th><th>Tên</th><th>Link hình</th><th>Hành động</th></tr>
            </thead>
            <tbody>
              {brands.map(b => (
                <tr key={b.HX_MAHANGXE}>
                  <td>{b.HX_MAHANGXE}</td>
                  <td>{b.HX_TENHANGXE}</td>
                  <td style={{maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{b.HX_LINKHINH}</td>
                  <td><button className="btn btn-outline-primary btn-sm py-0" onClick={() => editBrand(b)}>Sửa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabModels({ data, reloadData, setError }) {
  const [brands, setBrands] = useState(data.brands || []);
  const [models, setModels] = useState(data.models || []);
  const [formModel, setFormModel] = useState({ MODEL_MAMODEL: '', HX_MAHANGXE: '', MODEL_TENMODEL: '', MODEL_TRUYENDONG: '', MODEL_SOGHE: '', MODEL_NHIENLIEU: '', MODEL_TIEUHAO: '' });
  const [isEditModel, setIsEditModel] = useState(false);

  useEffect(() => {
    setBrands(data.brands || []);
    setModels(data.models || []);
  }, [data]);

  const handleApiCall = async (url, method, body, successMsg) => {
    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      showToast(setError, successMsg, false);
      reloadData();
      setFormModel({ MODEL_MAMODEL: '', HX_MAHANGXE: '', MODEL_TENMODEL: '', MODEL_TRUYENDONG: '', MODEL_SOGHE: '', MODEL_NHIENLIEU: '', MODEL_TIEUHAO: '' });
      setIsEditModel(false);
    } catch (err) {
      showToast(setError, err.message, true);
    }
  };
  
  const submitModel = (e) => {
    e.preventDefault();
    if (isEditModel) {
      handleApiCall(`${API_BASE}/admin/models/${formModel.MODEL_MAMODEL}`, 'PUT', formModel, 'Cập nhật model thành công');
    } else {
      // (SỬA) Gửi đi không cần Mã Model, server tự tạo
      handleApiCall(`${API_BASE}/admin/models`, 'POST', formModel, 'Thêm model thành công');
    }
  };
  const editModel = (model) => {
    setFormModel(model);
    setIsEditModel(true);
  };
  
  return (
    <div className="row g-5">
      {/* Cột Form Model Xe */}
      <div className="col-md-5">
        <h4>{isEditModel ? 'Chỉnh sửa Model' : 'Thêm Model mới'}</h4>
        <form onSubmit={submitModel} className="card p-3 mb-3">
          {isEditModel && (
            <div className="mb-2">
              <label>Mã Model (Không thể sửa)</label>
              <input type="text" className="form-control form-control-sm"
                value={formModel.MODEL_MAMODEL}
                disabled={true}
              />
            </div>
          )}
          <div className="row g-2">
            <div className="col-12">
              <label>Hãng xe *</label>
              <select className="form-select form-select-sm"
                value={formModel.HX_MAHANGXE}
                onChange={(e) => setFormModel({...formModel, HX_MAHANGXE: e.target.value})}
                required
              >
                <option value="">-- Chọn hãng --</option>
                {brands.map(b => <option key={b.HX_MAHANGXE} value={b.HX_MAHANGXE}>{b.HX_TENHANGXE}</option>)}
              </select>
            </div>
            <div className="col-12">
              <label>Tên Model *</label>
              <input type="text" className="form-control form-control-sm"
                value={formModel.MODEL_TENMODEL}
                onChange={(e) => setFormModel({...formModel, MODEL_TENMODEL: e.target.value})}
                required
              />
            </div>
            <div className="col-4">
              <label>Số ghế *</label>
              <input type="number" className="form-control form-control-sm"
                value={formModel.MODEL_SOGHE}
                onChange={(e) => setFormModel({...formModel, MODEL_SOGHE: e.target.value})}
                required
              />
            </div>
            <div className="col-4">
              <label>Truyền động</label>
              <input type="text" className="form-control form-control-sm"
                value={formModel.MODEL_TRUYENDONG}
                onChange={(e) => setFormModel({...formModel, MODEL_TRUYENDONG: e.target.value})}
              />
            </div>
            <div className="col-4">
              <label>Nhiên liệu</label>
              <input type="text" className="form-control form-control-sm"
                value={formModel.MODEL_NHIENLIEU}
                onChange={(e) => setFormModel({...formModel, MODEL_NHIENLIEU: e.target.value})}
              />
            </div>
            <div className="col-12">
              <label>Tiêu hao (L/100km)</label>
              <input type="text" className="form-control form-control-sm"
                value={formModel.MODEL_TIEUHAO}
                onChange={(e) => setFormModel({...formModel, MODEL_TIEUHAO: e.target.value})}
              />
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn btn-success btn-sm">{isEditModel ? 'Lưu cập nhật' : 'Thêm mới'}</button>
            {isEditModel && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setIsEditModel(false); setFormModel({ MODEL_MAMODEL: '', HX_MAHANGXE: '', MODEL_TENMODEL: '', MODEL_TRUYENDONG: '', MODEL_SOGHE: '', MODEL_NHIENLIEU: '', MODEL_TIEUHAO: '' }); }}>Hủy</button>}
          </div>
        </form>
      </div>
      
      {/* Cột Bảng Model Xe */}
      <div className="col-md-7">
        <h4>Danh sách Model xe</h4>
        <div className="table-responsive" style={{ maxHeight: '60vh' }}>
          <table className="table table-sm table-striped table-hover">
            <thead className="table-dark sticky-top">
              {/* (SỬA) Thêm cột */}
              <tr>
                <th>Model</th>
                <th>Hãng</th>
                <th>Ghế</th>
                <th>Truyền động</th>
                <th>Nhiên liệu</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.MODEL_MAMODEL}>
                  <td>{m.MODEL_TENMODEL}</td>
                  <td>{m.HX_TENHANGXE}</td>
                  <td>{m.MODEL_SOGHE}</td>
                  <td>{m.MODEL_TRUYENDONG}</td>
                  <td>{m.MODEL_NHIENLIEU}</td>
                  <td><button className="btn btn-outline-primary btn-sm py-0" onClick={() => editModel(m)}>Sửa</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabAllCars({ setError }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchCars = useCallback(async (page) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/cars?page=${page}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải danh sách xe");
      setCars(data.items || []);
      setTotalPages(Math.ceil(data.total / data.pageSize));
      setCurrentPage(page);
    } catch (err) {
      showToast(setError, err.message, true);
    } finally {
      setLoading(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchCars(1);
  }, [fetchCars]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <nav className="d-flex justify-content-end mt-3">
        <ul className="pagination mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); fetchCars(currentPage - 1); }}>
              Trước
            </a>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); fetchCars(currentPage + 1); }}>
              Sau
            </a>
          </li>
        </ul>
      </nav>
    );
  };
  
  if (loading && cars.length === 0) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4>Danh sách Toàn bộ Xe trong hệ thống</h4>
      <div className="table-responsive" style={{ maxHeight: '70vh' }}>
        <table className="table table-sm table-striped table-hover">
          <thead className="table-dark sticky-top">
            <tr>
              <th>Mã Xe</th>
              <th>Biển số</th>
              <th>Model</th>
              <th>Hãng</th>
              <th>Chủ xe</th>
            </tr>
          </thead>
          <tbody>
            {cars.map(c => (
              <tr key={c.XE_MAXE}>
                <td>{c.XE_MAXE}</td>
                <td>{c.XE_BIENSOXE}</td>
                <td>{c.MODEL_TENMODEL}</td>
                <td>{c.HX_TENHANGXE}</td>
                <td>{c.CX_HOTENCX || <span className="text-muted">N/A</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );
}

function TabTerms({ terms, reloadData, setError }) {
  const [newTerm, setNewTerm] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTerm.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/admin/terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noiDung: newTerm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi thêm điều khoản");
      
      showToast(setError, data.message, false);
      setNewTerm("");
      reloadData();
    } catch (err) {
      showToast(setError, err.message, true);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy điều khoản này?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/terms/${id}/deactivate`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi hủy điều khoản");
      
      showToast(setError, data.message, false);
      reloadData();
    } catch (err) {
      showToast(setError, err.message, true);
    }
  };

  return (
    <div className="row g-5">
      <div className="col-md-7">
        <h4>Danh sách Điều khoản chung</h4>
        <div className="list-group">
          {terms.map(t => (
            <div key={t.DKSDDV_MADKSDDV} className="list-group-item d-flex justify-content-between align-items-start">
              <div>
                <p className="mb-1">{t.DKSDDV_NOIDUNG}</p>
                <small className="text-muted">
                  Ngày tạo: {new Date(t.DKSDDV_NGAYGIOAPDUNG).toLocaleDateString('vi-VN')}
                </small>
                {t.DKSDDV_NGAYGIONGUNGAPDUNG ? (
                  <span className="badge bg-danger ms-2">Đã hủy</span>
                ) : (
                  <span className="badge bg-success ms-2">Đang áp dụng</span>
                )}
              </div>
              {!t.DKSDDV_NGAYGIONGUNGAPDUNG && (
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeactivate(t.DKSDDV_MADKSDDV)}>
                  Hủy
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="col-md-5">
        <h4>Thêm điều khoản mới</h4>
        <form onSubmit={handleAdd} className="card p-3">
          <div className="mb-3">
            <label className="form-label">Nội dung</label>
            <textarea 
              className="form-control" 
              rows="5" 
              value={newTerm} 
              onChange={e => setNewTerm(e.target.value)} 
              placeholder="Nhập nội dung điều khoản chung..." 
              required 
            />
          </div>
          <button type="submit" className="btn btn-success">Thêm mới</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('stats'); // (SỬA) Tab mặc định
  const [data, setData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();
  
  // Hàm tải dữ liệu chung (SỬA)
  const loadData = useCallback(async (tab) => {
    setLoading(true);
    let endpoint = '';
    if (tab === 'stats') endpoint = '/admin/stats';
    else if (tab === 'users') endpoint = '/admin/users';
    else if (tab === 'brands' || tab === 'models') endpoint = '/admin/brands-and-models';
    else if (tab === 'terms') endpoint = '/admin/terms'; 
    else if (tab === 'allcars') endpoint = '';
    else endpoint = '';
    
    if (tab === 'allcars') {
      setLoading(false); // Tab này tự xử lý loading
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const result = await res.json();
      
      if (tab === 'brands' || tab === 'models') {
        // (SỬA) Lưu data chung cho cả 2 tab
        setData(prev => ({ ...prev, carManagement: result }));
      } else {
        setData(prev => ({ ...prev, [tab]: result }));
      }
    } catch (err) {
      showToast(setMessage, err.message, true);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback

  // 1. Kiểm tra đăng nhập
  useEffect(() => {
    const stored = localStorage.getItem("admin");
    if (stored) {
      setAdmin(JSON.parse(stored));
    } else {
      navigate("/admin-login");
    }
  }, [navigate]);

  // 2. Tải dữ liệu cho tab hiện tại
  useEffect(() => {
    if (admin) { 
      loadData(activeTab);
    }
  }, [admin, activeTab, loadData]);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/admin-login");
  };

  if (!admin) return null; // Chờ xác thực

  // Hàm render nội dung tab (SỬA)
  const renderTabContent = () => {
    if (loading && !data) {
      return (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'stats':
        return data?.stats ? <TabStats stats={data.stats} /> : <p>Đang tải...</p>;
      case 'users':
        return data?.users ? <TabUsers users={data.users} /> : <p>Đang tải...</p>;
      case 'brands':
        return data?.carManagement ? <TabBrands data={data.carManagement} reloadData={() => loadData('brands')} setError={setMessage} /> : <p>Đang tải...</p>;
      case 'models':
        return data?.carManagement ? <TabModels data={data.carManagement} reloadData={() => loadData('models')} setError={setMessage} /> : <p>Đang tải...</p>;
      case 'allcars':
        return <TabAllCars setError={setMessage} />; // Tab này tự tải
      case 'terms':
        return data?.terms ? <TabTerms terms={data.terms} reloadData={() => loadData('terms')} setError={setMessage} /> : <p>Đang tải...</p>;
      default:
        return null;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header bg-dark text-white p-3 shadow-sm">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <h4 className="mb-0">CARENTAL - Bảng điều khiển Admin</h4>
          <div>
            <span className="me-3">Chào, {admin.ADMIN_HOTEN}</span>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </div>
      </header>

      {/* Thông báo */}
      {message && (
        <div 
          className={`alert ${message.error ? 'alert-danger' : 'alert-success'} alert-dismissible fade show rounded-0`}
          role="alert" 
        >
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {/* Tabs (SỬA) */}
      <nav className="nav nav-tabs nav-fill bg-light p-2 sticky-top admin-nav">
        <button 
          className={`nav-link ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Thống kê
        </button>
        <button 
          className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Quản lý Người dùng
        </button>
        <button 
          className={`nav-link ${activeTab === 'brands' ? 'active' : ''}`}
          onClick={() => setActiveTab('brands')}
        >
          Quản lý Hãng Xe
        </button>
        <button 
          className={`nav-link ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          Quản lý Model
        </button>
        <button 
          className={`nav-link ${activeTab === 'allcars' ? 'active' : ''}`}
          onClick={() => setActiveTab('allcars')}
        >
          Danh sách Xe
        </button>
        <button 
          className={`nav-link ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          Điều khoản chung
        </button>
      </nav>
      
      {/* Nội dung Tab */}
      <div className="admin-content container-fluid p-4">
        {renderTabContent()}
      </div>
    </div>
  );
}