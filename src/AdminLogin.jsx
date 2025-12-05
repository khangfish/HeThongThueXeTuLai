import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = "http://localhost:3000";

export default function AdminLogin() {
  const [taiKhoan, setTaiKhoan] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taiKhoan, matKhau }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đăng nhập thất bại");
      
      // Lưu thông tin admin vào localStorage (giống chủ xe)
      localStorage.setItem("admin", JSON.stringify(data.admin));
      
      navigate("/admin-dashboard"); // Chuyển hướng đến trang Dashboard
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="col-md-5">
        <div className="card shadow-lg border-success">
          <div className="card-body p-5">
            <h3 className="card-title text-center text-success fw-bold mb-4">Đăng nhập Admin</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Tài khoản</label>
                <input
                  type="text"
                  className="form-control"
                  value={taiKhoan}
                  onChange={(e) => setTaiKhoan(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Mật khẩu</label>
                <input
                  type="password"
                  className="form-control"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  required
                />
              </div>
              {error && <div className="alert alert-danger p-2">{error}</div>}
              <div className="d-grid">
                <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}