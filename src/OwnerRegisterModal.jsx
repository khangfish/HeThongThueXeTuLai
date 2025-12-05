import React, { useState } from "react";

function OwnerRegisterModal({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    hoten: "",
    sodt: "",
    email: "",
    stk: "",
    tennganhang: "",
    tentaikhoan: "",
    matkhau: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      CX_HOTENCX: form.hoten,
      CX_SODT: form.sodt,
      CX_EMAIL: form.email,
      CX_STK: form.stk,
      CX_NGANHANG: form.tennganhang,
      CX_TENTAIKHOAN: form.tentaikhoan,
      CX_MATKHAU: form.matkhau,
    };
    try {
      const res = await fetch("http://localhost:3000/register-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Đăng ký thành công! Hãy đăng nhập.");
        setTimeout(() => onSwitchToLogin(), 1500);
      } else {
        setMessage(data.message || "Đăng ký thất bại.");
      }
    } catch (err) {
      setMessage("Lỗi máy chủ.");
    }
  };

  return (
    <div className="custom-modal-backdrop d-block" onClick={onClose}>
      <div className="modal d-block" tabIndex="-1" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content p-4">
            <div className="modal-header border-0">
              <h5 className="modal-title text-success">Đăng ký chủ xe</h5>
              <button type="button" className="btn-close" onClick={onClose}>X</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Họ và tên</label>
                    <input name="hoten" className="form-control" onChange={handleChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Số điện thoại</label>
                    <input name="sodt" className="form-control" onChange={handleChange} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" name="email" className="form-control" onChange={handleChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Số tài khoản</label>
                    <input name="stk" className="form-control" onChange={handleChange} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tên ngân hàng</label>
                    <input name="tennganhang" className="form-control" onChange={handleChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tên tài khoản</label>
                    <input name="tentaikhoan" className="form-control" onChange={handleChange} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu</label>
                  <input type="password" name="matkhau" className="form-control" onChange={handleChange} />
                </div>
                <button type="submit" className="btn btn-success w-100">Đăng ký</button>
              </form>
              {message && <p className="mt-3 text-center text-danger">{message}</p>}
            </div>

            <div className="modal-footer border-0 text-center">
              <p className="mb-0">
                Đã có tài khoản?{" "}
                <span className="text-success fw-bold" style={{ cursor: "pointer" }} onClick={onSwitchToLogin}>
                  Đăng nhập
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerRegisterModal;
