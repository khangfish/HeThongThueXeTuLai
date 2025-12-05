// OwnerBranches.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  useMapEvents,
  useMap, 
} from "react-leaflet";
import { useNavigate } from "react-router-dom"; // (MỚI) Thêm useNavigate
import L from "leaflet";
import "./OwnerBranches.css"; 

/* Helper tạo icon (Giữ nguyên) */
function makeIcon(color = "#198754") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 24 24" fill="${color}">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    className: "custom-marker",
    html: svg,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42],
  });
}

function PermanentPopupMarker({ children, position, icon }) {
  const map = useMap();
  const popupRef = useRef(null);
  const markerRef = useRef(null); // (MỚI) Thêm ref cho Marker

  useEffect(() => {
    // (SỬA) Đợi cho cả 3 (popup, marker, và position) sẵn sàng
    if (popupRef.current && markerRef.current && position) { 
      // (SỬA) Gắn popup vào marker và MỞ TỪ MARKER
      markerRef.current.bindPopup(popupRef.current);
      markerRef.current.openPopup();
    }
  }, [map, popupRef, markerRef, position]); // (SỬA) Thêm dependency

  return (
    <Marker position={position} icon={icon} ref={markerRef}> {/* (MỚI) Gán ref cho marker */}
      <Popup 
        ref={popupRef} 
        closeButton={false} 
        autoClose={false} 
        closeOnClick={false}
        className="permanent-popup"
      >
        {children}
      </Popup>
    </Marker>
  );
}


/* Component Map con (Giữ nguyên) */
function SelectLocationMap({ initial, onSelect, onSelectInfo }) {
  const [pos, setPos] = useState(initial || null);
  const [loading, setLoading] = useState(false);
  const reverseGeocode = async (latlng) => {
    setLoading(true);
    onSelectInfo(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`
      );
      if (!res.ok) throw new Error("Nominatim request failed");
      const data = await res.json();
      onSelectInfo(data); 
    } catch (err) {
      console.error("Lỗi Reverse Geocoding:", err);
      onSelectInfo({ error: "Không thể lấy địa chỉ." });
    } finally {
      setLoading(false);
    }
  };
  useMapEvents({
    click(e) {
      const latlng = e.latlng;
      setPos(latlng);
      onSelect && onSelect(latlng);
      reverseGeocode(latlng);
    },
  });
  return pos ? (
    <Marker position={pos} icon={makeIcon("#0b6623")}>
      <Popup>{loading ? "Đang tìm địa chỉ..." : "Vị trí đã chọn"}</Popup>
    </Marker>
  ) : null;
}


// ===== COMPONENT CHÍNH =====
export default function OwnerBranches() {
  // === (SỬA LỖI 1) LẤY ownerId ĐÚNG CÁCH ===
  const [owner, setOwner] = useState(null);
  const ownerId = owner?.CX_MACX; // Lấy ID từ state
  const navigate = useNavigate();
  // === KẾT THÚC SỬA ===

  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState(null); 
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showPickLocation, setShowPickLocation] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSoDiaChi, setNewSoDiaChi] = useState("");
  const [newLocation, setNewLocation] = useState(null); 
  const [newLocationInfo, setNewLocationInfo] = useState(null); 
  const [message, setMessage] = useState("");
  const mainMapRef = useRef(null);
  const API_BASE = "http://localhost:3000";

  // (SỬA LỖI 1) Thêm useEffect để lấy 'owner' từ localStorage
  useEffect(() => {
    const stored = localStorage.getItem("owner");
    if (stored) {
      setOwner(JSON.parse(stored));
    } else {
      navigate("/login-owner"); // Chuyển hướng nếu chưa đăng nhập
    }
  }, [navigate]);

  // (SỬA LỖI 1) useEffect này giờ sẽ chạy lại khi ownerId thay đổi
  useEffect(() => {
    if (!ownerId) {
      // Đợi ownerId được load, không báo lỗi ngay
      return; 
    }
    fetchBranches();
  }, [ownerId]); // Phụ thuộc vào ownerId từ state

  const showToast = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000); 
  };

  async function fetchBranches() {
    if (!ownerId) return; // Bảo vệ lần 2
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/branches`);
      if (!res.ok) throw new Error("Failed to fetch branches");
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast("Không thể tải danh sách chi nhánh.");
    } finally {
      setLoading(false);
    }
  }

  // ... (Giữ nguyên các hàm: openBranch, fetchCarsForBranch, openAddModal, openEditModal) ...
  function openBranch(branch) {
    setSelected(branch);
    setShowBranchModal(true);
    fetchCarsForBranch(branch.CNTX_MACNTX);
  }

  async function fetchCarsForBranch(cntxId) {
    try {
      const res = await fetch(`${API_BASE}/branches/${cntxId}/cars`);
      const data = await res.json();
      setCars(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCars([]);
    }
  }

  const openAddModal = () => {
    setNewSoDiaChi("");
    setNewLocation(null);
    setNewLocationInfo(null);
    setShowAddModal(true);
  };
  
  const openEditModal = (branch) => {
    setSelected(branch);
    setNewSoDiaChi(branch.CNTX_SODIACHI || "");
    setNewLocation(null);
    setNewLocationInfo(null);
    setShowPickLocation(true);
  };

  // ... (Giữ nguyên các hàm: handleSaveNewLocation, handleSaveNewBranch) ...
  async function handleSaveNewLocation() {
    if (!selected || !newSoDiaChi || !newLocation || !newLocationInfo || newLocationInfo.error) {
      showToast("Vui lòng nhập Số địa chỉ và chọn 1 vị trí mới trên bản đồ.");
      return;
    }
    const addr = newLocationInfo.address || {};
    const tpName = addr.city || addr.state || addr.province || "TP không rõ";
    const phuongName = addr.suburb || addr.quarter || addr.ward || addr.city_district || addr.village || addr.town || addr.neighbourhood || addr.municipality || "Phường không rõ";
    const duongName = addr.road || addr.street || "Đường không rõ";
    try {
      const ensureRes = await fetch(`${API_BASE}/locations/ensure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: newLocation.lat,
          lng: newLocation.lng,
          tpName,
          phuongName,
          duongName,
        }),
      });
      const ensureData = await ensureRes.json();
      if (!ensureRes.ok) throw new Error(ensureData.error || "Lỗi ensure location");
      const { duongId, phuongId, tpId } = ensureData;
      const updRes = await fetch(`${API_BASE}/branches/${selected.CNTX_MACNTX}/update-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: newLocation.lat,
          lng: newLocation.lng,
          DUONG_MADUONG: duongId,
          PHUONG_MAPHUONG: phuongId,
          TP_MATP: tpId,
          addressText: newSoDiaChi,
        }),
      });
      const updData = await updRes.json();
      if (updRes.ok) {
        showToast("Cập nhật vị trí chi nhánh thành công.");
        await fetchBranches();
        const refRes = await fetch(`${API_BASE}/branches/${selected.CNTX_MACNTX}`);
        const refBranch = await refRes.json();
        setSelected(refBranch);
        setShowPickLocation(false);
        setNewLocation(null);
        setNewLocationInfo(null);
      } else {
        showToast(updData.error || "Lỗi khi cập nhật vị trí.");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Lỗi server khi cập nhật vị trí.");
    }
  }

  async function handleSaveNewBranch() {
    if (!newSoDiaChi || !newLocation || !newLocationInfo || newLocationInfo.error) {
      showToast("Vui lòng nhập số địa chỉ và chọn vị trí trên bản đồ.");
      return;
    }
    const addr = newLocationInfo.address || {};
    const tpName = addr.city || addr.state || addr.province || "TP không rõ";
    const phuongName = addr.suburb || addr.quarter || addr.ward || addr.city_district || addr.village || addr.town || addr.neighbourhood || addr.municipality || "Phường không rõ";
    const duongName = addr.road || addr.street || "Đường không rõ";
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soDiaChi: newSoDiaChi,
          lat: newLocation.lat,
          lng: newLocation.lng,
          tpName,
          phuongName,
          duongName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Thêm chi nhánh thành công!");
        setShowAddModal(false);
        fetchBranches();
      } else {
        showToast(data.error || "Lỗi khi thêm chi nhánh.");
      }
    } catch (err) {
      showToast(err.message || "Lỗi server.");
    }
  }

  // ... (Giữ nguyên: centerOn, getCoords, defaultCenter, closePickLocation, closeAddModal) ...
  function centerOn(lat, lng) {
    if (!mainMapRef.current) return;
    try {
      mainMapRef.current.setView([lat, lng], 15, { animate: true });
    } catch (e) {}
  }

  const getCoords = (b) => {
    // (SỬA LỖI 2) Kiểm tra `b` có tồn tại không
    const lat = Number(b?.CNTX_LATITUDE) || Number(b?.latitude) || 0;
    const lng = Number(b?.CNTX_LONGTITUDE) || Number(b?.longitude) || 0;
    if (lat === 0 && lng === 0) return [10.762622, 106.660172];
    return [lat, lng];
  }

  const defaultCenter = branches.length
    ? getCoords(branches[0])
    : [10.762622, 106.660172]; 

  const closePickLocation = () => {
    setShowPickLocation(false);
    setNewLocation(null);
    setNewLocationInfo(null);
    setNewSoDiaChi("");
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewLocation(null);
    setNewLocationInfo(null);
    setNewSoDiaChi("");
  };

  return (
    <div id="ownerBranches-page">
      
      {/* Cột danh sách bên trái (Giữ nguyên) */}
      <div id="ownerBranches-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>Chi nhánh</h2>
          <button className="primary-btn" onClick={openAddModal} style={{fontSize: '0.9rem', padding: '8px 12px'}}>
            Thêm mới
          </button>
        </div>
        {loading ? (
          <p>Đang tải...</p>
        ) : branches.length === 0 ? (
          <p>Không có chi nhánh nào.</p>
        ) : (
          <ul id="ownerBranches-list">
            {branches.map((b) => {
              const [lat, lng] = getCoords(b);
              const addressMeta = [b.DUONG_TENDUONG, b.PHUONG_TENPHUONG, b.TP_TENTP]
                                  .filter(Boolean) 
                                  .join(', ');
              return (
                <li key={b.CNTX_MACNTX} onClick={() => { openBranch(b); centerOn(lat, lng); }}>
                  <div className="branch-row">
                    <div className="branch-name">{b.CNTX_SODIACHI || `Chi nhánh #${b.CNTX_MACNTX}`}</div>
                    <div className="branch-meta">{addressMeta}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cột bản đồ bên phải (Giữ nguyên) */}
      <div id="ownerBranches-map">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mainMapRef}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Bản đồ Vệ tinh">
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* (SỬA LỖI 2) Xóa guard clause (!lat || !lng) */}
          {branches.map((b) => {
            const [lat, lng] = getCoords(b);
            // if (!lat || !lng) return null; // <--- XÓA DÒNG NÀY
            
            const addressMeta = [b.DUONG_TENDUONG, b.PHUONG_TENPHUONG, b.TP_TENTP]
                                  .filter(Boolean)
                                  .join(', ');
            const branchLabel = b.CNTX_SODIACHI || `Chi nhánh #${b.CNTX_MACNTX}`;

            return (
              <PermanentPopupMarker 
                key={b.CNTX_MACNTX} 
                position={[lat, lng]} // Giờ [lat, lng] luôn là mảng số hợp lệ
                icon={makeIcon()}
              >
                {/* Đây là nội dung popup */}
                <div style={{ minWidth: 220 }}>
                  <strong>{branchLabel}</strong>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    {addressMeta}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button className="mini-btn" onClick={() => openBranch(b)}>Xem</button>
                    <button className="mini-btn" onClick={() => openEditModal(b)}>
                      Đổi vị trí
                    </button>
                  </div>
                </div>
              </PermanentPopupMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* (Giữ nguyên toàn bộ các Modal) */}
      {/* MODAL CHI TIẾT CHI NHÁNH */}
      {showBranchModal && selected && (
        <div id="ownerBranches-branchModalBackdrop" onClick={() => setShowBranchModal(false)}>
          <div id="ownerBranches-branchModal" onClick={(e) => e.stopPropagation()}>
            <h3>Chi nhánh: {selected.CNTX_SODIACHI || `#${selected.CNTX_MACNTX}`}</h3>
            <div className="branchModal-row">
              <div>
                <p><strong>Địa chỉ:</strong> {selected.CNTX_SODIACHI || "—"}</p>
                <p><strong>Đường:</strong> {selected.DUONG_TENDUONG || "—"}</p>
                <p><strong>Phường:</strong> {selected.PHUONG_TENPHUONG || "—"}</p>
                <p><strong>Tỉnh/TP:</strong> {selected.TP_TENTP || "—"}</p>
                <p><strong>Toạ độ:</strong> {getCoords(selected)[0].toFixed(6)} , {getCoords(selected)[1].toFixed(6)}</p>
              </div>
              <div>
                <button className="primary-btn" onClick={() => { setShowBranchModal(false); openEditModal(selected); }}>
                  Đổi vị trí
                </button>
              </div>
            </div>
            <hr />
            <h4>Danh sách xe tại chi nhánh</h4>
            <div className="branch-cars">
              {cars.length === 0 ? <p>Không có xe nào tại chi nhánh này.</p> : (
                <table>
                  <thead><tr><th>Biển số</th><th>Model</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {cars.map(c => (
                      <tr key={c.MaXe}>
                        <td>{c.BienSo}</td>
                        <td>{c.TenModel}</td>
                        <td>{c.TrangThai || c.TTX_TENTINHTRANG || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ textAlign: "right", marginTop: 14 }}>
              <button onClick={() => setShowBranchModal(false)} className="secondary-btn">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỌN VỊ TRÍ (SỬA) */}
      {showPickLocation && selected && (
        <div id="ownerBranches-pickModalBackdrop" onClick={closePickLocation}>
          <div id="ownerBranches-pickModal" onClick={(e) => e.stopPropagation()}>
            <h3>Đổi vị trí cho: {selected.CNTX_SODIACHI || `#${selected.CNTX_MACNTX}`}</h3>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="editSoDiaChiInput" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Số địa chỉ (Số nhà, Tên đường) <span style={{color: 'red'}}>*</span>
              </label>
              <input
                id="editSoDiaChiInput"
                type="text"
                value={newSoDiaChi}
                onChange={(e) => setNewSoDiaChi(e.target.value)}
                placeholder="V.dụ: 123 Nguyễn Văn Linh"
                style={{ width: '100%', padding: '8px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div id="ownerBranches-pickMap">
              <MapContainer
                center={getCoords(selected)}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={getCoords(selected)} icon={makeIcon("#198754")}>
                  <Popup>Vị trí hiện tại</Popup>
                </Marker>
                <SelectLocationMap
                  initial={null}
                  onSelect={setNewLocation}
                  onSelectInfo={setNewLocationInfo}
                />
              </MapContainer>
            </div>
            <div style={{ marginTop: 12 }}>
              <div><strong>Vị trí mới (click map):</strong> {newLocationInfo?.error ? <span style={{color: 'red'}}>{newLocationInfo.error}</span> : ''}</div>
              {newLocationInfo?.display_name && (
                <div style={{ fontSize: '0.9em', background: '#f4f4f4', padding: '8px', borderRadius: '4px' }}>
                  {newLocationInfo.display_name}
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="secondary-btn" onClick={closePickLocation}>Hủy</button>
              <button
                className="primary-btn"
                onClick={handleSaveNewLocation}
                disabled={!newSoDiaChi || !newLocation || !newLocationInfo || newLocationInfo.error} 
              >
                Lưu vị trí
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL THÊM CHI NHÁNH */}
      {showAddModal && (
        <div id="ownerBranches-pickModalBackdrop" onClick={closeAddModal}>
          <div id="ownerBranches-pickModal" onClick={(e) => e.stopPropagation()}>
            <h3>Thêm chi nhánh mới</h3>
            <div style={{ marginBottom: 10 }}>
              <label htmlFor="newSoDiaChiInput" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Số địa chỉ (Số nhà, Tên đường) <span style={{color: 'red'}}>*</span>
              </label>
              <input
                id="newSoDiaChiInput"
                type="text"
                value={newSoDiaChi}
                onChange={(e) => setNewSoDiaChi(e.target.value)}
                placeholder="V.dụ: 456 Võ Văn Kiệt"
                style={{ width: '100%', padding: '8px', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div id="ownerBranches-pickMap">
              <MapContainer
                center={defaultCenter} 
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <SelectLocationMap
                  initial={null}
                  onSelect={setNewLocation}
                  onSelectInfo={setNewLocationInfo}
                />
              </MapContainer>
            </div>
            <div style={{ marginTop: 12 }}>
              <div><strong>Vị trí (click map):</strong> {newLocationInfo?.error ? <span style={{color: 'red'}}>{newLocationInfo.error}</span> : ''}</div>
              {newLocationInfo?.display_name && (
                <div style={{ fontSize: '0.9em', background: '#f4f4f4', padding: '8px', borderRadius: '4px' }}>
                  {newLocationInfo.display_name}
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, textAlign: "right", display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="secondary-btn" onClick={closeAddModal}>Hủy</button>
              <button
                className="primary-btn"
                onClick={handleSaveNewBranch}
                disabled={!newSoDiaChi || !newLocation || !newLocationInfo || newLocationInfo.error}
              >
                Lưu chi nhánh
              </button>
            </div>
          </div>
        </div>
      )}

      {message && <div id="ownerBranches-toast">{message}</div>}
    </div>
  );
}