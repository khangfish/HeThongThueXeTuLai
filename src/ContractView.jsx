import React, { useRef, useState } from "react"; // XÓA useEffect
import html2canvas from "html2canvas";
import { useNavigate, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";

const API = "http://localhost:3000";

export default function ContractView() {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = location.state || {};
  const containerRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState(null);
  
  // Chụp ảnh và lưu PNG (Giữ nguyên)
  const captureAndUploadImage = async () => {
    if (!containerRef.current) return null;
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL("image/png");
      const filename = payload?.HDT_MAHDT ? `HDT_${payload.HDT_MAHDT}.png` : `HDT_${Date.now()}.png`;
      const res = await fetch(`${API}/save-contract-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, filename }),
      });
      const j = await res.json();
      if (res.ok) setSavedInfo((prev) => ({ ...(prev || {}), image: j }));
      return dataUrl;
    } catch (e) {
      console.error("Save image error:", e);
      return null;
    }
  };

  // (SỬA HOÀN TOÀN) Xuất PDF với logic ngắt trang thủ công chính xác
  const createPdfAndUpload = async () => {
    if (!containerRef.current) return null;
    
    try {
      // 1. Khởi tạo PDF
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth(); // Chiều rộng A4 (khoảng 595pt)
      const pdfHeight = pdf.internal.pageSize.getHeight(); // Chiều cao A4 (khoảng 841pt)
      
      // 2. Chụp toàn bộ nội dung (dù dài bao nhiêu)
      const canvas = await html2canvas(containerRef.current, {
        scale: 2, // Tăng độ phân giải
        useCORS: true,
        width: 800, // Khóa chiều rộng canvas
        windowWidth: 800 // Giả lập chiều rộng
      });
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // 3. Tính toán tỷ lệ
      // Tính chiều cao của 1 trang PDF (tính bằng pixel của canvas)
      // (Chiều cao Canvas / Chiều rộng Canvas) = (Chiều cao PDF / Chiều rộng PDF)
      // => Chiều cao Canvas = Chiều rộng Canvas * (Chiều cao PDF / Chiều rộng PDF)
      const canvasHeightPerPdfPage = canvasWidth * (pdfHeight / pdfWidth);
      
      // 4. Tính tổng số trang
      const totalPages = Math.ceil(canvasHeight / canvasHeightPerPdfPage);
      
      // 5. Lặp và cắt ảnh
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        // Tính vị trí cắt (theo trục Y)
        const yOffset = i * canvasHeightPerPdfPage;
        
        // Tạo một canvas tạm để giữ trang cắt
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeightPerPdfPage;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Vẽ phần ảnh đã cắt từ canvas gốc vào canvas tạm
        tempCtx.drawImage(
          canvas,
          0, // Vị trí X nguồn (bắt đầu cắt)
          yOffset, // Vị trí Y nguồn (bắt đầu cắt)
          canvasWidth, // Chiều rộng nguồn
          canvasHeightPerPdfPage, // Chiều cao nguồn (cắt 1 trang)
          0, // Vị trí X đích (vẽ)
          0, // Vị trí Y đích (vẽ)
          canvasWidth, // Chiều rộng đích
          canvasHeightPerPdfPage // Chiều cao đích
        );
        
        const pageDataUrl = tempCanvas.toDataURL('image/png', 1.0);
        
        // Thêm ảnh (trang) vào PDF, co dãn vừa khít trang A4
        pdf.addImage(pageDataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      // 6. Lưu và Tải lên
      const pdfFileName = payload?.HDT_MAHDT
        ? `HDT_${payload.HDT_MAHDT}.pdf`
        : `HDT_${Date.now()}.pdf`;
        
      pdf.save(pdfFileName); // 1. Lưu về máy

      // 2. Tải lên server
      const dataUri = pdf.output("datauristring");
      const res = await fetch(`${API}/save-contract-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUri, filename: pdfFileName }),
      });
      const j = await res.json();
      if (res.ok) setSavedInfo((prev) => ({ ...(prev || {}), pdf: j }));
      return dataUri;

    } catch (e) {
      console.error("PDF generation error:", e);
      return null;
    }
  };

  const handleSaveContract = async () => {
    setSaving(true);
    await captureAndUploadImage(); 
    await createPdfAndUpload();   // Chạy chức năng lưu PDF đã sửa
    setSaving(false);
  };

  return (
    <div className="container py-4">
      {/* Thanh nút điều khiển */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Quay lại
        </button>
        <div className="d-flex align-items-center gap-2">
          {/* Phân trang trong trình duyệt đã bị xóa, vì PDF sẽ tự ngắt trang */}
          <button
            className="btn btn-success"
            onClick={handleSaveContract}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu hợp đồng (Ảnh + PDF)"}
          </button>
        </div>
      </div>

      {/* Giấy hợp đồng */}
      <div
        ref={containerRef}
        className="bg-white p-5 mx-auto shadow rounded"
        style={{
          width: "800px", // Giữ nguyên kích thước A4
          // SỬA: Xóa minHeight để nội dung dài ra tự nhiên
          // minHeight: "1123px", 
          border: "1px solid #ddd",
          boxShadow: "0 0 8px rgba(0,0,0,0.2)",
          paddingTop: "60px",
        }}
      >
        {/* Tiêu đề */}
        <div className="text-center mb-4">
          <h2 className="fw-bold" style={{ letterSpacing: 2 }}>
            HỢP ĐỒNG THUÊ XE
          </h2>
          <div className="text-muted">
            Mã hợp đồng: <strong>{payload?.HDT_MAHDT || "—"}</strong>
          </div>
        </div>
        
        {/* Bên cho thuê */}
        <div className="mb-3">
          <h5 className="text-success">Thông tin bên cho thuê (Chủ xe)</h5>
          <p>Tên: <strong>{payload?.car?.CX_HOTENCX || "—"}</strong></p>
          <p>Điện thoại: {payload?.car?.CX_SODT || "—"}</p>
          <p>Email: {payload?.car?.CX_EMAIL || "—"}</p>
          <p>Ngân hàng: {payload?.car?.CX_NGANHANG || "—"}</p>
          <p>Số tài khoản: {payload?.car?.CX_STK || "—"}</p>
        </div>

        {/* Bên thuê */}
        <div className="mb-3">
          <h5 className="text-success">Thông tin khách hàng (Bên thuê)</h5>
          <p>Tên: <strong>{payload?.user?.KH_TENND || "—"}</strong></p>
          <p>CCCD: {payload?.user?.KH_SOCCCD || "—"}</p>
          <p>GPLX: {payload?.user?.KH_SOGPLX || "—"}</p>
          <p>Điện thoại: {payload?.user?.KH_SODIENTHOAI || "—"}</p>
          <p>Email: {payload?.user?.KH_EMAIL || "—"}</p>
        </div>

        {/* Xe */}
        <div className="mb-3">
          <h5 className="text-success">Thông tin xe</h5>
          <p>
            {payload?.car?.HangXe} {payload?.car?.TenModel} (
            <strong>{payload?.car?.MaXe || "—"}</strong>)
          </p>
          <p>Biển số: {payload?.car?.BienSo || "—"}</p>
          <p>Địa điểm nhận: {payload?.car?.DiaChi || "—"}</p>
          <p>
            Giá thuê/ngày:{" "}
            {payload?.car?.GiaThueNgay
              ? `${Number(payload.car.GiaThueNgay).toLocaleString("vi-VN")}đ`
              : "—"}
          </p>
        </div>

        {/* Thời hạn thuê */}
        <div className="mb-3">
          <h5 className="text-success">Thời hạn thuê</h5>
          <p>
            {payload?.startDate
              ? new Date(payload.startDate).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—"}{" "}
            →{" "}
            {payload?.endDate
              ? new Date(payload.endDate).toLocaleDateString("vi-VN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—"}{" "}
            (Số ngày: {payload?.days || "—"})
          </p>
        </div>

        {/* Điều khoản */}
        {payload?.terms?.length > 0 && (
          <div className="mb-4">
            <h5 className="text-success">Điều khoản hợp đồng</h5>
            <ol>
              {payload.terms.map((t, i) => (
                <li key={i} style={{ textAlign: "justify" }}>{t.NoiDung || t.DKSDDV_NOIDUNG}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Nội dung */}
        <div className="mb-4">
          <h5 className="text-success">Nội dung hợp đồng</h5>
          <p style={{ whiteSpace: "pre-wrap", textAlign: "justify" }}>
            {payload?.HDT_CHITIETHD || payload?.chitiet || "—"}
          </p>
        </div>

        {/* Ký tên */}
        {/* (MỚI) Thêm page-break-avoid để tránh bị ngắt trang ngay chữ ký */}
        <div className="row mt-5 text-center" style={{ pageBreakInside: 'avoid' }}>
          <div className="col-6">
            <p>Chữ ký bên cho thuê</p>
            <div style={{ height: 80 }}></div>
            <p><strong>{payload?.car?.CX_HOTENCX || " "}</strong></p>
          </div>
          <div className="col-6">
            <p>Chữ ký bên thuê</p>
            <div style={{ height: 80 }}></div>
            <p><strong>{payload?.user?.KH_TENND || " "}</strong></p>
          </div>
        </div>
      </div>

      {savedInfo && (
        <div className="alert alert-success mt-4">
          <h6 className="fw-bold">Lưu thành công!</h6>
          {savedInfo.image && (
            <div>
              Ảnh: <strong>{savedInfo.image.filename}</strong> →{" "}
              <code>{savedInfo.image.path}</code>
            </div>
          )}
          {savedInfo.pdf && (
            <div>
              PDF: <strong>{savedInfo.pdf.filename}</strong> →{" "}
              <code>{savedInfo.pdf.path}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}