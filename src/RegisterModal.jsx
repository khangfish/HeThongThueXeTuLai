// ...existing code...
import React, { useState } from "react";
import ModalWrapper from "./ModalWrapper";

export default function RegisterModal({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    cccd: "", gplx: "", name: "", dob: "", gender: "", username: "", password: "", confirm: "", phone: "", email: "", sotk: "", bank: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const { cccd, gplx, name, dob, gender, username, password, confirm, phone, email } = form;
    if (!cccd || !gplx || !name || !dob || !gender || !username || !password || !confirm || !phone || !email) return "Nhập đầy đủ các trường bắt buộc.";
    if (!/^[0-9]{12}$/.test(cccd)) return "CCCD phải 12 chữ số.";
    if (!/^[0-9]{12}$/.test(gplx)) return "GPLX phải 12 chữ số.";
    if (!/^[0-9]{10,11}$/.test(phone)) return "SĐT 10 hoặc 11 chữ số.";
    if (password !== confirm) return "Mật khẩu không khớp.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email không hợp lệ.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate(); if (v) { setError(v); return; }
    setLoading(true);
    try {
      const payload = {
        KH_SOCCCD: form.cccd, KH_SOGPLX: form.gplx, KH_TENND: form.name,
        KH_NGAYSINH: form.dob, KH_GIOITINH: form.gender,
        KH_TENTAIKHOAN: form.username, KH_MATKHAU: form.password,
        KH_SODIENTHOAI: form.phone, KH_EMAIL: form.email,
        KH_SOTK: form.sotk || "", KH_TENNGANHANG: form.bank || ""
      };
      const res = await fetch("http://localhost:3000/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Đăng ký thất bại"); return; }
      // success
      onClose && onClose();
      onSwitchToLogin && onSwitchToLogin();
    } catch (err) {
      console.error(err); setError("Lỗi kết nối máy chủ.");
    } finally { setLoading(false); }
  };

  return (
    <ModalWrapper onClose={onClose} size="md" ariaLabel="register-modal">
      <div className="modal-header d-flex align-items-center justify-content-between">
        <h5 className="modal-title">Đăng ký tài khoản</h5>
        <button type="button" className="btn-close" onClick={onClose}>X</button>
      </div>

      <div className="modal-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">CCCD (12 số)</label>
            <input className="form-control" inputMode="numeric" maxLength="12" value={form.cccd} onChange={(e)=>update("cccd", e.target.value.replace(/\D/g,""))} />
          </div>

          <div className="mb-3">
            <label className="form-label">Số GPLX (12 số)</label>
            <input className="form-control" inputMode="numeric" maxLength="12" value={form.gplx} onChange={(e)=>update("gplx", e.target.value.replace(/\D/g,""))} />
          </div>

          <div className="mb-3">
            <label className="form-label">Họ và tên</label>
            <input className="form-control" value={form.name} onChange={(e)=>update("name", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Ngày sinh</label>
            <input type="date" className="form-control" value={form.dob} onChange={(e)=>update("dob", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Giới tính</label>
            <select className="form-select" value={form.gender} onChange={(e)=>update("gender", e.target.value)}>
              <option value="">-- Chọn --</option>
              <option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Tên tài khoản</label>
            <input className="form-control" value={form.username} onChange={(e)=>update("username", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Mật khẩu</label>
            <input type="password" className="form-control" value={form.password} onChange={(e)=>update("password", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Xác nhận mật khẩu</label>
            <input type="password" className="form-control" value={form.confirm} onChange={(e)=>update("confirm", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Số điện thoại</label>
            <input className="form-control" inputMode="numeric" maxLength="11" value={form.phone} onChange={(e)=>update("phone", e.target.value.replace(/\D/g,""))} />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={form.email} onChange={(e)=>update("email", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Số tài khoản (tùy chọn)</label>
            <input className="form-control" value={form.sotk} onChange={(e)=>update("sotk", e.target.value)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Ngân hàng (tùy chọn)</label>
            <input className="form-control" value={form.bank} onChange={(e)=>update("bank", e.target.value)} />
          </div>

          <div className="d-grid mt-2">
            <button className="btn btn-success" disabled={loading}>{loading ? "Đang tạo..." : "Tạo tài khoản"}</button>
          </div>
        </form>
      </div>

      <div className="modal-footer text-center">
        <small className="text-muted">
          Đã có tài khoản?{" "}
          <a href="#" className="text-success" onClick={(e)=>{ e.preventDefault(); onClose && onClose(); onSwitchToLogin && onSwitchToLogin(); }}>
            Đăng nhập ngay
          </a>
        </small>
      </div>
    </ModalWrapper>
  );
}