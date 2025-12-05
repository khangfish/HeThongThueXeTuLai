import React, { useState, useEffect, useCallback } from 'react'; // 1. PHẢI CÓ useCallback
import { useNavigate } from 'react-router-dom';

const API_BASE = "http://localhost:3000";
const PAGE_SIZE = 15;

export default function OwnerContracts() {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const ownerId = owner?.CX_MACX; 
  
  const [activeTab, setActiveTab] = useState('contracts'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [contracts, setContracts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState("");

  const showToast = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setError("");
      setMessage("");
    }, 3000);
  };

  const fetchContracts = useCallback(async (pageToFetch) => {
    if (!ownerId) return; 
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/owner/${ownerId}/contracts?page=${pageToFetch}`, 
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error("Không thể tải danh sách hợp đồng");
      const data = await res.json();
      setContracts(data.items || []);
      setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      setCurrentPage(pageToFetch); 
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [ownerId]); 

  const fetchTerms = useCallback(async () => {
    if (!ownerId) return; 
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/owner/${ownerId}/terms`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error("Không thể tải điều khoản");
      const data = await res.json();
      setTerms(data || []);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    const stored = localStorage.getItem("owner");
    if (stored) {
      setOwner(JSON.parse(stored));
    } else {
      navigate("/login-owner"); 
    }
  }, [navigate]); 

  useEffect(() => {
    if (activeTab === 'contracts') {
      fetchContracts(1); // Luôn tải trang 1 khi đổi tab
    } else if (activeTab === 'terms') {
      fetchTerms();
    }
    // 6. (SỬA) Phụ thuộc vào các hàm đã bọc useCallback
  }, [activeTab, fetchContracts, fetchTerms]); 

  const handleViewContract = async (mahd) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/contracts/${mahd}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error("Không tìm thấy chi tiết hợp đồng");
      const contractDetails = await res.json();
      
      const payload = {
        HDT_MAHDT: contractDetails.HDT_MAHDT,
        car: { // Gộp thông tin xe & chủ xe
          MaXe: contractDetails.XE_MAXE,
          BienSo: contractDetails.BienSo,
          TenModel: contractDetails.TenModel,
          HangXe: contractDetails.HangXe,
          GiaThueNgay: contractDetails.GiaThueNgay,
          CX_MACX: contractDetails.CX_MACX,
          CX_HOTENCX: contractDetails.CX_HOTENCX,
          CX_SODT: contractDetails.CX_SODT,
          CX_EMAIL: contractDetails.CX_EMAIL,
          CX_STK: contractDetails.CX_STK,
          CX_NGANHANG: contractDetails.CX_NGANHANG,
          ChiNhanhDiaChi: contractDetails.ChiNhanhDiaChi,
          DiaChi: contractDetails.DiaChi, 
          HinhAnh: contractDetails.HinhAnh, // Thêm hình ảnh
        },
        user: { // Gộp thông tin khách hàng
          KH_TENND: contractDetails.KH_TENND, 
          KH_SOCCCD: contractDetails.KH_SOCCCD,
          KH_SOGPLX: contractDetails.KH_SOGPLX,
          KH_SODIENTHOAI: contractDetails.KH_SODIENTHOAI,
          KH_EMAIL: contractDetails.KH_EMAIL,
        },
        startDate: contractDetails.HDT_NGAYGIOBDTHUE,
        endDate: contractDetails.HDT_NGAYGIOKTTHUE,
        days: contractDetails.Days,
        total: contractDetails.Total,
        terms: contractDetails.DieuKhoan || [],
        HDT_CHITIETHD: contractDetails.HDT_CHITIETHD,
        HDT_NGAYGIOLAPHOPDONG: contractDetails.HDT_NGAYGIOLAPHOPDONG,
      };

      navigate("/owner-contract-view", { state: payload });

    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = async (e) => {
    e.preventDefault();
    if (!newTerm.trim()) {
      showToast("Nội dung không được để trống", true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noiDung: newTerm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi thêm");
      showToast(data.message);
      setNewTerm("");
      fetchTerms(); 
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTerm = async (termId) => {
    if (!window.confirm("Bạn có chắc muốn hủy điều khoản này không? Điều khoản sẽ không còn áp dụng cho các hợp đồng mới.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/terms/${termId}/deactivate`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi hủy");
      showToast(data.message);
      fetchTerms();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <nav className="d-flex justify-content-end mt-3">
        <ul className="pagination mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); fetchContracts(currentPage - 1); }}>
              Trước
            </a>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <a className="page-link" href="#" onClick={(e) => { e.preventDefault(); fetchContracts(currentPage + 1); }}>
              Sau
            </a>
          </li>
        </ul>
      </nav>
    );
  };
  
  if (!owner) return null;

  return (
    <div className="container mt-5 mb-5">
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <h2 className="text-success mb-3">Quản lý Hợp đồng & Điều khoản</h2>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item text-success">
          <button 
            className={`nav-link ${activeTab === 'contracts' ? 'active' : ''}`} 
            onClick={() => setActiveTab('contracts')}
          >
            Danh sách Hợp đồng
          </button>
        </li>
        <li className="nav-item text-success">
          <button 
            className={`nav-link ${activeTab === 'terms' ? 'active' : ''}`} 
            onClick={() => setActiveTab('terms')}
          >
            Quản lý Điều khoản
          </button>
        </li>
      </ul>

      {loading && (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && activeTab === 'contracts' && (
        <div>
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Mã HĐ</th>
                  <th scope="col">Ngày lập</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Biển số xe</th>
                  <th scope="col">Tổng tiền</th>
                  <th scope="col">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted p-4">
                      Không có hợp đồng nào.
                    </td>
                  </tr>
                )}
                {contracts.map(contract => (
                  <tr key={contract.HDT_MAHDT}>
                    <td><strong>{contract.HDT_MAHDT}</strong></td>
                    <td>{new Date(contract.HDT_NGAYGIOLAPHOPDONG).toLocaleString('vi-VN')}</td>
                    <td>{contract.KH_TENND}</td>
                    <td>{contract.XE_BIENSOXE}</td>
                    <td>{Number(contract.TongTien || 0).toLocaleString('vi-VN')}đ</td>
                    <td>
                      <button 
                        className="btn btn-outline-success btn-sm"
                        onClick={() => handleViewContract(contract.HDT_MAHDT)}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      )}

      {!loading && activeTab === 'terms' && (
        <div className="row">
          <div className="col-md-7">
            <h5>Danh sách điều khoản</h5>
            <div className="list-group">
              {terms.map(term => (
                <div key={term.DKSDDV_MADKSDDV} className="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <p className="mb-1">{term.DKSDDV_NOIDUNG}</p>
                    <small className="text-muted">
                      Ngày tạo: {new Date(term.DKSDDV_NGAYGIOAPDUNG).toLocaleDateString('vi-VN')}
                    </small>
                    {term.DKSDDV_NGAYGIONGUNGAPDUNG ? (
                      <span className="badge bg-danger ms-2">Đã hủy</span>
                    ) : (
                      <span className="badge bg-success ms-2">Đang áp dụng</span>
                    )}
                    {term.CX_MACX === null && (
                      <span className="badge bg-info ms-2">Điều khoản chung</span>
                    )}
                  </div>
                  {term.CX_MACX == ownerId && !term.DKSDDV_NGAYGIONGUNGAPDUNG && (
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDeactivateTerm(term.DKSDDV_MADKSDDV)}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-5">
            <h5>Thêm điều khoản mới</h5>
            <form onSubmit={handleAddTerm}>
              <div className="mb-3">
                <label className="form-label">Nội dung điều khoản</label>
                <textarea 
                  className="form-control" 
                  rows="5"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="Nhập nội dung điều khoản mới..."
                ></textarea>
              </div>
              <button type="submit" className="btn btn-success" disabled={loading}>
                Thêm mới
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}