// ...existing code...
import React, { useEffect, useRef } from "react";
import "./modalCustom.css";

export default function ModalWrapper({ children, onClose, size = "md", ariaLabel = "modal" }) {
  const backdropRef = useRef(null);
  const dialogRef = useRef(null);
  const sizeClass = size === "sm" ? "modal-sm" : size === "lg" ? "modal-lg" : "modal-md";

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    // focus first focusable element inside modal
    const focusable = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus?.();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="custom-modal-backdrop" ref={backdropRef} onMouseDown={(e) => {
      // close when clicking backdrop (but not when clicking dialog)
      if (e.target === backdropRef.current) onClose && onClose();
    }}>
      <div className="modal d-block" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <div ref={dialogRef} className={`modal-dialog modal-dialog-centered ${sizeClass}`} role="document">
          <div className="modal-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}