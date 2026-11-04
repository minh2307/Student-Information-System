import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Keyboard,
  Loader2,
  ShieldAlert,
  Smartphone,
  Check
} from 'lucide-react'
import api from '../services/api'

/**
 * Component Quét Mã QR Điểm Danh Chuyên Nghiệp (PWA / Mobile WebRTC Optimized).
 * Khắc phục triệt để:
 * 1. Camera bị đen / lỗi getUserMedia trên Safari iOS & Chrome Android (HTTPS check, camera fallback, playsinline).
 * 2. Xử lý cấp quyền thân thiện với hướng dẫn chi tiết theo hệ điều hành iOS/Android.
 * 3. Tối ưu quét mã QR máy chiếu từ xa hoặc góc nghiêng (Hardware BarcodeDetector, responsive qrbox, FPS tối ưu).
 * 4. Chống bắn request trùng lặp (Immediate pause scanner + atomic flag).
 * 5. Bắt thông báo "ĐÃ ĐIỂM DANH TRƯỚC ĐÓ" hiển thị an tâm cho sinh viên.
 */
export default function StudentQrScannerModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('camera') // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkInResult, setCheckInResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [activeCameraLabel, setActiveCameraLabel] = useState('')

  const scannerRef = useRef(null)
  const isStartedRef = useRef(false)
  const isProcessingRef = useRef(false)
  const containerId = 'qr-camera-viewport'

  // Kiểm tra context bảo mật (HTTPS hoặc localhost) bắt buộc cho WebRTC trên mobile
  const checkSecureContext = () => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]'

    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || isLocalhost

    if (!isSecure) {
      return {
        valid: false,
        type: 'INSECURE_CONTEXT',
        title: 'Yêu cầu kết nối bảo mật (HTTPS)',
        message:
          'Trình duyệt di động (iOS Safari / Android Chrome) chặn quyền truy cập Camera qua HTTP không an toàn. Vui lòng truy cập qua HTTPS hoặc dùng chức năng "Nhập Mã Thủ Công" bên dưới.'
      }
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        valid: false,
        type: 'UNSUPPORTED',
        title: 'Thiết bị không hỗ trợ MediaDevices',
        message:
          'Trình duyệt của bạn không hỗ trợ API truy cập camera WebRTC. Vui lòng cập nhật trình duyệt mới nhất hoặc nhập mã điểm danh thủ công.'
      }
    }

    return { valid: true }
  }

  // Dừng Camera Scanner an toàn và giải phóng tài nguyên WebRTC
  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isStartedRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        console.warn('Lỗi khi dừng scanner:', err)
      } finally {
        isStartedRef.current = false
        setIsScanning(false)
      }
    }
  }, [])

  // Bắt đầu Camera Scanner với cơ chế dò Camera sau (Environment) và Fallback thông minh
  const startScanner = useCallback(async () => {
    setCameraError(null)
    setErrorMessage(null)
    setIsDuplicate(false)
    isProcessingRef.current = false

    // 1. Kiểm tra môi trường HTTPS / WebRTC
    const contextCheck = checkSecureContext()
    if (!contextCheck.valid) {
      setCameraError(contextCheck)
      setIsScanning(false)
      return
    }

    // Đợi DOM mount container element
    setTimeout(async () => {
      try {
        const element = document.getElementById(containerId)
        if (!element) return

        // Dọn dẹp scanner cũ nếu còn treo
        if (scannerRef.current && isStartedRef.current) {
          await stopScanner()
        }

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(containerId, {
            verbose: false,
            // Kích hoạt Native BarcodeDetector API trên GPU/NPU của iOS 17+ và Android Chrome
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          })
        }

        // Cấu hình khung quét tối ưu cho góc máy chiếu
        const config = {
          fps: 15, // Cân bằng tốt giữa tốc độ nhận diện và hiệu năng pin mobile
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            // Lấy 72% chiều nhỏ nhất để quét được cả mã QR từ xa trên máy chiếu
            const edge = Math.max(Math.floor(minEdge * 0.72), 200)
            return { width: edge, height: edge }
          },
          aspectRatio: 1.0,
          disableFlip: false // Tự động căn chỉnh chiều camera sau
        }

        // 2. Tìm camera sau (Rear / Environment Camera) tối ưu trên mobile
        let cameraToUse = { facingMode: 'environment' }

        try {
          const devices = await Html5Qrcode.getCameras()
          if (devices && devices.length > 0) {
            // Ưu tiên camera có label rear/back/environment/sau
            const rearCamera = devices.find((d) =>
              /back|rear|environment|sau|facing\s*back|0/i.test(d.label)
            ) || devices[devices.length - 1] // Trên đa số điện thoại, camera sau nằm cuối danh sách

            if (rearCamera) {
              cameraToUse = rearCamera.id
              setActiveCameraLabel(rearCamera.label || 'Camera sau')
            }
          }
        } catch (deviceEnumErr) {
          console.warn('Không thể liệt kê danh sách camera, fallback sang facingMode: environment', deviceEnumErr)
        }

        // 3. Khởi động stream camera
        try {
          await scannerRef.current.start(
            cameraToUse,
            config,
            handleScanSuccess,
            () => {
              // Frame không có QR -> bỏ qua không throw
            }
          )
        } catch (startErr) {
          // Fallback nếu deviceId gặp lỗi OverconstrainedError
          console.warn('Thử lại với facingMode: environment cơ bản do lỗi:', startErr)
          await scannerRef.current.start(
            { facingMode: 'environment' },
            config,
            handleScanSuccess,
            () => {}
          )
        }

        isStartedRef.current = true
        setIsScanning(true)
      } catch (err) {
        console.error('Lỗi khởi động camera scanner:', err)
        handleCameraError(err)
        setIsScanning(false)
      }
    }, 150)
  }, [stopScanner])

  // Phân tích lỗi camera để đưa ra hướng dẫn trực quan thân thiện cho iOS và Android
  const handleCameraError = (err) => {
    const errorStr = (err?.name || err?.message || '').toString()
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    const isAndroid = /Android/.test(navigator.userAgent)

    if (errorStr.includes('NotAllowedError') || errorStr.includes('PermissionDeniedError')) {
      setCameraError({
        type: 'PERMISSION_DENIED',
        title: 'Quyền Truy Cập Camera Bị Chặn',
        message: 'Trình duyệt chưa được cấp quyền mở Camera để quét mã.',
        guide: isIOS
          ? [
              'Vào ứng dụng Cài đặt (Settings) trên iPhone/iPad',
              'Cuộn xuống chọn Safari (hoặc Chrome nếu đang dùng Chrome)',
              'Chọn mục Camera > Chuyển sang "Cho phép" (Allow) hoặc "Hỏi" (Ask)',
              'Quay lại trang này và nhấn nút "Thử lại Camera" bên dưới.'
            ]
          : isAndroid
          ? [
              'Chạm vào biểu tượng Ổ khóa / Cài đặt ở góc trái thanh địa chỉ URL',
              'Chọn mục Quyền (Permissions) > Máy ảnh (Camera)',
              'Chuyển trạng thái sang "Cho phép" (Allow)',
              'Tải lại trang web và tiếp tục.'
            ]
          : [
              'Vui lòng nhấn vào biểu tượng ổ khóa/camera trên thanh địa chỉ của trình duyệt',
              'Cấp quyền truy cập máy ảnh và nhấn Thử lại.'
            ]
      })
    } else if (errorStr.includes('NotFoundError') || errorStr.includes('DevicesNotFoundError')) {
      setCameraError({
        type: 'NOT_FOUND',
        title: 'Không Tìm Thấy Camera',
        message: 'Hệ thống không phát hiện thiết bị camera nào trên máy của bạn.'
      })
    } else if (errorStr.includes('NotReadableError') || errorStr.includes('TrackStartError')) {
      setCameraError({
        type: 'BUSY',
        title: 'Camera Đang Bị Ứng Dụng Khác Chiếm Dụng',
        message:
          'Camera đang được sử dụng bởi ứng dụng khác (Zalo, Facebook, Zoom, hoặc ứng dụng Chụp ảnh). Vui lòng đóng các ứng dụng đó và thử lại.'
      })
    } else {
      setCameraError({
        type: 'GENERIC',
        title: 'Không Thể Mở Camera',
        message:
          'Đã có sự cố khi kết nối tới cảm biến máy ảnh. Bạn có thể thử lại hoặc dùng tab "Nhập Mã Thủ Công".'
      })
    }
  }

  // Quản lý Lifecycle khi mở/đóng Modal hoặc đổi tab
  useEffect(() => {
    if (isOpen) {
      setCheckInResult(null)
      setErrorMessage(null)
      setIsDuplicate(false)
      setManualToken('')
      isProcessingRef.current = false

      if (activeTab === 'camera') {
        startScanner()
      }
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, activeTab, startScanner, stopScanner])

  // Xử lý khi quét thấy mã QR: Dừng quét ngay lập tức để chống request trùng lặp
  const handleScanSuccess = async (decodedText) => {
    if (isProcessingRef.current || submitting) return
    isProcessingRef.current = true

    console.log('Quét thành công QR token:', decodedText)

    // Tạm dừng scanner ngay để tránh frame kế tiếp quét trùng
    try {
      if (scannerRef.current && isStartedRef.current) {
        await scannerRef.current.pause(true)
      }
    } catch (e) {
      console.warn('Lỗi khi pause scanner, dừng hẳn scanner:', e)
      await stopScanner()
    }

    await submitAttendance(decodedText)
  }

  // Gửi API điểm danh lên Backend
  const submitAttendance = async (token) => {
    if (!token || !token.trim()) {
      setErrorMessage('Mã điểm danh không hợp lệ.')
      isProcessingRef.current = false
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setIsDuplicate(false)

    try {
      const res = await api.post('/attendance/check-in', {
        qrToken: token.trim(),
        deviceInfo: navigator.userAgent
      })

      if (res.data?.data) {
        setCheckInResult(res.data.data)
        await stopScanner()
        if (onSuccess) {
          onSuccess(res.data.data)
        }
      }
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || 'Điểm danh không thành công.'

      // Bắt trường hợp đã điểm danh trước đó (HTTP 409 hoặc thông báo ĐÃ ĐIỂM DANH TRƯỚC ĐÓ)
      if (status === 409 || msg.includes('ĐÃ ĐIỂM DANH TRƯỚC ĐÓ') || msg.includes('đã điểm danh thành công')) {
        setIsDuplicate(true)
        setErrorMessage(msg)
        await stopScanner()
      } else {
        setErrorMessage(msg)
      }
    } finally {
      setSubmitting(false)
      isProcessingRef.current = false
    }
  }

  // Xử lý submit form mã thủ công
  const handleManualSubmit = (e) => {
    e.preventDefault()
    submitAttendance(manualToken)
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  // Quét lại mã mới (dành cho trường hợp token hết hạn hoặc lỗi góc máy)
  const handleRetryCamera = async () => {
    setCheckInResult(null)
    setErrorMessage(null)
    setIsDuplicate(false)
    isProcessingRef.current = false

    if (scannerRef.current && isStartedRef.current) {
      try {
        await scannerRef.current.resume()
        return
      } catch (resumeErr) {
        console.warn('Resume không thành công, khởi động lại scanner:', resumeErr)
      }
    }

    await stopScanner()
    startScanner()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Quét Mã QR Điểm Danh</h3>
              <p className="text-[11px] text-slate-500 font-medium">TOTP Bảo Mật • Xoay 15 Giây/Lần</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch (Chỉ hiển thị khi chưa có kết quả thành công) */}
        {!checkInResult && !isDuplicate && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
            <button
              onClick={() => {
                setActiveTab('camera')
                setErrorMessage(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Camera size={14} />
              Quét Camera Mobile
            </button>
            <button
              onClick={() => {
                stopScanner()
                setActiveTab('manual')
                setErrorMessage(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'manual'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Keyboard size={14} />
              Nhập Mã Thủ Công
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="p-4 overflow-y-auto">
          {/* TRƯỜNG HỢP 1: ĐIỂM DANH THÀNH CÔNG */}
          {checkInResult ? (
            <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={38} className="stroke-[2.2]" />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full mb-1">
                  ĐÃ XÁC NHẬN CÓ MẶT
                </span>
                <h4 className="text-base font-extrabold text-slate-800">Điểm Danh Thành Công!</h4>
                <p className="text-xs text-slate-600 mt-1 font-semibold">
                  {checkInResult.courseName} <span className="font-mono text-emerald-700">({checkInResult.sectionCode})</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinh viên: <span className="font-bold text-slate-700">{checkInResult.studentName}</span> ({checkInResult.studentCode})
                </p>
                <div className="mt-3 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/60 py-2 px-3.5 rounded-xl inline-block shadow-xs">
                  {checkInResult.message}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition active:scale-[0.99]"
              >
                Hoàn tất & Đóng
              </button>
            </div>
          ) : isDuplicate ? (
            /* TRƯỜNG HỢP 2: ĐÃ ĐIỂM DANH TRƯỚC ĐÓ (Deduplicated) */
            <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Check size={38} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="inline-block px-3 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full mb-1">
                  ĐÃ ĐIỂM DANH TRƯỚC ĐÓ
                </span>
                <h4 className="text-base font-extrabold text-slate-800">Bạn Đã Điểm Danh Phiên Này!</h4>
                <p className="text-xs text-slate-600 mt-1.5 px-4 font-medium">
                  {errorMessage || 'Hệ thống đã ghi nhận sự có mặt của bạn trước đó. Không cần quét lại.'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full mt-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-sm transition active:scale-[0.99]"
              >
                Đã hiểu, đóng cửa sổ
              </button>
            </div>
          ) : activeTab === 'camera' ? (
            /* TRƯỜNG HỢP 3: TAB CAMERA QUÉT */
            <div className="space-y-3">
              {/* Thông báo lỗi Camera hoặc Quyền truy cập */}
              {cameraError ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-900">{cameraError.title}</h5>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{cameraError.message}</p>
                    </div>
                  </div>

                  {/* Hướng dẫn chi tiết theo từng loại thiết bị */}
                  {cameraError.guide && (
                    <div className="p-3 bg-white/80 rounded-xl border border-amber-100 text-[11px] text-slate-700 space-y-1.5">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Smartphone size={13} className="text-amber-600" /> Hướng dẫn cấp quyền máy ảnh:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                        {cameraError.guide.map((step, idx) => (
                          <li key={idx} className="leading-tight">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={handleRetryCamera}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs transition"
                    >
                      <RefreshCw size={12} /> Thử lại Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
                    >
                      Nhập mã tay
                    </button>
                  </div>
                </div>
              ) : (
                /* Khung hình Viewport Quét Camera */
                <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[300px] border border-slate-800 shadow-inner">
                  {/* Div viewport cho Html5Qrcode */}
                  <div id={containerId} className="w-full h-full min-h-[300px] max-h-[340px] overflow-hidden" />

                  {/* Overlay đường ngắm quét mã kiểu HUD */}
                  {isScanning && !submitting && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative w-52 h-52 border-2 border-emerald-400/50 rounded-2xl">
                        {/* 4 góc ngắm */}
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        {/* Tia laser quét animation */}
                        <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2.5s_infinite]" />
                      </div>
                    </div>
                  )}

                  {/* Trạng thái đang xác thực */}
                  {submitting && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2.5 z-20">
                      <Loader2 size={36} className="animate-spin text-emerald-400" />
                      <p className="text-xs font-bold tracking-wide">Đang xác thực mã QR & thời gian TOTP...</p>
                    </div>
                  )}

                  {/* Trạng thái đang khởi động camera */}
                  {!isScanning && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2">
                      <Loader2 size={26} className="animate-spin text-emerald-400" />
                      <p className="text-xs font-medium">Đang kết nối camera sau...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Thông tin hỗ trợ */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>💡 Căn chỉnh mã QR trên máy chiếu vào giữa khung quét</span>
                {activeCameraLabel && (
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                    {activeCameraLabel}
                  </span>
                )}
              </div>

              {/* Thông báo lỗi khi điểm danh thất bại */}
              {errorMessage && !isDuplicate && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="leading-tight">{errorMessage}</p>
                    <button
                      onClick={handleRetryCamera}
                      className="text-emerald-700 hover:text-emerald-800 underline font-bold mt-1.5 inline-flex items-center gap-1 transition"
                    >
                      <RefreshCw size={11} /> Quét lại mã mới
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TRƯỜNG HỢP 4: TAB NHẬP MÃ THỦ CÔNG */
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Token Điểm Danh (TOTP):
                </label>
                <textarea
                  rows={3}
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Dán mã token QR hiển thị trên màn chiếu (VD: 1.12.119284712.ab3f890...)"
                  className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mã thay đổi xoay vòng 15 giây/lần. Hệ thống cho phép dung sai bù trừ trễ mạng.
                </p>
              </div>

              {errorMessage && !isDuplicate && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
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
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
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
