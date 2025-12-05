import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './OwnerCars.css'; 
// (MỚI) Import FullCalendar
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const API_BASE = "http://localhost:3000";
const PAGE_SIZE = 10; 

// (Giữ nguyên featureFields và defaultNewCar)
const featureFields = [
  { key: 'TIX_BANDO', label: 'Bản đồ' },
  { key: 'TIX_BLUETOOTH', label: 'Bluetooth' },
  { key: 'TIX_CAMERAHANHTRINH', label: 'Cam. hành trình' },
  { key: 'TIX_CAMERALUI', label: 'Camera lùi' },
  { key: 'TIX_CAMBIENVACHAM', label: 'Cảm biến' },
  { key: 'TIX_CANHBAOTOCDO', label: 'Cảnh báo tốc độ' },
  { key: 'TIX_DINHVIGPS', label: 'GPS' },
  { key: 'TIX_KHECAMUSB', label: 'USB' },
  { key: 'TIX_LOPDUPHONG', label: 'Lốp dự phòng' },
  { key: 'TIX_MANHINHDVD', label: 'Màn hình DVD' },
  { key: 'TIX_ETC', label: 'Thu phí tự động ETC' },
  { key: 'TIX_TUIKHIANTOAN', label: 'Túi khí an toàn' },
];

const defaultNewCar = {
  bienSo: '',
  modelId: '',
  giaThue: '',
  chiNhanhId: '',
  features: featureFields.reduce((acc, f) => ({ ...acc, [f.key]: false }), {}),
  images: [], 
};

// (MỚI) Hàm định dạng sự kiện cho FullCalendar
function formatScheduleToEvents(schedule) {
  return schedule.map(item => {
    const status = Number(item.TTX_MATTX);
    let title = item.TTX_TENTINHTRANG;
    let className = '';

    if (status === 2) { // Đang thuê
      title = `Đang thuê`;
      className = 'event-rented';
    } else if (status === 3) { // Bảo dưỡng
      title = `Bảo dưỡng`;
      className = 'event-maintenance';
    } else { // Sẵn sàng (TTX_MATTX = 1)
      return null; // Không cần hiển thị "Sẵn sàng"
    }
    
    // Xử lý ngày kết thúc (FullCalendar cần ngày *sau* ngày kết thúc)
    let endDate = item.BGTT_NGAYGIOKETTHUC ? new Date(item.BGTT_NGAYGIOKETTHUC) : null;
    if (endDate) {
      endDate.setDate(endDate.getDate() + 1); 
    }

    return {
      id: `${item.BGTT_NGAYGIOBATDAU}-${item.TTX_MATTX}`,
      title: title,
      start: new Date(item.BGTT_NGAYGIOBATDAU),
      end: endDate, // Nếu null, FullCalendar tự hiểu là đang diễn ra
      className: className,
      allDay: true,
    };
  }).filter(Boolean); // Lọc bỏ các sự kiện null
}


export default function OwnerCars() {
  const [owner, setOwner] = useState(null);
  const ownerId = owner?.CX_MACX;
  const navigate = useNavigate();

  // (Giữ nguyên state)
  const [cars, setCars] = useState([]);
  const [helpers, setHelpers] = useState({ branches: [], models: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCars, setTotalCars] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); 
  const [showStatusModal, setShowStatusModal] = useState(null); 
  const [warningModal, setWarningModal] = useState(null); 
  
  // (MỚI) State cho Modal Lịch
  const [showCalendarModal, setShowCalendarModal] = useState(null); // Sẽ lưu trữ {car}
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // (Giữ nguyên state)
  const [newCar, setNewCar] = useState(defaultNewCar);
  const [editData, setEditData] = useState({ giaThue: '', features: {} });
  const [statusData, setStatusData] = useState({ newStatusId: '', newBranchId: '' });
  const [editImages, setEditImages] = useState([]); 
  const [newEditImages, setNewEditImages] = useState([]); 
  const [selectedHang, setSelectedHang] = useState('');

  // (Giữ nguyên useMemo, showToast, fetchOwnerCars, fetchHelpers, useEffects)
  const uniqueBrands = useMemo(() => {
    const brands = new Set(helpers.models.map(m => m.HX_TENHANGXE));
    return Array.from(brands).sort();
  }, [helpers.models]);

  const filteredModels = useMemo(() => {
    if (!selectedHang) {
      return helpers.models;
    }
    return helpers.models.filter(m => m.HX_TENHANGXE === selectedHang);
  }, [selectedHang, helpers.models]);


  const showToast = (msg, isError = false) => {
    setMessage({ text: msg, error: isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchOwnerCars = useCallback(async (pageToFetch) => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/cars-with-status?page=${pageToFetch}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Không thể tải danh sách xe");
      const data = await res.json();
      setCars(data.items || []);
      setTotalCars(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      setCurrentPage(pageToFetch);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [ownerId]); 

  const fetchHelpers = useCallback(async () => {
    if (!ownerId) return;
    try {
      const res = await fetch(`${API_BASE}/owner-helpers/${ownerId}`, { cache: 'no-store' });
      const data = await res.json();
      setHelpers(data);
      if (data.branches?.length > 0) {
        setNewCar(prev => ({ ...prev, chiNhanhId: data.branches[0].CNTX_MACNTX }));
      }
    } catch (err) {
      console.error("Lỗi tải helpers:", err);
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
    if (ownerId) {
      fetchOwnerCars(currentPage);
      fetchHelpers();
    }
  }, [ownerId, currentPage, fetchOwnerCars, fetchHelpers]); 


  // --- Xử lý Form (Giữ nguyên) ---
  const handleNewCarChange = (e) => {
    const { name, value } = e.target;
    setNewCar(prev => ({ ...prev, [name]: value }));
  };
  const handleNewCarFeaturesChange = (key) => {
    setNewCar(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] }
    }));
  };
  const handleNewCarImageChange = (e) => {
    setNewCar(prev => ({ ...prev, images: Array.from(e.target.files) }));
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };
  const handleEditFeaturesChange = (key) => {
    setEditData(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] }
    }));
  };
  const handleNewEditImageChange = (e) => {
    setNewEditImages(Array.from(e.target.files));
  };
  const handleStatusChange = (e) => {
    const { name, value } = e.target;
    setStatusData(prev => ({ ...prev, [name]: value }));
  };

  // --- Xử lý Mở Modal (Giữ nguyên, chỉ thêm 1 hàm) ---
  const openEditModal = async (car) => {
    setEditData({
      giaThue: car.BG_GIATHUETHEONGAY || '',
      features: featureFields.reduce((acc, f) => ({
        ...acc,
        [f.key]: !!car[f.key]
      }), {})
    });
    setShowEditModal(car);
    setEditImages([]);
    setNewEditImages([]);
    try {
      const res = await fetch(`${API_BASE}/car-images/${car.XE_MAXE}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setEditImages(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Không thể tải ảnh xe");
    }
  };
  const openStatusModal = (car) => {
    setStatusData({
      newStatusId: car.TinhTrangHienTai_ID || '',
      newBranchId: car.ChiNhanhHienTai_ID || ''
    });
    setShowStatusModal(car);
  };
  const openAddModal = () => {
    setNewCar(defaultNewCar);
    setSelectedHang('');
    if (helpers.branches?.length > 0) {
      setNewCar(prev => ({ ...prev, chiNhanhId: helpers.branches[0].CNTX_MACNTX }));
    }
    setShowAddModal(true);
  };
  
  // (MỚI) Hàm mở Modal Lịch
  const openCalendarModal = async (car) => {
    setShowCalendarModal(car); // Mở modal ngay
    setLoadingCalendar(true);
    setCalendarEvents([]);
    try {
      const res = await fetch(`${API_BASE}/owner/car-schedule/${car.XE_MAXE}`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Không thể tải lịch xe");
      const scheduleData = await res.json();
      setCalendarEvents(formatScheduleToEvents(scheduleData));
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // --- Xử lý API (Giữ nguyên) ---
  const handleSaveNewCar = async (e) => {
    e.preventDefault();
    if (newCar.images.length < 4) {
      showToast("Bạn phải tải lên ít nhất 4 hình ảnh.", true);
      return;
    }
    const formData = new FormData();
    formData.append('bienSo', newCar.bienSo);
    formData.append('modelId', newCar.modelId);
    formData.append('giaThue', newCar.giaThue);
    formData.append('chiNhanhId', newCar.chiNhanhId);
    formData.append('features', JSON.stringify(newCar.features));
    for (const image of newCar.images) {
      formData.append('images', image);
    }
    try {
      const res = await fetch(`${API_BASE}/owner/${ownerId}/cars`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi thêm xe");
      showToast(data.message);
      setShowAddModal(false);
      setNewCar(defaultNewCar); 
      fetchOwnerCars(1); 
    } catch (err) {
      showToast(err.message, true);
    }
  };
  const handleUploadEditImages = async () => {
    if (newEditImages.length === 0) {
      showToast("Bạn chưa chọn file mới nào.", true);
      return;
    }
    const formData = new FormData();
    for (const image of newEditImages) {
      formData.append('images', image);
    }
    try {
      const res = await fetch(`${API_BASE}/owner/cars/${showEditModal.XE_MAXE}/images`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi tải ảnh lên");
      showToast(data.message);
      setNewEditImages([]); 
      openEditModal(showEditModal); 
    } catch (err) {
      showToast(err.message, true);
    }
  };
  const handleDeleteImage = async (imageUrl) => {
    if (!window.confirm("Bạn có chắc muốn xóa ảnh này?")) return;
    try {
      const res = await fetch(`${API_BASE}/owner/cars/image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi xóa ảnh");
      showToast(data.message);
      setEditImages(prev => prev.filter(img => img !== imageUrl));
    } catch (err) {
      showToast(err.message, true);
    }
  };
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/owner/update-car-details/${ownerId}/${showEditModal.XE_MAXE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi cập nhật chi tiết");
      showToast(data.message);
      fetchOwnerCars(currentPage); 
    } catch (err) {
      showToast(err.message, true);
    }
  };
  const handleRelinkImages = async () => {
    if (!showEditModal) return;
    try {
      const res = await fetch(`${API_BASE}/owner/cars/${showEditModal.XE_MAXE}/relink-images`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi khôi phục link");
      showToast(data.message);
      openEditModal(showEditModal); 
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // --- Xử lý Cảnh báo (Giữ nguyên) ---
  const proceedWithStatusUpdate = async (updateData) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/owner/update-car-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xeId: showStatusModal.XE_MAXE,
          ...updateData 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi cập nhật trạng thái");
      showToast(data.message);
      setShowStatusModal(null);
      setWarningModal(null); 
      fetchOwnerCars(currentPage);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  };
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    
    const currentStatusId = Number(showStatusModal.TinhTrangHienTai_ID);
    const newStatusIdNum = Number(statusData.newStatusId);
    
    if (currentStatusId === 1 && newStatusIdNum === 3) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/owner/cars/${showStatusModal.XE_MAXE}/future-bookings`, { cache: 'no-store' });
        const data = await res.json();
        
        if (data.hasBookings) {
          setWarningModal(statusData); 
        } else {
          proceedWithStatusUpdate(statusData);
        }
      } catch (err) {
        showToast(err.message, true);
      } finally {
        setLoading(false);
      }
    } else {
      proceedWithStatusUpdate(statusData);
    }
  };


  // --- Render Phân trang (Giữ nguyên) ---
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const startItem = (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, totalCars);
    return (
      <nav className="d-flex justify-content-between align-items-center mt-3">
        <span className="text-muted small">
          Hiển thị {startItem}-{endItem} của {totalCars} xe
        </span>
        <ul className="pagination mb-0">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <a 
              className="page-link" 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage - 1); }}
            >
              Trước
            </a>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <a 
              className="page-link" 
              href="#" 
              onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage + 1); }}
            >
              Sau
            </a>
          </li>
        </ul>
      </nav>
    );
  };

  // --- Render (Giữ nguyên) ---
  if (!owner) return null; // Chờ owner được tải

  return (
    <div className="container mt-5 mb-5"> 
      {message && (
        <div 
          className={`alert ${message.error ? 'alert-danger' : 'alert-success'} alert-dismissible fade show position-fixed top-0 end-0 m-3`}
          role="alert" 
          style={{ zIndex: 1056 }}
        >
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <h2 className="text-success mb-0">Quản lý Xe</h2>
        <button className="btn btn-success" onClick={openAddModal}>
          Thêm Xe Mới
        </button>
      </div>

      {loading && <p>Đang tải danh sách xe...</p>}
      
      {!loading && cars.length === 0 && <p>Bạn chưa có xe nào.</p>}

      {!loading && cars.length > 0 && (
        <>
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Biển số</th>
                  <th scope="col">Hãng / Model</th>
                  <th scope="col">Trạng thái hiện tại</th>
                  <th scope="col">Chi nhánh hiện tại</th>
                  <th scope="col">Giá (ngày)</th>
                  <th scope="col" style={{minWidth: "200px"}}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {cars.map(car => (
                  <tr key={car.XE_MAXE}>
                    <td><strong>{car.XE_BIENSOXE}</strong></td>
                    <td>{car.HX_TENHANGXE} - {car.MODEL_TENMODEL}</td>
                    <td>
                      <span className={
                        car.TinhTrangHienTai_ID === 3 ? 'text-warning fw-bold text-uppercase' : 
                        car.TinhTrangHienTai_ID === 2 ? 'text-danger fw-bold' : 'text-success fw-bold'
                      }>
                        {car.TinhTrangHienTai_Ten || 'Chưa rõ'}
                      </span>
                    </td>
                    <td>{car.ChiNhanhHienTai_Ten || 'Chưa rõ'}</td>
                    <td>{car.BG_GIATHUETHEONGAY ? car.BG_GIATHUETHEONGAY.toLocaleString('vi-VN') : 'N/A'} VNĐ</td>
                    <td className="d-flex flex-wrap gap-2">
                      {/* (SỬA) Thêm nút "Xem Lịch" */}
                      <button className="btn btn-outline-primary btn-sm" onClick={() => openCalendarModal(car)}>Xem Lịch</button>
                      <button className="btn btn-outline-success btn-sm" onClick={() => openEditModal(car)}>Chi tiết</button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => openStatusModal(car)}>Đổi trạng thái</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {renderPagination()}
        </>
      )}

      {/* --- CÁC MODAL (Giữ nguyên) --- */}
      
      {/* MODAL: THÊM XE MỚI (Giữ nguyên) */}
      {showAddModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-success">Thêm Xe Mới</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                </div>
                <form onSubmit={handleSaveNewCar} id="addCarForm" encType="multipart/form-data">
                  <div className="modal-body">
                    <div className="row g-3">
                       <div className="col-md-6">
                        <label className="form-label">Biển số xe *</label>
                        <input type="text" name="bienSo" value={newCar.bienSo} onChange={handleNewCarChange} required className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Hãng xe</label>
                        <select 
                          name="hangXe" 
                          value={selectedHang} 
                          onChange={(e) => {
                            setSelectedHang(e.target.value);
                            setNewCar(prev => ({ ...prev, modelId: '' }));
                          }} 
                          className="form-select"
                        >
                          <option value="">-- Chọn hãng (hoặc để trống) --</option>
                          {uniqueBrands.map(brand => (
                            <option key={brand} value={brand}>
                              {brand}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Model xe *</label>
                        <select name="modelId" value={newCar.modelId} onChange={handleNewCarChange} required className="form-select">
                          <option value="">-- Chọn model --</option>
                          {filteredModels.map(m => ( 
                            <option key={m.MODEL_MAMODEL} value={m.MODEL_MAMODEL}>
                              {m.HX_TENHANGXE} - {m.MODEL_TENMODEL}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Giá thuê / ngày (VNĐ) *</label>
                        <input type="number" name="giaThue" value={newCar.giaThue} onChange={handleNewCarChange} required className="form-control" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Chi nhánh ban đầu *</label>
                        <select name="chiNhanhId" value={newCar.chiNhanhId} onChange={handleNewCarChange} required className="form-select">
                          {helpers.branches.map(b => (
                            <option key={b.CNTX_MACNTX} value={b.CNTX_MACNTX}>
                              {b.CNTX_SODIACHI}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Hình ảnh (Chọn ít nhất 4 ảnh) *</label>
                        <input 
                          type="file" name="images" onChange={handleNewCarImageChange} 
                          className="form-control" multiple accept="image/*" required 
                        />
                        {newCar.images.length > 0 && (
                          <div className='mt-2 small text-muted'>
                            Đã chọn: {newCar.images.length} ảnh.
                          </div>
                        )}
                      </div>
                      <div className="col-12">
                        <h6 className="mt-2">Tiện ích</h6>
                        <div className="row g-2 p-3 bg-light border rounded">
                          {featureFields.map(f => (
                            <div key={f.key} className="col-md-4 col-sm-6">
                              <div className="form-check">
                                <input 
                                  className="form-check-input" type="checkbox" 
                                  checked={newCar.features[f.key]}
                                  onChange={() => handleNewCarFeaturesChange(f.key)}
                                  id={`add_${f.key}`}
                                />
                                <label className="form-check-label" htmlFor={`add_${f.key}`}>{f.label}</label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Hủy</button>
                    <button type="submit" className="btn btn-success" form="addCarForm">Lưu Xe Mới</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* MODAL: CẬP NHẬT CHI TIẾT XE (Giữ nguyên) */}
      {showEditModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Chi tiết xe: {showEditModal.XE_BIENSOXE}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(null)}></button>
                </div>
                <div className="modal-body">
                  <p><strong>Model:</strong> {showEditModal.HX_TENHANGXE} - {showEditModal.MODEL_TENMODEL}</p>
                  <form onSubmit={handleSaveDetails} id="editCarForm">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Giá thuê / ngày (VNĐ) *</label>
                        <input type="number" name="giaThue" value={editData.giaThue} onChange={handleEditChange} required className="form-control" />
                      </div>
                    </div>
                    <div className="col-12 mt-3">
                      <h6 className="mt-2">Tiện ích</h6>
                      <div className="row g-2 p-3 bg-light border rounded">
                        {featureFields.map(f => (
                          <div key={f.key} className="col-md-4 col-sm-6">
                            <div className="form-check">
                              <input 
                                className="form-check-input" type="checkbox" 
                                checked={editData.features[f.key]}
                                onChange={() => handleEditFeaturesChange(f.key)}
                                id={`edit_${f.key}`}
                              />
                              <label className="form-check-label" htmlFor={`edit_${f.key}`}>{f.label}</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </form>
                  <hr className="my-4" />
                  <div>
                    <h5 className="mb-3">Quản lý Hình ảnh</h5>
                    <div className="row g-2 mb-3">
                      {editImages.length === 0 && (
                        <div className="col-12">
                          <p className="text-muted small">Xe này chưa có hình ảnh nào.</p>
                          <button 
                            type="button" 
                            className="btn btn-outline-warning btn-sm"
                            onClick={handleRelinkImages}
                          >
                            Thử tìm lại ảnh bị mất (Fix)
                          </button>
                        </div>
                      )}
                      {editImages.map(imgUrl => (
                        <div key={imgUrl} className="col-md-3 col-6 position-relative">
                          <img src={`${API_BASE}${imgUrl}`} alt="Ảnh xe" className="img-thumbnail" />
                          <button 
                            className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                            onClick={() => handleDeleteImage(imgUrl)}
                            style={{lineHeight: 1, padding: '0.2rem 0.4rem'}}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <h6>Tải lên ảnh mới</h6>
                    <div className="input-group">
                      <input 
                        type="file" className="form-control" multiple 
                        accept="image/*" onChange={handleNewEditImageChange}
                      />
                      <button 
                        className="btn btn-outline-success" type="button" 
                        onClick={handleUploadEditImages}
                        disabled={newEditImages.length === 0}
                      >
                        Tải lên
                      </button>
                    </div>
                    {newEditImages.length > 0 && <div className='mt-2 small text-muted'>Đã chọn: {newEditImages.length} ảnh mới.</div>}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(null)}>Đóng</button>
                  <button type="submit" className="btn btn-success" form="editCarForm">Lưu Chi tiết (Giá/Tiện ích)</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* MODAL: ĐỔI TRẠNG THÁI (Giữ nguyên) */}
      {showStatusModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-dialog-centered"> 
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Đổi trạng thái: {showStatusModal.XE_BIENSOXE}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowStatusModal(null)}></button>
                </div>
                <form onSubmit={handleSaveStatus} id="statusForm">
                  <div className="modal-body">
                    <p>
                      <strong>Trạng thái hiện tại:</strong> {showStatusModal.TinhTrangHienTai_Ten || 'N/A'} <br/>
                      <strong>Chi nhánh hiện tại:</strong> {showStatusModal.ChiNhanhHienTai_Ten || 'N/A'}
                    </p>
                    <div className="mb-3">
                      <label className="form-label">Trạng thái mới *</label>
                      <select name="newStatusId" value={statusData.newStatusId} onChange={handleStatusChange} required className="form-select">
                        <option value="">-- Chọn trạng thái --</option>
                        {helpers.statuses.map(s => (
                          <option key={s.TTX_MATTX} value={s.TTX_MATTX}>
                            {s.TTX_TENTINHTRANG}
                            {s.TTX_MATTX === 3 ? ' (Không cho thuê)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Chi nhánh mới *</label>
                      <select name="newBranchId" value={statusData.newBranchId} onChange={handleStatusChange} required className="form-select">
                        <option value="">-- Chọn chi nhánh --</option>
                        {helpers.branches.map(b => (
                          <option key={b.CNTX_MACNTX} value={b.CNTX_MACNTX}>
                            {b.CNTX_SODIACHI}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(null)}>Hủy</button>
                    <button type="submit" className="btn btn-success" form="statusForm">Xác nhận</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* MODAL CẢNH BÁO (Giữ nguyên) */}
      {warningModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-dialog-centered"> 
              <div className="modal-content border-warning">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title">Cảnh báo</h5>
                  <button type="button" className="btn-close" onClick={() => setWarningModal(null)}></button>
                </div>
                <div className="modal-body">
                  <p>Xe này đã có khách đặt lịch thuê trong tương lai.</p>
                  <p>Nếu bạn chuyển sang "Bảo dưỡng", hợp đồng đó có thể bị ảnh hưởng. Bạn có chắc chắn muốn tiếp tục không?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setWarningModal(null)}>Hủy bỏ</button>
                  <button 
                    type="button" 
                    className="btn btn-warning" 
                    onClick={() => proceedWithStatusUpdate(warningModal)}
                  >
                    Vẫn tiếp tục
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
      
      {/* (MỚI) MODAL XEM LỊCH */}
      {showCalendarModal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-centered"> 
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Lịch xe: {showCalendarModal.XE_BIENSOXE}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowCalendarModal(null)}></button>
                </div>
                <div className="modal-body">
                  {loadingCalendar ? (
                    <div className="text-center p-5">
                      <div className="spinner-border text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="owner-calendar-modal-container">
                      <FullCalendar
                        key={showCalendarModal.XE_MAXE}
                        plugins={[dayGridPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                          left: 'prev,next today',
                          center: 'title',
                          right: 'dayGridMonth,dayGridWeek'
                        }}
                        events={calendarEvents}
                        locale="vi"
                        buttonText={{
                          today: 'Hôm nay',
                          month: 'Tháng',
                          week: 'Tuần',
                        }}
                        height="60vh"
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCalendarModal(null)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

    </div>
  );
}