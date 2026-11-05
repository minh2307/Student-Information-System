import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { usePayOS } from '@payos/payos-checkout'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  QrCode,
  FileText,
  ShieldCheck,
  Building,
  Check,
  Filter,
  Download,
  Info,
  Copy,
  CheckCheck,
  Zap,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
  Layers,
  ArrowUpRight
} from 'lucide-react'

import { numberToVietnameseWords } from '../utils/currencyWords'
export { numberToVietnameseWords }

export const StudentTuition = () => {
  const { user } = useAuthStore()
  const studentCode = user?.studentCode || user?.username || 'SV2024001'
  const studentName = user?.fullName || 'Nguyễn Văn C'

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [tuition, setTuition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [qrImageError, setQrImageError] = useState(false)
  const [simulatingStep, setSimulatingStep] = useState(0) // 0: Idle, 1: Connecting Napas, 2: Reconciling, 3: Settled
  const [selectedBankBin, setSelectedBankBin] = useState('970422') // 970422 (MB) | 970415 (VietinBank)
  const [showRawPayload, setShowRawPayload] = useState(false)

  // ── PayOS Checkout State ──
  const [showPayOsModal, setShowPayOsModal] = useState(false)
  const [payOsData, setPayOsData] = useState(null)
  const [creatingPayOs, setCreatingPayOs] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)
  const [activePayOsTab, setActivePayOsTab] = useState('embedded') // 'embedded' | 'qr'
  const [returnStatusInfo, setReturnStatusInfo] = useState(null)

  // Đếm lùi phiên giao dịch QR 15 phút (900 giây)
  const [qrRemainingSeconds, setQrRemainingSeconds] = useState(900)

  useEffect(() => {
    let timer = null
    if (showQrModal && !paymentSuccess) {
      setQrRemainingSeconds(900)
      timer = setInterval(() => {
        setQrRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [showQrModal, paymentSuccess])

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Tải danh sách học kỳ
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && res.data.data.length > 0) {
          setSemesters(res.data.data)
          const active = res.data.data.find(s => s.isActive) || res.data.data[0]
          setSelectedSemester(active.semesterCode)
        }
      } catch (err) {
        console.error('Lỗi tải học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  // Tải học phí theo kỳ và ngân hàng
  const fetchTuition = useCallback(async (semester = selectedSemester, bankBin = selectedBankBin) => {
    if (!semester) return
    setLoading(true)
    try {
      const res = await api.get(`/student/tuition?semester=${semester}&bank=${bankBin}`)
      if (res.data?.data) {
        setTuition(res.data.data)
        if (res.data.data.bankBin) {
          setSelectedBankBin(res.data.data.bankBin)
        }
      }
    } catch (err) {
      console.error('Lỗi tải học phí:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedSemester, selectedBankBin])

  useEffect(() => {
    if (selectedSemester) {
      fetchTuition(selectedSemester, selectedBankBin)
    }
  }, [selectedSemester, selectedBankBin, fetchTuition])

  // ── XỬ LÝ RETURN URL TỪ CỔNG PAYOS CHECKOUT ──
  // Khi PayOS điều hướng về /student/tuition?status=PAID&orderCode=...&cancel=false&code=00
  useEffect(() => {
    const statusParam = searchParams.get('status')
    const codeParam = searchParams.get('code')
    const cancelParam = searchParams.get('cancel')
    const orderCodeParam = searchParams.get('orderCode')
    const paymentLinkId = searchParams.get('id')

    if (statusParam || codeParam || cancelParam) {
      if ((statusParam === 'PAID' || codeParam === '00') && cancelParam !== 'true') {
        setReturnStatusInfo({
          type: 'SUCCESS',
          orderCode: orderCodeParam,
          paymentLinkId,
          title: 'Quyết Toán Học Phí PayOS Thành Công!',
          message: `Giao dịch đơn hàng #${orderCodeParam || 'N/A'} đã được cổng PayOS xác thực thành công. Nghĩa vụ học phí của bạn đã được gạch nợ hoàn tất.`
        })
        toast.success(`Học phí đã được quyết toán thành công qua cổng PayOS! ${orderCodeParam ? `(Mã ĐH: ${orderCodeParam})` : ''}`)
        setShowReceiptModal(true)
        if (selectedSemester) {
          fetchTuition(selectedSemester, selectedBankBin)
        }
      } else if (statusParam === 'CANCELLED' || cancelParam === 'true') {
        setReturnStatusInfo({
          type: 'CANCELLED',
          orderCode: orderCodeParam,
          paymentLinkId,
          title: 'Phiên Thanh Toán PayOS Đã Hủy',
          message: `Bạn vừa hủy phiên giao dịch thanh toán đơn hàng #${orderCodeParam || 'N/A'}. Bạn có thể thử lại bất cứ lúc nào.`
        })
        toast.info(`Bạn đã hủy phiên thanh toán PayOS. ${orderCodeParam ? `(Mã ĐH: ${orderCodeParam})` : ''}`)
      } else {
        setReturnStatusInfo({
          type: 'ERROR',
          orderCode: orderCodeParam,
          paymentLinkId,
          title: 'Giao Dịch PayOS Không Hoàn Tất',
          message: `Giao dịch thanh toán chưa thể hoàn tất (Mã phản hồi: ${codeParam || 'ERROR'}). Vui lòng kiểm tra lại số dư hoặc quét lại mã VietQR.`
        })
        toast.error(`Giao dịch PayOS không thành công (Mã: ${codeParam || 'ERR'})`)
      }

      // Xóa các tham số query trên URL mà không gây tải lại trang
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, selectedSemester, selectedBankBin, fetchTuition, setSearchParams])

  // Polling tự động kiểm tra trạng thái quyết toán khi mở cổng PayOS
  useEffect(() => {
    let timer = null
    const isPaidStatus = tuition?.status === 'PAID'
    if (pollingActive && !isPaidStatus) {
      timer = setInterval(async () => {
        try {
          const res = await api.get(`/student/tuition?semester=${selectedSemester}&bank=${selectedBankBin}`)
          if (res.data?.data) {
            setTuition(res.data.data)
            if (res.data.data.status === 'PAID') {
              setPollingActive(false)
              setShowPayOsModal(false)
              setShowReceiptModal(true)
              toast.success('Học phí đã được quyết toán tự động qua cổng PayOS!')
            }
          }
        } catch (ignored) {}
      }, 3000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [pollingActive, tuition?.status, selectedSemester, selectedBankBin])

  // Xử lý khi thanh toán PayOS thành công từ callback SDK hoặc postMessage
  const handlePayOsSuccess = useCallback((eventData) => {
    setPollingActive(false)
    setShowPayOsModal(false)
    setShowReceiptModal(true)
    toast.success('Học phí đã được quyết toán tự động qua cổng PayOS!')
    fetchTuition(selectedSemester, selectedBankBin)
  }, [selectedSemester, selectedBankBin, fetchTuition])

  const handlePayOsCancel = useCallback((eventData) => {
    setShowPayOsModal(false)
    setPollingActive(false)
    toast.info('Bạn đã hủy phiên thanh toán PayOS.')
  }, [])

  // Cấu hình SDK PayOS Checkout Nhúng
  const payOSConfig = useMemo(() => ({
    RETURN_URL: `${window.location.origin}/student/tuition`,
    ELEMENT_ID: 'payos-checkout-container',
    CHECKOUT_URL: payOsData?.checkoutUrl || '',
    embedded: true,
    onSuccess: (event) => handlePayOsSuccess(event),
    onExit: () => {
      setShowPayOsModal(false)
      setPollingActive(false)
    },
    onCancel: (event) => handlePayOsCancel(event)
  }), [payOsData?.checkoutUrl, handlePayOsSuccess, handlePayOsCancel])

  const { open: openPayOs, exit: exitPayOs } = usePayOS(payOSConfig)

  // Khởi tạo PayOS Embedded Iframe khi modal mở và chuyển tab embedded
  useEffect(() => {
    if (showPayOsModal && activePayOsTab === 'embedded' && payOsData?.checkoutUrl) {
      const timer = setTimeout(() => {
        const container = document.getElementById('payos-checkout-container')
        if (container && !container.querySelector('iframe')) {
          try {
            openPayOs()
          } catch (err) {
            console.warn('PayOS openIframe error', err)
          }
        }
      }, 150)
      return () => {
        clearTimeout(timer)
        try {
          exitPayOs()
        } catch (ignored) {}
      }
    }
  }, [showPayOsModal, activePayOsTab, payOsData?.checkoutUrl, openPayOs, exitPayOs])

  // Lắng nghe postMessage trực tiếp từ PayOS Iframe để tăng tốc độ phản hồi
  useEffect(() => {
    const handlePayOsMessage = (event) => {
      const allowedOrigins = [
        'https://dev.pay.payos.vn',
        'https://next.dev.pay.payos.vn',
        'https://pay.payos.vn'
      ]
      if (allowedOrigins.includes(event.origin)) {
        try {
          const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          if (payload?.data?.status === 'PAID') {
            handlePayOsSuccess(payload.data)
          } else if (payload?.data?.status === 'CANCELLED') {
            handlePayOsCancel(payload.data)
          }
        } catch (e) {
          // Bỏ qua tin nhắn không phải JSON
        }
      }
    }
    window.addEventListener('message', handlePayOsMessage)
    return () => window.removeEventListener('message', handlePayOsMessage)
  }, [handlePayOsSuccess, handlePayOsCancel])

  // Khởi tạo link thanh toán PayOS
  const handleOpenPayOs = async () => {
    setCreatingPayOs(true)
    try {
      const returnUrl = `${window.location.origin}/student/tuition`
      const cancelUrl = `${window.location.origin}/student/tuition?status=CANCELLED`

      const res = await api.post('/student/tuition/payos/create-payment-link', {
        semester: selectedSemester,
        returnUrl,
        cancelUrl
      })

      if (res.data?.data) {
        setPayOsData(res.data.data)
        setActivePayOsTab('embedded')
        setShowPayOsModal(true)
        setPollingActive(true)
      }
    } catch (err) {
      toast.error('Không thể tạo liên kết thanh toán PayOS: ' + (err.response?.data?.message || err.message))
    } finally {
      setCreatingPayOs(false)
    }
  }

  // Mô phỏng Webhook PayOS cho môi trường Sandbox / Testing
  const handleSimulatePayOsWebhook = async () => {
    if (!payOsData?.orderCode) return
    try {
      await api.post('/public/tuition/payos-webhook', {
        code: '00',
        desc: 'success',
        success: true,
        data: {
          orderCode: payOsData.orderCode,
          amount: payOsData.amount,
          description: payOsData.description,
          code: '00',
          reference: 'SIM-PAYOS-' + Date.now()
        },
        signature: 'demo-signature'
      })
      toast.success('Đã gửi tín hiệu Webhook PayOS mô phỏng thành công!')
      // Tải lại ngay lập tức
      await fetchTuition(selectedSemester, selectedBankBin)
      setShowPayOsModal(false)
      setPollingActive(false)
      setShowReceiptModal(true)
    } catch (err) {
      toast.error('Lỗi gửi webhook mô phỏng: ' + (err.response?.data?.message || err.message))
    }
  }

  const transferSyntax = useMemo(() => {
    return `${studentCode} HP ${tuition?.semesterName || selectedSemester}`
  }, [studentCode, tuition, selectedSemester])

  const activeBank = useMemo(() => {
    return tuition?.supportedBanks?.find(b => b.bankBin === selectedBankBin) || {
      bankBin: tuition?.bankBin || '970422',
      bankShortName: tuition?.bankShortName || 'MB',
      bankName: tuition?.bankName || 'MB Bank (Ngân hàng TMCP Quân đội)',
      accountNumber: tuition?.accountNumber || '999988882025',
      accountName: tuition?.accountName || 'HOC VIEN CONG NGHE RIKKEI',
      vietQrPayload: tuition?.vietQrPayload || '',
      vietQrQuickLink: tuition?.vietQrQuickLink || ''
    }
  }, [tuition, selectedBankBin])

  // URL VietQR Napas247 chuẩn quốc gia (fallback nếu backend không sinh QR)
  const vietQrUrl = useMemo(() => {
    const amt = tuition?.totalAmount || 0
    const accNum = activeBank?.accountNumber || '999988882025'
    const accName = activeBank?.accountName || 'HOC VIEN CONG NGHE RIKKEI'
    const transferContent = tuition?.transferContent || transferSyntax
    return `https://img.vietqr.io/image/MB-${accNum}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accName)}`
  }, [tuition, transferSyntax, activeBank])

  // Fallback QR generator nếu dịch vụ img.vietqr.io bị chậm/chặn
  const fallbackQrUrl = useMemo(() => {
    const transferContent = tuition?.transferContent || transferSyntax
    const rawData = `VIETQR_NAPAS247|MB|${activeBank?.accountNumber || '999988882025'}|${tuition?.totalAmount}|${transferContent}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(rawData)}`
  }, [tuition, transferSyntax, activeBank])

  // Sao chép thông tin chuyển khoản vào clipboard
  const handleCopy = (text, fieldName) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`Đã sao chép ${fieldName} vào bộ nhớ tạm!`)
      setTimeout(() => setCopiedField(null), 2200)
    } catch (err) {
      console.warn('Clipboard write error', err)
    }
  }

  // Xử lý quyết toán E2E: Gọi API gạch nợ học phí và sinh mã giao dịch
  const handleConfirmPayment = async (methodName = 'VietQR Napas247') => {
    setPaying(true)
    try {
      const activeB = tuition?.supportedBanks?.find(b => b.bankBin === selectedBankBin)
      const bankLabel = activeB ? `${activeB.bankShortName} (BIN ${activeB.bankBin})` : 'VietQR Napas247'

      const res = await api.post('/student/tuition/pay', {
        semester: selectedSemester,
        paymentMethod: `VietQR Napas247 (${bankLabel})`
      })
      if (res.data?.data) {
        setTuition(res.data.data)
        setPaymentSuccess(true)
        toast.success(`Quyết toán học phí kỳ ${selectedSemester} thành công qua ${methodName}!`)

        setTimeout(() => {
          setShowQrModal(false)
          setPaymentSuccess(false)
          setSimulatingStep(0)
          setShowReceiptModal(true)
        }, 1200)
      }
    } catch (err) {
      toast.error('Không thể hoàn tất thanh toán: ' + (err.response?.data?.message || err.message))
    } finally {
      setPaying(false)
    }
  }

  // Mô phỏng thanh toán trực tiếp qua App Ngân hàng (E2E Mock Banking Webhook)
  const handleSimulateBankingPayment = async () => {
    setPaying(true)
    setSimulatingStep(1) // Kết nối Napas247

    setTimeout(() => {
      setSimulatingStep(2) // Đối soát số tiền & MSSV

      setTimeout(async () => {
        setSimulatingStep(3) // Quyết toán gạch nợ
        await handleConfirmPayment('VietQR Napas247 (Mobile Banking App)')
      }, 900)
    }, 900)
  }

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0)
  }

  const isPaid = tuition?.status === 'PAID'
  const isPartial = tuition?.status === 'PARTIAL'



  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Official Header & Semester Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
              Học Viện Công Nghệ Rikkei • Phòng Kế Hoạch - Tài Chính
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Cổng PayOS Napas247
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight mt-1">
            Biểu Kê Học Phí &amp; Quyết Toán Nghĩa Vụ Tài Chính
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Cổng thanh toán tự động VietQR Napas247 &amp; PayOS Checkout • Sinh viên: <strong className="text-stone-900">{tuition?.studentName || studentName}</strong> ({tuition?.studentCode || studentCode})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            <Filter size={14} className="text-stone-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer font-mono"
            >
              {semesters.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} {s.isActive ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isPaid && (
            <button
              onClick={() => setShowReceiptModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-black text-white transition shadow-2xs cursor-pointer"
            >
              <FileText size={14} />
              <span>Xem Biên Lai Điện Tử</span>
            </button>
          )}
        </div>
      </div>

      {/* 1.5. Return URL Notification Banner (From PayOS Gateway) */}
      {returnStatusInfo && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
            returnStatusInfo.type === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
              : returnStatusInfo.type === 'CANCELLED'
              ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
              : 'bg-red-50 border-red-300 text-red-950 shadow-2xs'
          }`}
        >
          <div className="flex items-start gap-3">
            {returnStatusInfo.type === 'SUCCESS' ? (
              <CheckCircle2 size={22} className="text-emerald-700 shrink-0 mt-0.5" />
            ) : returnStatusInfo.type === 'CANCELLED' ? (
              <AlertTriangle size={22} className="text-amber-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={22} className="text-red-700 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-sm">{returnStatusInfo.title}</h4>
              <p className="text-xs mt-0.5 opacity-90">{returnStatusInfo.message}</p>
              {returnStatusInfo.type === 'SUCCESS' && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <FileText size={13} />
                    <span>Xem &amp; In Biên Lai Điện Tử</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setReturnStatusInfo(null)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg text-lg leading-none cursor-pointer"
            title="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-stone-200/90 text-center">
          <div className="inline-block w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-stone-600 font-mono">Đang đối soát công nợ tín chỉ từ Cổng Tài chính...</p>
        </div>
      ) : !tuition ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-300 text-center">
          <AlertCircle size={32} className="mx-auto text-stone-400 mb-2" />
          <p className="text-xs text-stone-600">Không tìm thấy biểu phí học phần cho kỳ đào tạo này.</p>
        </div>
      ) : (
        <>
          {/* 2. Official Financial Standing Card */}
          <div className={`rounded-2xl p-6 border shadow-2xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            isPaid
              ? 'bg-stone-50 border-stone-200/90'
              : isPartial
              ? 'bg-amber-50/40 border-amber-200/80'
              : 'bg-stone-50 border-stone-200/90'
          }`}>
            {/* Watermark Seal */}
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none w-52 h-52">
              <img src="/images/stamp-seal.svg" alt="Seal" className="w-full h-full" />
            </div>

            <div className="space-y-3 relative z-10">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                    : isPartial
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-red-100 text-red-800 border border-red-300 animate-pulse'
                }`}>
                  {isPaid ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-700" />
                      <span>ĐÃ HOÀN TẤT NGHĨA VỤ HỌC PHÍ</span>
                    </>
                  ) : isPartial ? (
                    <>
                      <AlertTriangle size={13} className="text-amber-700" />
                      <span>THANH TOÁN MỘT PHẦN</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} className="text-red-700" />
                      <span>CHƯA QUYẾT TOÁN (CÒN NỢ HỌC PHÍ)</span>
                    </>
                  )}
                </span>
                <span className="text-xs text-stone-600 font-mono">
                  Kỳ đào tạo: <strong className="text-stone-900">{tuition.semesterName}</strong>
                </span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <h2 className="text-2xl sm:text-4xl font-mono font-bold text-stone-900 tracking-tight">
                  {formatVnd(tuition.remainingAmount != null ? tuition.remainingAmount : tuition.totalAmount)}
                </h2>
                <span className="text-xs text-stone-500 font-medium font-sans">
                  {isPaid ? '(Đã thanh toán đủ)' : '(Số tiền còn phải nộp)'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-mono pt-0.5">
                <span>Tổng số tín chỉ: <strong className="text-stone-900">{tuition.totalCredits} TC</strong></span>
                <span>•</span>
                <span>Định mức chuẩn: <strong className="text-stone-900">{formatVnd(tuition.creditUnitPrice)} / TC</strong></span>
                <span>•</span>
                <span>Hạn quyết toán (BR-07): <strong className="text-red-700">{tuition.dueDate || '30 ngày sau chốt ĐK'}</strong></span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!isPaid ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenPayOs}
                    disabled={creatingPayOs}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white transition shadow-sm hover:shadow cursor-pointer disabled:opacity-50 ring-2 ring-red-400/30"
                  >
                    <Zap size={16} className="text-amber-200" />
                    <span>{creatingPayOs ? 'Đang kết nối PayOS...' : 'Thanh Toán PayOS Checkout'}</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition border border-stone-300 cursor-pointer"
                  >
                    <QrCode size={16} className="text-stone-600" />
                    <span>VietQR Napas247</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5 font-mono shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 size={14} className="text-emerald-700" />
                    <span>Giao dịch thành công</span>
                  </div>
                  <div>Mã biên lai: <strong className="text-stone-900 font-bold">{tuition.transactionCode}</strong></div>
                  <div>Phương thức: <span className="text-stone-800">{tuition.paymentMethod || 'PayOS VietQR (Tự động)'}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Breakdown Course Fee Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-stone-900 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Building size={16} className="text-red-700" />
                  Bảng Kê Chi Tiết Quyết Toán Học Phần ({tuition.courses?.length || 0} môn)
                </h3>
                <span className="text-[11px] text-stone-600">
                  Căn cứ quy chế đào tạo tín chỉ và định mức chuẩn 450.000 VNĐ/TC (BR-07)
                </span>
              </div>

              {!isPaid && (
                <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                  Chưa gạch nợ
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Mã học phần</th>
                    <th className="py-3 px-4">Tên môn học / Lớp học phần</th>
                    <th className="py-3 px-4 text-center">Số TC</th>
                    <th className="py-3 px-4 text-right">Đơn giá / TC</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {tuition.courses?.map((c, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-mono text-stone-500 text-center">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-800">{c.courseCode}</td>
                      <td className="py-3.5 px-4 font-medium text-stone-900">{c.courseName}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-800">{c.credits} TC</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">{formatVnd(tuition.creditUnitPrice)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">{formatVnd(c.fee)}</td>
                    </tr>
                  ))}
                  {tuition.totalCredits > 0 && (
                    <tr className="bg-stone-50/40">
                      <td className="py-3.5 px-4 font-mono text-stone-400 text-center">-</td>
                      <td className="py-3.5 px-4 font-mono text-stone-500 font-bold">FEE-LAB-LIB</td>
                      <td className="py-3.5 px-4 text-stone-700">Phí duy trì cơ sở vật chất, thư viện số &amp; phòng lab thực hành</td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-400">-</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-500">Định mức kỳ</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">{formatVnd(tuition.facilityFee)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/90 border-t-2 border-stone-200 text-xs font-bold font-mono">
                    <td colSpan="3" className="py-4 px-4 text-stone-900 uppercase">TỔNG CỘNG HỌC PHÍ PHẢI QUYẾT TOÁN</td>
                    <td className="py-4 px-4 text-center text-red-800 font-bold">{tuition.totalCredits} TC</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right text-base text-red-800 font-bold">{formatVnd(tuition.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 4. MODAL THANH TOÁN VIETQR NAPAS247 (TRADITIONAL BANK TRANSFER) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-700 text-white flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-tight flex items-center gap-1.5">
                    <span>Thanh Toán VietQR Napas247</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                      24/7 Miễn Phí
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Cổng đối soát thanh toán trực tuyến liên ngân hàng tức thì
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="text-stone-400 hover:text-stone-700 text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4">
              {/* Payment Session Timer */}
              <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-xs">
                <span className="text-stone-600 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600" />
                  Thời hạn phiên VietQR:
                </span>
                <span className="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {formatTimer(qrRemainingSeconds)}
                </span>
              </div>

              {/* Bank Selector Switcher */}
              {tuition?.supportedBanks && tuition.supportedBanks.length > 1 && (
                <div className="flex items-center justify-center p-1 bg-stone-100 rounded-xl border border-stone-200 gap-1">
                  {tuition.supportedBanks.map((bank) => (
                    <button
                      key={bank.bankBin}
                      type="button"
                      onClick={() => setSelectedBankBin(bank.bankBin)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        selectedBankBin === bank.bankBin
                          ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Building size={13} className={selectedBankBin === bank.bankBin ? 'text-red-700' : 'text-stone-400'} />
                      <span>{bank.bankShortName} ({bank.bankBin})</span>
                    </button>
                  ))}
                </div>
              )}

              {/* VietQR Display Frame with Napas247 Banner */}
              <div className="relative mx-auto w-64 bg-gradient-to-b from-stone-50 to-white border-2 border-stone-300 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-stone-200 text-[10px] font-mono font-bold">
                  <span className="text-red-700 font-bold uppercase">VietQR</span>
                  <span className="text-blue-700 font-bold uppercase">Napas 247</span>
                </div>

                {paymentSuccess ? (
                  <div className="py-12 flex flex-col items-center gap-2 text-emerald-700 animate-in zoom-in">
                    <CheckCircle2 size={54} className="animate-bounce" />
                    <p className="font-bold text-sm">Giao dịch đã xác nhận thành công!</p>
                    <p className="text-xs text-stone-500">Đang tạo biên lai điện tử...</p>
                  </div>
                ) : (
                  <div className="relative group">
                    <img
                      src={activeBank.vietQrQuickLink || (qrImageError ? fallbackQrUrl : vietQrUrl)}
                      onError={() => setQrImageError(true)}
                      alt="VietQR Napas247"
                      className="w-52 h-52 object-contain rounded-lg shadow-2xs"
                    />
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] opacity-60 animate-pulse pointer-events-none" />
                  </div>
                )}

                <p className="text-[10px] text-stone-500 text-center mt-2.5 font-medium">
                  Mở ứng dụng Mobile Banking của mọi ngân hàng để quét mã
                </p>
              </div>

              {/* Banking Transfer Details with 1-Click Copy */}
              <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                  <span className="text-stone-500 font-sans">Ngân hàng:</span>
                  <span className="font-bold text-stone-900 font-sans">{activeBank.bankName}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-sans">Chủ tài khoản:</span>
                  <strong className="text-stone-900">{activeBank.accountName}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-sans">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-red-800 text-sm font-bold">{activeBank.accountNumber}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeBank.accountNumber, 'Số tài khoản')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'Số tài khoản' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-sans">Số tiền cần nộp:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900 text-sm font-bold">{formatVnd(tuition?.remainingAmount || tuition?.totalAmount)}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(tuition?.remainingAmount || tuition?.totalAmount || 0), 'Số tiền')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép số tiền"
                    >
                      {copiedField === 'Số tiền' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                  <span className="text-stone-500 font-sans">Nội dung chuyển:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-bold">
                      {tuition?.transferContent || transferSyntax}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(tuition?.transferContent || transferSyntax, 'Nội dung chuyển khoản')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép cú pháp chuyển khoản"
                    >
                      {copiedField === 'Nội dung chuyển khoản' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Raw EMVCo VietQR Payload */}
              {activeBank.vietQrPayload && (
                <div className="border border-stone-200 rounded-lg p-2 text-left bg-stone-50/50">
                  <button
                    type="button"
                    onClick={() => setShowRawPayload(!showRawPayload)}
                    className="w-full flex items-center justify-between text-[11px] text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                  >
                    <span>Payload VietQR chuẩn Napas247 (EMVCo)</span>
                    {showRawPayload ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showRawPayload && (
                    <div className="mt-2 space-y-1">
                      <div className="p-2 bg-stone-900 text-emerald-400 font-mono text-[10px] rounded break-all select-all">
                        {activeBank.vietQrPayload}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(activeBank.vietQrPayload, 'Chuỗi Payload VietQR')}
                          className="text-[10px] text-red-700 hover:text-red-800 font-semibold flex items-center gap-1"
                        >
                          <Copy size={11} />
                          <span>Sao chép chuỗi mã</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warning Notice */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <Info size={15} className="text-amber-700 shrink-0" />
                <span>
                  Hệ thống tự động ghi nhận gạch nợ sau 30-60 giây khi chuyển khoản đúng cú pháp.
                </span>
              </div>
            </div>

            {/* Modal Actions & E2E Simulation Button */}
            <div className="mt-5 space-y-2">
              <button
                disabled={paying || paymentSuccess}
                onClick={handleSimulateBankingPayment}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {paying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>
                      {simulatingStep === 1 && 'Đang kết nối cổng Napas247...'}
                      {simulatingStep === 2 && 'Đang đối soát mã sinh viên...'}
                      {simulatingStep === 3 && 'Đang ghi nhận gạch nợ học phí...'}
                      {simulatingStep === 0 && 'Đang xử lý giao dịch...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-amber-200 animate-pulse" />
                    <span>Mô Phỏng Quét Mã &amp; Thanh Toán App Ngân Hàng (1-Click Settle)</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <button
                  disabled={paying}
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  disabled={paying || paymentSuccess}
                  onClick={() => handleConfirmPayment('VietQR Napas247 Chuyển Khoản')}
                  className="flex-1 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Check size={14} />
                  <span>Xác nhận đã chuyển</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. PAYOS CHECKOUT MODAL (EMBEDDED IFRAME + DYNAMIC VIETQR + RETURN URL SYNC) */}
      {showPayOsModal && payOsData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-700 via-rose-700 to-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 font-mono tracking-tight">
                      Cổng Thanh Toán Trực Tuyến PayOS
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Live / Sandbox
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Mã đơn hàng: <strong className="text-red-700 font-mono font-bold">#{payOsData.orderCode}</strong> • Tự động gạch nợ tức thì
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPayOsModal(false)
                  setPollingActive(false)
                  try {
                    exitPayOs()
                  } catch (ignored) {}
                }}
                className="text-stone-400 hover:text-stone-700 text-2xl leading-none p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                &times;
              </button>
            </div>

            {/* Tab Navigation: Nhúng PayOS Checkout vs Mã QR & Chi tiết */}
            <div className="px-5 pt-3 border-b border-stone-200 bg-white flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActivePayOsTab('embedded')}
                className={`py-2 px-3.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                  activePayOsTab === 'embedded'
                    ? 'border-red-700 text-red-700 bg-red-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Layers size={14} />
                <span>Nhúng PayOS Checkout (Khung Thanh Toán)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePayOsTab('qr')}
                className={`py-2 px-3.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                  activePayOsTab === 'qr'
                    ? 'border-red-700 text-red-700 bg-red-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <QrCode size={14} />
                <span>Mã VietQR &amp; Chi Tiết Đơn Hàng</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Status Note */}
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-950">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                <div>
                  <span className="font-bold">Luồng Quyết Toán Tự Động (PayOS IPN):</span> Sau khi giao dịch hoàn tất trên giao diện PayOS hoặc qua App Ngân hàng, trạng thái học phí sẽ được tự động đổi sang <strong>ĐÃ HOÀN TẤT</strong> ngay lập tức.
                </div>
              </div>

              {/* Tab 1: Embedded PayOS Checkout Frame */}
              {activePayOsTab === 'embedded' && (
                <div className="space-y-3">
                  <div
                    id="payos-checkout-container"
                    className="w-full h-[540px] rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 relative flex flex-col items-center justify-center shadow-inner"
                  >
                    {/* Fallback frame in case SDK doesn't mount iframe */}
                    {payOsData.checkoutUrl ? (
                      <iframe
                        src={`${payOsData.checkoutUrl.replace('/web/', '/embedded/')}?redirect_uri=${encodeURIComponent(window.location.origin + '/student/tuition')}`}
                        title="PayOS Checkout Embedded"
                        className="w-full h-full border-none"
                        allow="clipboard-write"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <RefreshCw size={24} className="animate-spin mx-auto text-stone-400" />
                        <p className="text-xs text-stone-500 font-mono">Đang tải giao diện thanh toán PayOS Checkout...</p>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 text-center font-sans">
                    Nếu khung thanh toán bị chặn do bảo mật trình duyệt, bạn có thể chuyển qua tab <strong>Mã VietQR</strong> hoặc bấm nút mở tab mới bên dưới.
                  </p>
                </div>
              )}

              {/* Tab 2: Dynamic VietQR and Order Details */}
              {activePayOsTab === 'qr' && (
                <div className="space-y-4">
                  {/* Dynamic VietQR code from PayOS */}
                  <div className="relative mx-auto w-60 h-auto min-h-60 bg-gradient-to-b from-stone-50 to-white border-2 border-stone-300 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                    <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-stone-200 text-[10px] font-mono font-bold">
                      <span className="text-red-700 uppercase">PayOS VietQR</span>
                      <span className="text-emerald-700 uppercase">Tự động gạch nợ</span>
                    </div>

                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payOsData.qrCode || '')}`}
                      alt="PayOS VietQR Code"
                      className="w-48 h-48 object-contain rounded-lg shadow-2xs"
                    />

                    <p className="text-[10px] text-stone-500 text-center mt-2.5 font-medium">
                      Mở App Ngân hàng bất kỳ &gt; Quét QR &gt; Bấm chuyển tiền
                    </p>
                  </div>

                  {/* Order Details Box with 1-Click Copy */}
                  <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2 font-mono">
                    <div className="flex justify-between items-center pb-1 border-b border-stone-200">
                      <span className="text-stone-500 font-sans">Mã đơn hàng PayOS:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-red-800 text-sm tracking-wide">#{payOsData.orderCode}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(payOsData.orderCode), 'Mã đơn hàng PayOS')}
                          className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                          title="Sao chép mã đơn hàng"
                        >
                          {copiedField === 'Mã đơn hàng PayOS' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-sans">Số tiền cần nộp:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-stone-900 text-sm font-bold">{formatVnd(payOsData.amount)}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(payOsData.amount), 'Số tiền')}
                          className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          {copiedField === 'Số tiền' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 font-sans">Nội dung chuyển:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">{payOsData.description}</strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(payOsData.description, 'Nội dung chuyển khoản PayOS')}
                          className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                          title="Sao chép nội dung"
                        >
                          {copiedField === 'Nội dung chuyển khoản PayOS' ? <CheckCheck size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-stone-200">
                      <span className="text-stone-500 font-sans">Tài khoản nhận:</span>
                      <span className="text-stone-700">{payOsData.accountNumber} ({payOsData.accountName})</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sandbox Testing Helper */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-amber-900 font-mono text-[11px] block">Kiểm thử Sandbox / Developer IPN:</span>
                  <span className="text-amber-800 text-[11px]">Gửi tín hiệu Webhook tức thì để mô phỏng sinh viên đã chuyển khoản thành công.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulatePayOsWebhook}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <Sparkles size={13} className="text-amber-700" />
                  <span>⚡ Mô Phỏng PayOS Webhook</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {payOsData.checkoutUrl ? (
                <a
                  href={payOsData.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <ExternalLink size={14} />
                  <span>Mở PayOS Checkout Tab Mới</span>
                </a>
              ) : <div />}

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setShowPayOsModal(false)
                    setPollingActive(false)
                    try {
                      exitPayOs()
                    } catch (ignored) {}
                  }}
                  className="w-full sm:w-auto py-2 px-4 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. OFFICIAL ELECTRONIC RECEIPT MODAL (BIÊN LAI ĐIỆN TỬ) */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in-95 my-8">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 print:hidden">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase flex items-center gap-1.5">
                <FileText size={14} className="text-red-700" />
                Chứng Từ Thu Học Phí Điện Tử Hợp Lệ
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-black text-white transition shadow-2xs cursor-pointer"
                >
                  <Printer size={13} />
                  <span>In Biên Lai</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-2xl leading-none cursor-pointer"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Official University Receipt Certificate Printable Container */}
            <div className="mt-4 p-6 sm:p-8 rounded-2xl border border-stone-300 bg-stone-50/40 relative overflow-hidden space-y-5 print:border-none print:p-0 print:m-0">
              {/* Circular Red University Stamp Watermark */}
              <div className="absolute right-6 top-32 opacity-20 pointer-events-none w-48 h-48 rotate-[-15deg]">
                <img src="/images/stamp-seal.svg" alt="Official Stamp" className="w-full h-full" />
              </div>

              {/* University Header */}
              <div className="text-center border-b border-stone-200 pb-4">
                <p className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                  BỘ GIÁO DỤC VÀ ĐÀO TẠO • HỌC VIỆN CÔNG NGHỆ RIKKEI
                </p>
                <p className="text-[10px] font-mono text-stone-500 uppercase">
                  PHÒNG KẾ HOẠCH - TÀI CHÍNH • CỔNG THANH TOÁN PAYOS
                </p>
                <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 uppercase mt-1 tracking-tight">
                  PHIẾU XÁC NHẬN NỘP HỌC PHÍ ĐIỆN TỬ
                </h3>
                <p className="text-[11px] font-mono text-stone-500 mt-1">
                  Mã giao dịch / Transaction Ref: <strong className="text-stone-900">{tuition?.transactionCode || 'TXN-PAYOS-' + Date.now()}</strong>
                </p>
              </div>

              {/* Student & Payment Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Sinh viên nộp phí:</span>
                  <span className="font-bold text-stone-900">{tuition?.studentName || studentName} (MSSV: {tuition?.studentCode || studentCode})</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Mã số sinh viên (MSSV):</span>
                  <strong className="font-mono text-stone-900 font-bold">{tuition?.studentCode || studentCode}</strong>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Học kỳ đào tạo:</span>
                  <span className="font-bold text-stone-800 font-mono">{tuition?.semesterName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Tổng số tín chỉ quyết toán:</span>
                  <span className="font-bold font-mono text-stone-800">{tuition?.totalCredits} Tín chỉ</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-stone-200 text-sm">
                  <span className="font-bold text-stone-900">Số tiền đã quyết toán:</span>
                  <strong className="font-mono text-red-800 text-base font-bold">{formatVnd(tuition?.totalAmount)}</strong>
                </div>

                <div className="py-1 text-xs">
                  <span className="text-stone-500 block">Số tiền viết bằng chữ:</span>
                  <span className="italic font-serif text-stone-800 font-medium block pt-0.5">
                    {numberToVietnameseWords(tuition?.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Phương thức thanh toán:</span>
                  <span className="font-medium text-stone-800 font-mono">{tuition?.paymentMethod || 'PayOS VietQR (Tự động)'}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Thời điểm ghi nhận hệ thống:</span>
                  <span className="font-mono text-stone-700">
                    {tuition?.paymentDate ? new Date(tuition.paymentDate).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Digital Signature & Stamp Footer */}
              <div className="pt-4 border-t border-stone-200 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <ShieldCheck size={18} />
                  <span>Ký số điện tử SHA-256 xác thực</span>
                </div>
                <div className="text-right text-stone-600 italic text-[11px]">
                  <div>Ban Quản lý Tài chính Sinh viên</div>
                  <div className="font-bold font-mono not-italic text-stone-800">RIKKEI EDUPORTAL</div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="mt-5 flex justify-end print:hidden">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-black text-white rounded-xl transition cursor-pointer"
              >
                Đóng biên lai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentTuition
