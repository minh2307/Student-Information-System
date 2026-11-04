import React, { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Keyboard,
  Loader2,
  SwitchCamera,
  Zap,
  ZapOff,
  ShieldAlert,
  ExternalLink
} from 'lucide-react'
import api from '../services/api'
import { toast } from '../store/toastStore'

export default function StudentQrScannerModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('camera') // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkInResult, setCheckInResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Quản lý danh sách camera & Flash trên mobile
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState(null)
  const [torchOn, setTorchOn] = useState(false)
  const [supportsTorch, setSupportsTorch] = useState(false)

  const scannerRef = useRef(null)
  const isStartedRef = useRef(false)
  const videoCheckIntervalRef = useRef(null)

  // Kiểm tra Secure Context (HTTPS) cần thiết cho Camera trên Mobile
  const isSecureContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')

  const handleSwitchToHttps = () => {
    if (typeof window !== 'undefined') {
      window.location.href = window.location.href.replace(/^http:/, 'https:')
    }
  }

  // Dừng Camera Scanner an toàn & giải phóng phần cứng camera mobile
  const stopScanner = async () => {
    if (videoCheckIntervalRef.current) {
      clearInterval(videoCheckIntervalRef.current)
      videoCheckIntervalRef.current = null
    }

    if (scannerRef.current) {
      try {
        if (isStartedRef.current) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        console.warn('Lỗi khi dừng camera scanner:', err)
      } finally {
        isStartedRef.current = false
        setIsScanning(false)
        setTorchOn(false)
        setSupportsTorch(false)
      }
    }
  }

  // Bắt đầu Camera Scanner với tối ưu hóa Safari iOS & Chrome Android
  const startScanner = async (preferredCameraId = null) => {
    setCameraError(null)
    setErrorMessage(null)
    setIsScanning(false)

    // Đảm bảo dừng phiên scan cũ trước khi khởi tạo phiên mới
    await stopScanner()

    // 1. Kiểm tra HTTPS trên Mobile
    if (!isSecureContext) {
      setCameraError(
        'Trình duyệt mobile yêu cầu kết nối HTTPS bảo mật để cấp quyền truy cập Camera. Vui lòng chuyển sang kết nối HTTPS hoặc sử dụng tab Nhập Mã Thủ Công.'
      )
      return
    }

    // 2. Kiểm tra hỗ trợ WebRTC/MediaDevices
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Trình duyệt này không hỗ trợ API Camera HTML5. Vui lòng cập nhật Safari/Chrome lên phiên bản mới nhất hoặc sử dụng tab Nhập Mã Thủ Công.'
      )
      return
    }

    // Đợi DOM render element qr-video-region
    setTimeout(async () => {
      try {
        const element = document.getElementById('qr-video-region')
        if (!element) return

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-video-region')
        }

        // Lấy danh sách camera trên thiết bị
        let cameraList = []
        try {
          cameraList = await Html5Qrcode.getCameras()
          if (Array.isArray(cameraList) && cameraList.length > 0) {
            setCameras(cameraList)
          }
        } catch (e) {
          console.warn('Không thể liệt kê danh sách camera:', e)
        }

        // Xác định camera phù hợp (Ưu tiên camera sau / rear / environment)
        let cameraConfig = { facingMode: 'environment' }

        if (preferredCameraId) {
          cameraConfig = { deviceId: { exact: preferredCameraId } }
        } else if (cameraList.length > 0) {
          const rearCam = cameraList.find((c) =>
            /back|rear|sau|environment|cam.*0/i.test(c.label)
          ) || cameraList[cameraList.length - 1] // Trên nhiều máy Android/iOS, camera sau nằm ở cuối danh sách

          if (rearCam?.id) {
            cameraConfig = { deviceId: { exact: rearCam.id } }
            setSelectedCameraId(rearCam.id)
          }
        }

        // Cấu hình quét tối ưu cho Mobile Safari iOS & Chrome Android
        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const boxSize = Math.floor(minEdge * 0.72)
            return {
              width: Math.max(160, Math.min(boxSize, 280)),
              height: Math.max(160, Math.min(boxSize, 280))
            }
          },
          aspectRatio: undefined, // Cho phép tỷ lệ khung hình tự nhiên của cảm biến camera
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        }

        // Khởi động Html5Qrcode
        try {
          await scannerRef.current.start(
            cameraConfig,
            config,
            onScanSuccess,
            () => {} // Bỏ qua frame không có QR để tăng hiệu năng mobile
          )
        } catch (initialErr) {
          console.warn('Lỗi khởi động với cameraConfig chỉ định, thử fallback sang facingMode environment/user:', initialErr)
          // Fallback 1: facingMode environment
          try {
            await scannerRef.current.start(
              { facingMode: 'environment' },
              config,
              onScanSuccess,
              () => {}
            )
          } catch (fallbackErr) {
            // Fallback 2: mở bất kỳ camera nào có sẵn
            console.warn('Thử fallback sang camera mặc định:', fallbackErr)
            await scannerRef.current.start(
              { facingMode: 'user' },
              config,
              onScanSuccess,
              () => {}
            )
          }
        }

        isStartedRef.current = true
        setIsScanning(true)

        // =========================================================================
        // FIX MÀN HÌNH ĐEN TRÊN SAFARI iOS & CHROME ANDROID:
        // Cưỡng chế các thuộc tính playsinline, webkit-playsinline, autoplay, muted
        // và kiểm tra trạng thái video.play() để đảm bảo khung hình render thật
        // =========================================================================
        const fixVideoElement = () => {
          const video = document.querySelector('#qr-video-region video')
          if (video) {
            video.setAttribute('playsinline', 'true')
            video.setAttribute('webkit-playsinline', 'true')
            video.setAttribute('muted', 'true')
            video.muted = true
            video.autoplay = true
            video.style.width = '100%'
            video.style.height = '100%'
            video.style.objectFit = 'cover'
            video.style.borderRadius = '0.75rem'

            if (video.paused) {
              video.play().catch((playErr) => {
                console.warn('Lỗi gọi video.play() trên mobile:', playErr)
              })
            }
          }
        }

        fixVideoElement()
        // Kiểm tra lại sau 300ms và 800ms để bắt kịp Safari iOS rendering cycle
        setTimeout(fixVideoElement, 300)
        setTimeout(fixVideoElement, 800)

        // Kiểm tra hỗ trợ Flash/Torch
        try {
          const track = scannerRef.current.getVideoTrack()
          const capabilities = track ? track.getCapabilities() : {}
          if (capabilities.torch) {
            setSupportsTorch(true)
          }
        } catch (e) {
          // torch not supported on this browser/lens
        }

      } catch (err) {
        console.error('Lỗi khởi động camera scanner:', err)
        let friendlyMsg = 'Không thể mở camera. Vui lòng cấp quyền Camera trong cài đặt trình duyệt hoặc chuyển sang tab Nhập mã thủ công.'
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          friendlyMsg = 'Quyền Camera bị từ chối. Vui lòng nhấn vào biểu tượng ổ khóa trên thanh địa chỉ trình duyệt để cấp quyền Camera.'
        } else if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
          friendlyMsg = 'Không tìm thấy thiết bị camera trên máy. Vui lòng sử dụng tab Nhập Mã Thủ Công.'
        }
        setCameraError(friendlyMsg)
        setIsScanning(false)
      }
    }, 150)
  }

  // Đổi camera (nếu thiết bị có nhiều camera)
  const handleToggleCamera = async () => {
    if (cameras.length <= 1) return
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCamera = cameras[nextIndex]
    setSelectedCameraId(nextCamera.id)
    await startScanner(nextCamera.id)
  }

  // Bật/Tắt Flash (Torch)
  const handleToggleTorch = async () => {
    if (!supportsTorch || !scannerRef.current) return
    try {
      const track = scannerRef.current.getVideoTrack()
      if (track) {
        const nextState = !torchOn
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        })
        setTorchOn(nextState)
      }
    } catch (e) {
      console.warn('Lỗi bật/tắt đèn Flash:', e)
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

  // Gửi API điểm danh kèm deviceInfo & clientTimestampMs để xử lý đồng bộ Clock Mobile
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
        deviceInfo: navigator.userAgent,
        clientTimestampMs: Date.now() // Hỗ trợ BE tính toán & xử lý độ trôi đồng hồ mobile
      })

      if (res.data?.data) {
        const result = res.data.data
        setCheckInResult(result)

        // Haptic feedback cho trải nghiệm mobile chân thực
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }

        // Bắn Toast xanh thành công hiển thị ngay lập tức trên mobile sinh viên
        toast.success(
          `Điểm danh thành công môn ${result.courseName || ''} (${result.sectionCode || ''})!`,
          'Điểm Danh Thành Công'
        )

        if (onSuccess) {
          onSuccess(result)
        }
      }
    } catch (err) {
      const status = err.response?.status
      const msg =
        err.response?.data?.message ||
        'Điểm danh không thành công. Mã QR có thể đã hết hạn hoặc phiên học đã đóng.'
      setErrorMessage(msg)

      // Nếu đã điểm danh trước đó (HTTP 409 Conflict)
      if (status === 409) {
        toast.warning(msg, 'Đã Điểm Danh')
      }
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
    startScanner(selectedCameraId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      {/* CSS chống màn hình đen & định dạng video stream trên iOS Safari & Android */}
      <style>{`
        #qr-video-region {
          width: 100% !important;
          min-height: 280px !important;
          max-height: 340px !important;
          position: relative !important;
          background: #000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
          border-radius: 0.75rem !important;
        }
        #qr-video-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0.75rem !important;
          display: block !important;
        }
        #qr-video-region canvas.html5-qrcode-element {
          display: none !important;
        }
      `}</style>

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

        {/* Cảnh báo nếu thiết bị đang dùng HTTP (không phải HTTPS) */}
        {!isSecureContext && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>Camera yêu cầu kết nối <strong>HTTPS</strong> trên di động.</span>
            </div>
            <button
              onClick={handleSwitchToHttps}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 ml-2"
            >
              Chuyển HTTPS <ExternalLink size={10} />
            </button>
          </div>
        )}

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

                  {/* Khung ngắm ảo & tia quét laser realtime */}
                  {isScanning && !submitting && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        {/* Tia quét laser chuyển động */}
                        <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  )}

                  {/* Thanh công cụ nổi trên camera (Đổi camera & Bật đèn Flash) */}
                  {isScanning && !submitting && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      {supportsTorch && (
                        <button
                          onClick={handleToggleTorch}
                          className={`p-2 rounded-full backdrop-blur-md transition ${
                            torchOn
                              ? 'bg-amber-400 text-slate-900 shadow-lg'
                              : 'bg-black/40 text-white hover:bg-black/60'
                          }`}
                          title="Bật/Tắt Flash"
                        >
                          {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                        </button>
                      )}
                      {cameras.length > 1 && (
                        <button
                          onClick={handleToggleCamera}
                          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition"
                          title="Đổi camera trước/sau"
                        >
                          <SwitchCamera size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Overlay trạng thái đang gửi API xác thực */}
                  {submitting && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20">
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                      <p className="text-xs font-semibold">Đang xác thực điểm danh...</p>
                    </div>
                  )}

                  {/* Overlay đang mở máy ảnh */}
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
                  Mã xoay vòng 15 giây/lần (dung sai 30 giây). Vui lòng gửi ngay khi lấy mã trên màn hình.
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
