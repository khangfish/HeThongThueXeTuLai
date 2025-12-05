// ...existing code...
import React, { useState } from "react";
import ModalWrapper from "./ModalWrapper";
import { useUser } from "./UserContext";

export default function LoginModal({ onClose, onSwitchToRegister }) {
  const { login } = useUser();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!user || !pass) { setError("Vui lòng nhập tài khoản và mật khẩu."); return; }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ KH_TENTAIKHOAN: user, KH_MATKHAU: pass })
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Đăng nhập thất bại"); return; }
      if (data.user) { login(data.user); onClose && onClose(); } else setError("Đáp lại server không hợp lệ.");
    } catch (err) { console.error(err); setError("Lỗi kết nối máy chủ."); }
    finally { setLoading(false); }
  };

  return (
    <ModalWrapper onClose={onClose} size="sm" ariaLabel="login-modal">
      <div className="modal-header d-flex align-items-center justify-content-between">
        <h5 className="modal-title">Đăng nhập</h5>
        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}>X</button>
      </div>

      <div className="modal-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Tài khoản</label>
            <input className="form-control" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Tên tài khoản" />
          </div>

          <div className="mb-3">
            <label className="form-label">Mật khẩu</label>
            <input type="password" className="form-control" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mật khẩu" />
          </div>

          <div className="d-grid mt-2">
            <button className="btn btn-success" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </div>
        </form>
      </div>

      <div className="modal-footer text-center">
        <small className="text-muted">
          Chưa có tài khoản?{" "}
          <a href="#" className="text-success" onClick={(e) => { e.preventDefault(); onClose && onClose(); onSwitchToRegister && onSwitchToRegister(); }}>
            Đăng ký ngay
          </a>
        </small>
      </div>
    </ModalWrapper>
  );
}