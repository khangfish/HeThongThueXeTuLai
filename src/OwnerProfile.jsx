import React, { useState, useEffect } from 'react';
import './OwnerProfile.css'; // Sử dụng file CSS bạn đã cung cấp

const API_BASE = "http://localhost:3000";

export default function OwnerProfile() {
  const ownerId = localStorage.getItem("ownerId");
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // State cho form cập nhật
  const [formData, setFormData] = useState({
    CX_HOTENCX: '',
    CX_SODT: '',
    CX_EMAIL: '',
    CX_STK: '',
    CX_NGANHANG: ''
  });

  // Hàm để hiển thị thông báo và tự động ẩn
  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  // Hàm tải dữ liệu chủ xe
  async function fetchOwnerData() {
    if (!ownerId) {
      setLoading(false);
      setMessage("Không tìm thấy ID chủ xe. Vui lòng đăng nhập lại.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}`);
      if (!res.ok) {
        throw new Error("Không thể tải thông tin chủ xe.");
      }
      const data = await res.json();
      setOwner(data);
      // Đặt giá trị ban đầu cho form
      setFormData({
        CX_HOTENCX: data.CX_HOTENCX || '',
        CX_SODT: data.CX_SODT || '',
        CX_EMAIL: data.CX_EMAIL || '',
        CX_STK: data.CX_STK || '',
        CX_NGANHANG: data.CX_NGANHANG || ''
      });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchOwnerData();
  }, [ownerId]);

  // Xử lý khi input thay đổi
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Xử lý lưu thay đổi
  const handleSaveChanges = async () => {
    try {
      const res = await fetch(`${API_BASE}/update-owner/${ownerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cập nhật thất bại.");
      }
      // Tải lại dữ liệu mới
      await fetchOwnerData(); 
      setShowModal(false);
      showToast("Cập nhật thông tin thành công!");
    } catch (err) {
      showToast(err.message);
    }
  };

  // Lấy chữ cái đầu
  const getAvatarLetter = () => {
    return owner?.CX_HOTENCX?.charAt(0)?.toUpperCase() || '?';
  };

  if (loading) {
    return <div id="ownerProfile-page"><p>Đang tải thông tin...</p></div>;
  }

  if (!owner) {
    return <div id="ownerProfile-page"><p>{message || "Không thể tải thông tin chủ xe."}</p></div>;
  }

  return (
    <div id="ownerProfile-page">
      <div id="ownerProfile-card">
        {/* Header */}
        <div id="ownerProfile-header">
          <div id="ownerProfile-avatar">{getAvatarLetter()}</div>
          <div id="ownerProfile-name">{owner.CX_HOTENCX}</div>
          <div id="ownerProfile-subtitle">{owner.CX_EMAIL}</div>
        </div>

        {/* Info */}
        <div id="ownerProfile-info">
          <p><span>Tài khoản:</span> {owner.CX_TENTAIKHOAN}</p>
          <p><span>Số điện thoại:</span> {owner.CX_SODT}</p>
          <p><span>Số tài khoản:</span> {owner.CX_STK}</p>
          <p><span>Ngân hàng:</span> {owner.CX_NGANHANG}</p>
        </div>

        {/* Action */}
        <div id="ownerProfile-action">
          <button id="ownerProfile-updateBtn" onClick={() => setShowModal(true)}>
            Cập nhật thông tin
          </button>
        </div>
        
        {message && <div id="ownerProfile-message">{message}</div>}
      </div>

      {/* Modal Cập nhật */}
      {showModal && (
        <div id="ownerProfile-modalBackdrop">
          <div id="ownerProfile-modal">
            <h3>Cập nhật hồ sơ</h3>
            
            <label htmlFor="cx_hoten">Họ và Tên</label>
            <input
              id="cx_hoten"
              type="text"
              name="CX_HOTENCX"
              value={formData.CX_HOTENCX}
              onChange={handleInputChange}
            />
            
            <label htmlFor="cx_email">Email</label>
            <input
              id="cx_email"
              type="email"
              name="CX_EMAIL"
              value={formData.CX_EMAIL}
              onChange={handleInputChange}
            />
            
            <label htmlFor="cx_sodt">Số điện thoại</label>
            <input
              id="cx_sodt"
              type="text"
              name="CX_SODT"
              value={formData.CX_SODT}
              onChange={handleInputChange}
            />
            
            <label htmlFor="cx_stk">Số tài khoản</label>
            <input
              id="cx_stk"
              type="text"
              name="CX_STK"
              value={formData.CX_STK}
              onChange={handleInputChange}
            />
            
            <label htmlFor="cx_nganhang">Ngân hàng</label>
            <input
              id="cx_nganhang"
              type="text"
              name="CX_NGANHANG"
              value={formData.CX_NGANHANG}
              onChange={handleInputChange}
            />
            
            <div id="ownerProfile-modalButtons">
              <button id="ownerProfile-cancelBtn" onClick={() => setShowModal(false)}>
                Hủy
              </button>
              <button id="ownerProfile-saveBtn" onClick={handleSaveChanges}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}