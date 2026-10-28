import React, { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, QrCode, X, CheckCircle2, AlertCircle, RefreshCw, Keyboard, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function StudentQrScannerModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('camera') // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkInResult, setCheckInResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const scannerRef = useRef(null)
  const isStartedRef = useRef(false)

  // Bắt đầu Camera Scanner
  const startScanner = async () => {
    setCameraError(null)
    setErrorMessage(null)

    // Đợi DOM render element qr-video-region
    setTimeout(async () => {
      try {
        const element = document.getElementById('qr-video-region')
        if (!element) return

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-video-region')
        }

        if (isStartedRef.current) {
          return
        }

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }

        await scannerRef.current.start(
          { facingMode: 'environment' }, // Ưu tiên camera sau của điện thoại
          config,
          onScanSuccess,
          (err) => {
            // bỏ qua frame scan không thấy QR
          }
        )

        isStartedRef.current = true
        setIsScanning(true)
      } catch (err) {
        console.warn('Lỗi khởi động camera scanner:', err)
        setCameraError('Không thể mở camera. Vui lòng cấp quyền camera trong cài đặt trình duyệt hoặc chuyển sang tab Nhập mã thủ công.')
        setIsScanning(false)
      }
    }, 150)
  }

  // Dừng Camera Scanner an toàn
  const stopScanner = async () => {
    if (scannerRef.current && isStartedRef.current) {
      try {
        await scannerRef.current.stop()
        isStartedRef.current = false
        setIsScanning(false)
      } catch (err) {
        console.warn('Lỗi khi dừng scanner:', err)
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      setCheckInResult(null)
      setErrorMessage(null)
      setManualToken('')
      if (activeTab === 'camera') {
        startScanner()
      }
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, activeTab])

  // Xử lý khi quét thấy mã QR
  const onScanSuccess = async (decodedText) => {
    if (submitting) return
    console.log('Quét thành công QR token:', decodedText)
    
    // Tạm dừng scanner để tránh gửi liên tiếp
    await stopScanner()
    await submitAttendance(decodedText)
  }

  // Gửi API điểm danh
  const submitAttendance = async (token) => {
    if (!token || !token.trim()) {
      setErrorMessage('Mã điểm danh không hợp lệ.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await api.post('/attendance/check-in', {
        qrToken: token.trim(),
        deviceInfo: navigator.userAgent
      })

      if (res.data?.data) {
        setCheckInResult(res.data.data)
        if (onSuccess) {
          onSuccess(res.data.data)
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Điểm danh không thành công. Mã QR có thể đã hết hạn (sau 15s).'
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    submitAttendance(manualToken)
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  const handleRetryCamera = () => {
    setCheckInResult(null)
    setErrorMessage(null)
    startScanner()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Quét Mã QR Điểm Danh</h3>
              <p className="text-[11px] text-slate-500">Mã TOTP bảo mật xoay 15 giây/lần</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        {!checkInResult && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
            <button
              onClick={() => {
                setActiveTab('camera')
                setErrorMessage(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Camera size={14} />
              Quét Camera Trực Tiếp
            </button>
            <button
              onClick={() => {
                stopScanner()
                setActiveTab('manual')
                setErrorMessage(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'manual'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Keyboard size={14} />
              Nhập Mã Thủ Công
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-4">
          {checkInResult ? (
            /* Kết quả thành công */
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-75">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full mb-1">
                  Đã Có Mặt
                </span>
                <h4 className="text-base font-bold text-slate-800">Điểm Danh Thành Công!</h4>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  {checkInResult.courseName} ({checkInResult.sectionCode})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinh viên: <span className="font-semibold text-slate-700">{checkInResult.studentName}</span> ({checkInResult.studentCode})
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-1.5 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block">
                  {checkInResult.message}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          ) : activeTab === 'camera' ? (
            /* Tab Camera Scanner */
            <div className="space-y-3">
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                  <AlertCircle size={24} className="text-amber-600 mx-auto" />
                  <p className="text-xs text-amber-800 font-medium">{cameraError}</p>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={handleRetryCamera}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Thử lại Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                    >
                      Nhập mã tay
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[280px]">
                  {/* Div viewport cho Html5Qrcode */}
                  <div id="qr-video-region" className="w-full h-full max-h-[320px] overflow-hidden" />
                  
                  {submitting && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                      <p className="text-xs font-semibold">Đang xác thực điểm danh...</p>
                    </div>
                  )}

                  {!isScanning && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2">
                      <Loader2 size={24} className="animate-spin" />
                      <p className="text-xs">Đang mở máy ảnh...</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-[11px] text-slate-400">
                💡 Hướng camera về phía mã QR trên máy chiếu. Mã QR đổi mới mỗi 15 giây.
              </p>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p>{errorMessage}</p>
                    <button
                      onClick={handleRetryCamera}
                      className="text-emerald-700 underline font-semibold mt-1 inline-flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Quét lại mã mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab Nhập mã thủ công */
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Token Điểm Danh:
                </label>
                <textarea
                  rows={3}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Dán mã token QR hiển thị trên màn chiếu (VD: 1.12.119284712.ab3f890...)"
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mã xoay vòng 15 giây/lần. Vui lòng gửi ngay khi lấy mã trên màn hình.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !manualToken.trim()}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Đang xác thực...' : 'Điểm danh ngay'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
