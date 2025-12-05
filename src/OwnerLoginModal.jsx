import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwner } from "./OwnerContext";


function OwnerLoginModal({ onClose, onSwitchToRegister }) {
  const [form, setForm] = useState({ tentaikhoan: "", matkhau: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { login } = useOwner();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/login-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CX_TENTAIKHOAN: form.tentaikhoan,
          CX_MATKHAU: form.matkhau,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.owner);
        localStorage.setItem("ownerId", data.owner.CX_MACX);
        setMessage("Đăng nhập thành công!");
        onClose?.();
        setTimeout(() => navigate("/owner-dashboard"), 1000);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      setMessage("Lỗi máy chủ.");
    }
  };

  return (
    <div className="custom-modal-backdrop d-block" onClick={onClose}>
      <div className="modal d-block" tabIndex="-1" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content p-4">
            <div className="modal-header border-0">
              <h5 className="modal-title text-success">Đăng nhập chủ xe</h5>
              <button type="button" className="btn-close" onClick={onClose}>X</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Tên tài khoản</label>
                  <input name="tentaikhoan" className="form-control" onChange={handleChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input type="password" name="matkhau" className="form-control" onChange={handleChange} />
                </div>
                <button type="submit" className="btn btn-success w-100">Đăng nhập</button>
                <div className="modal-footer border-0 text-center">
                  <p className="mb-0">
                    Bạn chưa đăng ký chủ xe ?{" "}
                    <span className="text-success fw-bold" style={{ cursor: "pointer" }} onClick={onSwitchToRegister}>
                      Đăng ký
                    </span>
                  </p>
                </div>
              </form>
              {message && <p className="mt-3 text-center text-danger">{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerLoginModal;
