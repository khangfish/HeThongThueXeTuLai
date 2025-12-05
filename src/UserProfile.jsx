import React, { useEffect, useState } from "react";
import { useUser } from "./UserContext";
import "./UserProfile.css";
import { useNavigate } from 'react-router-dom';

function UserProfile() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [viewing, setViewing] = useState(null); // contract detail object or null
  const [loadingView, setLoadingView] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!user) return;

    fetchHistory();

    return () => { mounted = false; };

    async function fetchHistory() {
      try {
        const res = await fetch(`http://localhost:3000/rent-history/${user.KH_SOCCCD}/${user.KH_SOGPLX}`);
        const data = await res.json();
        if (mounted) setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Lỗi lấy lịch sử thuê:", err);
      }
    }
  }, [user]);

  const handleEditClick = () => {
    setForm({
      KH_TENND: user.KH_TENND,
      KH_EMAIL: user.KH_EMAIL,
      KH_SODIENTHOAI: user.KH_SODIENTHOAI,
      KH_NGAYSINH: user.KH_NGAYSINH ? user.KH_NGAYSINH.slice(0,10) : "",
      KH_GIOITINH: user.KH_GIOITINH || "",
      KH_MATKHAU: "",
    });
    setShowEdit(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const res = await fetch(`http://localhost:3000/update-profile/${user.KH_SOCCCD}/${user.KH_SOGPLX}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Cập nhật thành công!");
      setUser(prev => ({
        ...prev,
        KH_TENND: form.KH_TENND,
        KH_EMAIL: form.KH_EMAIL,
        KH_SODIENTHOAI: form.KH_SODIENTHOAI,
      }));
      setShowEdit(false);
    } else alert(data.error || "Không thể cập nhật.");
  };

  if (!user)
    return <div className="profile-container"><p>Vui lòng đăng nhập để xem trang cá nhân.</p></div>;

  const now = new Date();
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pageItems = history.slice(startIndex, startIndex + pageSize);

  async function cancelContract(maHD) {
    if (!window.confirm("Bạn chắc chắn muốn hủy hợp đồng này?")) return;
    try {
      const res = await fetch(`http://localhost:3000/rent-cancel/${maHD}`, { method: "POST" });
      const data = await res.json();
      alert(data.message || "Đã hủy");
      // refresh history
      const r = await fetch(`http://localhost:3000/rent-history/${user.KH_SOCCCD}/${user.KH_SOGPLX}`);
      const d = await r.json();
      setHistory(Array.isArray(d) ? d : []);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi hủy hợp đồng.");
    }
  }

  async function viewContract(maHD) {
    setLoadingView(true);
    try {
      const res = await fetch(`http://localhost:3000/contracts/${encodeURIComponent(maHD)}`);
      if (!res.ok) throw new Error("Không tìm thấy");
      const data = await res.json();
      setViewing(data);
    } catch (e) {
      console.error("Lỗi lấy chi tiết hợp đồng:", e);
      alert("Không lấy được chi tiết hợp đồng.");
    } finally {
      setLoadingView(false);
    }
  }

  const handleViewContract = async (mahd) => {
    try {
      // Gọi API lấy chi tiết đầy đủ (nhớ thêm cache: 'no-store')
      const res = await fetch(`http://localhost:3000/contracts/${mahd}`, { cache: 'no-store' });
      
      if (!res.ok) {
        alert("Không thể tải chi tiết hợp đồng.");
        return;
      }
      
      const fullContract = await res.json();

      const payload = {
        HDT_MAHDT: fullContract.HDT_MAHDT,
        car: {
          MaXe: fullContract.XE_MAXE,
          BienSo: fullContract.BienSo,
          TenModel: fullContract.TenModel,
          HangXe: fullContract.HangXe,
          GiaThueNgay: fullContract.GiaThueNgay,
          CX_HOTENCX: fullContract.CX_HOTENCX,
          CX_SODT: fullContract.CX_SODT,
          CX_EMAIL: fullContract.CX_EMAIL,
          CX_STK: fullContract.CX_STK,
          CX_NGANHANG: fullContract.CX_NGANHANG,
          DiaChi: fullContract.DiaChi,
          ChiNhanhDiaChi: fullContract.ChiNhanhDiaChi,
          HinhAnh: fullContract.HinhAnh,
        },
        user: {
          KH_TENND: fullContract.KH_TENND,
          KH_SOCCCD: fullContract.KH_SOCCCD,
          KH_SOGPLX: fullContract.KH_SOGPLX,
          KH_SODIENTHOAI: fullContract.KH_SODIENTHOAI,
          KH_EMAIL: fullContract.KH_EMAIL,
        },
        startDate: fullContract.HDT_NGAYGIOBDTHUE,
        endDate: fullContract.HDT_NGAYGIOKTTHUE,
        days: fullContract.Days,
        total: fullContract.Total,
        terms: fullContract.DieuKhoan || [],
        HDT_CHITIETHD: fullContract.HDT_CHITIETHD,
        HDT_NGAYGIOLAPHOPDONG: fullContract.HDT_NGAYGIOLAPHOPDONG,
      };

      // Chuyển hướng sang trang ContractView
      navigate("/contract-view", { state: payload });

    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server.");
    }
  };

  return (
    <div className="profile-wrapper">
      <aside className="profile-sidebar">
        <div className="profile-card">
          <div className="profile-avatar">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.KH_TENND)}&background=random`} alt="avatar" />
          </div>
          <h2>{user.KH_TENND}</h2>
          <p className="username">@{user.KH_TENTAIKHOAN}</p>
          <button className="btn btn-edit-info" onClick={handleEditClick}>Chỉnh sửa thông tin</button>
          <hr />
          <ul className="info-list">
            <li><strong>Ngày sinh:</strong> {user.KH_NGAYSINH ? new Date(user.KH_NGAYSINH).toLocaleDateString("vi-VN") : "—"}</li>
            <li><strong>Giới tính:</strong> {user.KH_GIOITINH || "—"}</li>
            <li><strong>Email:</strong> {user.KH_EMAIL || "—"}</li>
            <li><strong>Số điện thoại:</strong> {user.KH_SODIENTHOAI || "—"}</li>
            <li><strong>CCCD:</strong> {user.KH_SOCCCD}</li>
            <li><strong>GPLX:</strong> {user.KH_SOGPLX}</li>
          </ul>
        </div>
      </aside>

      <main className="profile-content">
        <h3>Lịch sử thuê xe</h3>

        {history.length === 0 ? (
          <p className="no-history">Bạn chưa thuê xe nào.</p>
        ) : (
          <>
            <div className="rented-list">
              {pageItems.map((h, i) => {
                const created = h.HDT_NGAYGIOLAPHOPDONG ? new Date(h.HDT_NGAYGIOLAPHOPDONG) : null;
                const start = new Date(h.HDT_NGAYGIOBDTHUE);
                const diffHours = (start - now) / (1000 * 60 * 60);
                const allowCancel = diffHours > 2;
                const total = h.Total || (h.GiaThueNgay || 0);
                return (
                  <div className="rented-row" key={i}>
                    <div className="left">
                      <div className="title">{h.HangXe} {h.TenModel} <span className="badge">{h.XE_MAXE}</span></div>
                      <div className="meta">
                        <div><strong>Mã HD:</strong> {h.HDT_MAHDT}</div>
                        <div><strong>Ngày lập:</strong> {created ? created.toLocaleString() : "—"}</div>
                        <div><strong>Bắt đầu:</strong> {start.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="right">
                      <div className="price">{Number(total).toLocaleString("vi-VN")}đ</div>
                      <div className="actions">
                        <button 
                          className="btn-view"
                          onClick={() => handleViewContract(h.HDT_MAHDT)}
                        >
                          Xem
                        </button>
                        {allowCancel ? (
                          <button className="btn-cancel" onClick={() => cancelContract(h.HDT_MAHDT)}>Hủy</button>
                        ) : (
                          <div className="cannot-cancel" title="Không thể hủy (còn dưới 2 giờ)">Không thể hủy</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pagination" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span>Trang {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </>
        )}
      </main>

      {showEdit && (
        <div id="userProfile-modalBackdrop">
          <div id="userProfile-modal">
            <h3>Cập nhật thông tin</h3>
            
            <label>Tên hiển thị</label>
            <input
              type="text"
              value={form.KH_TENND || ""}
              onChange={(e) => setForm({ ...form, KH_TENND: e.target.value })}
            />

            <label>Ngày sinh</label>
            <input
              type="date"
              value={form.KH_NGAYSINH || ""}
              onChange={(e) => setForm({ ...form, KH_NGAYSINH: e.target.value })}
            />

            <label>Email</label>
            <input
              type="email"
              value={form.KH_EMAIL || ""}
              onChange={(e) => setForm({ ...form, KH_EMAIL: e.target.value })}
            />

            <label>Số điện thoại</label>
            <input
              type="text"
              value={form.KH_SODIENTHOAI || ""}
              onChange={(e) => setForm({ ...form, KH_SODIENTHOAI: e.target.value })}
            />

            {/* <label>Số tài khoản</label>
            <input
              type="text"
              value={form.KH_SOTK || ""}
              onChange={(e) => setForm({ ...form, KH_SOTK: e.target.value })}
            />

            <label>Ngân hàng</label>
            <input
              type="text"
              value={form.KH_TENNGANHANG || ""}
              onChange={(e) => setForm({ ...form, KH_TENNGANHANG: e.target.value })}
            /> */}

            {/*<label>Mật khẩu mới (bỏ trống nếu không đổi)</label>
            <input
              type="password"
              value={form.KH_MATKHAU || ""}
              onChange={(e) => setForm({ ...form, KH_MATKHAU: e.target.value })}
              placeholder="Nhập mật khẩu mới..."
            />*/}

            <div id="userProfile-modalButtons">
              <button id="userProfile-cancelBtn" onClick={() => setShowEdit(false)}>
                Hủy
              </button>
              <button id="userProfile-saveBtn" onClick={handleSave}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal xem chi tiết hợp đồng */}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Chi tiết hợp đồng {viewing.HDT_MAHDT}</h3>
            <p><strong>Khách:</strong> {viewing.KH_SOCCCD} · {viewing.KH_SOGPLX}</p>
            <p><strong>Xe:</strong> {viewing.HangXe} {viewing.TenModel} ({viewing.XE_MAXE})</p>
            <p><strong>Thời gian:</strong> {viewing.HDT_NGAYGIOBDTHUE ? new Date(viewing.HDT_NGAYGIOBDTHUE).toLocaleString() : "—"} → {viewing.HDT_NGAYGIOKTTHUE ? new Date(viewing.HDT_NGAYGIOKTTHUE).toLocaleString() : "—"}</p>
            <p><strong>Số ngày:</strong> {viewing.Days || "—"}</p>
            <p><strong>Giá thuê/ngày:</strong> {(viewing.GiaThueNgay || 0).toLocaleString("vi-VN")}đ</p>
            <p><strong>Chi nhánh:</strong> {viewing.ChiNhanhDiaChi || "—"}</p>
            <p><strong>Tổng tiền:</strong> {(viewing.Total || 0).toLocaleString("vi-VN")}đ</p>
            <p><strong>Chủ xe:</strong> {viewing.CX_HOTENCX || "—"} · {viewing.CX_SODT || "—"}</p>
            <p><strong>Ghi chú:</strong> {viewing.HDT_CHITIETHD || "—"}</p>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => setViewing(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;