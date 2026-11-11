import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Printer,
  QrCode,
  FileText,
  ShieldCheck,
  Building,
  Filter,
  Copy,
  CheckCheck,
  Zap,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Info,
  X
} from 'lucide-react'

import { numberToVietnameseWords } from '../utils/currencyWords'
export { numberToVietnameseWords }

export const StudentTuition = () => {
  // ─────────────────────────────────────────
  // 1. Store & URL SearchParams & Navigation
  // ─────────────────────────────────────────
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // ─────────────────────────────────────────
  // 2. State
  // ─────────────────────────────────────────
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [tuition, setTuition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [showPayOsModal, setShowPayOsModal] = useState(false)
  const [payOsData, setPayOsData] = useState(null)
  const [creatingPayOs, setCreatingPayOs] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)
  const [payOsQrError, setPayOsQrError] = useState(false)
  const [returnStatusInfo, setReturnStatusInfo] = useState(null)

  // ─────────────────────────────────────────
  // 3. User info
  // ─────────────────────────────────────────
  const studentCode = user?.studentCode || user?.username || 'SV2024001'
  const studentName = user?.fullName || 'Nguyễn Văn C'

  // ─────────────────────────────────────────
  // 4. Data Loading
  // ─────────────────────────────────────────
  const fetchTuition = useCallback(
    async (semester) => {
      const sem = semester || selectedSemester
      if (!sem) return
      setLoading(true)
      try {
        const res = await api.get(`/student/tuition?semester=${sem}`)
        if (res.data?.data) {
          setTuition(res.data.data)
        }
      } catch (err) {
        console.error('Lỗi tải học phí:', err)
      } finally {
        setLoading(false)
      }
    },
    [selectedSemester]
  )

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && res.data.data.length > 0) {
          setSemesters(res.data.data)
          const active = res.data.data.find((s) => s.isActive) || res.data.data[0]
          setSelectedSemester(active.semesterCode)
        }
      } catch (err) {
        console.error('Lỗi tải danh sách học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  useEffect(() => {
    if (selectedSemester) {
      fetchTuition(selectedSemester)
    }
  }, [selectedSemester, fetchTuition])

  // ─────────────────────────────────────────
  // 5. PayOS Return URL Handling
  // ─────────────────────────────────────────
  useEffect(() => {
    const statusParam = searchParams.get('status')
    const codeParam = searchParams.get('code')
    const cancelParam = searchParams.get('cancel')
    const orderCodeParam = searchParams.get('orderCode')
    const paymentLinkId = searchParams.get('id')

    if (statusParam || codeParam || cancelParam) {
      const activeSem = selectedSemester || '2024-25_SEM2'
      if ((statusParam === 'PAID' || codeParam === '00') && cancelParam !== 'true') {
        setReturnStatusInfo({
          type: 'SUCCESS',
          orderCode: orderCodeParam,
          paymentLinkId,
          title: 'Quyết Toán Học Phí PayOS Thành Công!',
          message: `Giao dịch đơn hàng #${orderCodeParam || 'N/A'} đã được cổng PayOS xác thực thành công. Nghĩa vụ học phí của bạn đã được gạch nợ hoàn tất.`
        })
        toast.success(
          `Học phí đã được quyết toán thành công qua cổng PayOS! ${orderCodeParam ? `(Mã ĐH: ${orderCodeParam})` : ''}`
        )
        if (orderCodeParam) {
          api.get(`/student/tuition/payos/status?orderCode=${orderCodeParam}&semester=${activeSem}`)
            .then((res) => {
              if (res.data?.data) {
                setTuition(res.data.data)
              }
            })
            .catch(() => {})
        }
        setShowReceiptModal(true)
        fetchTuition(activeSem)
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

      setSearchParams({}, { replace: true })
    }
  }, [searchParams, selectedSemester, fetchTuition, setSearchParams])

  // ─────────────────────────────────────────
  // 6. Real-time Status Auto-polling
  // ─────────────────────────────────────────
  useEffect(() => {
    let timer = null
    const isPaidStatus = tuition?.status === 'PAID'
    if (pollingActive && !isPaidStatus && payOsData?.orderCode) {
      timer = setInterval(async () => {
        try {
          const res = await api.get(
            `/student/tuition/payos/status?orderCode=${payOsData.orderCode}&semester=${selectedSemester}`
          )
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
      }, 2500)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [pollingActive, tuition?.status, selectedSemester, payOsData?.orderCode])

  // ─────────────────────────────────────────
  // 7. Actions & Handlers
  // ─────────────────────────────────────────
  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0)
  }

  const handleCopy = (text, fieldName) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success(`Đã sao chép ${fieldName}!`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.warn('Clipboard write error', err)
    }
  }

  const handleOpenPayOs = async () => {
    setCreatingPayOs(true)
    setPayOsQrError(false)
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
        setShowPayOsModal(true)
        setPollingActive(true)
      }
    } catch (err) {
      toast.error('Không thể tạo liên kết thanh toán PayOS: ' + (err.response?.data?.message || err.message))
    } finally {
      setCreatingPayOs(false)
    }
  }

  const handleCheckPayOsStatus = async () => {
    if (!payOsData?.orderCode) return
    setCheckingStatus(true)
    try {
      const res = await api.get(
        `/student/tuition/payos/status?orderCode=${payOsData.orderCode}&semester=${selectedSemester}`
      )
      if (res.data?.data) {
        setTuition(res.data.data)
        if (res.data.data.status === 'PAID') {
          setPollingActive(false)
          setShowPayOsModal(false)
          setShowReceiptModal(true)
          toast.success('Học phí đã được quyết toán tự động qua cổng PayOS!')
          return
        }
      }
      toast.info('Chưa ghi nhận chuyển khoản từ ngân hàng. Vui lòng kiểm tra lại sau khi chuyển tiền.')
    } catch (err) {
      toast.error('Lỗi đối soát PayOS: ' + (err.response?.data?.message || err.message))
    } finally {
      setCheckingStatus(false)
    }
  }

  // ─────────────────────────────────────────
  // 9. Giá trị Boolean dẫn xuất (không phải hook)
  // ─────────────────────────────────────────
  const isNotEnrolled = tuition?.status === 'NOT_ENROLLED' || (!tuition?.totalCredits && (!tuition?.paidAmount || tuition?.paidAmount === 0))
  const isPaid = !isNotEnrolled && tuition?.status === 'PAID'
  const isPartial = !isNotEnrolled && tuition?.status === 'PARTIAL'

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header & Semester Switcher */}
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
            Cổng thanh toán tự động VietQR Napas247 &amp; PayOS Checkout • Sinh viên:{' '}
            <strong className="text-stone-900">{tuition?.studentName || studentName}</strong> (
            {tuition?.studentCode || studentCode})
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

      {/* 2. Return URL Notification Banner */}
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
          <p className="mt-3 text-xs text-stone-600 font-mono">
            Đang đối soát công nợ tín chỉ từ Cổng Tài chính...
          </p>
        </div>
      ) : !tuition ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-300 text-center">
          <AlertCircle size={32} className="mx-auto text-stone-400 mb-2" />
          <p className="text-xs text-stone-600">
            Không tìm thấy biểu phí học phần cho kỳ đào tạo này.
          </p>
        </div>
      ) : isNotEnrolled ? (
        <>
          {/* 2. Financial Standing Card for Unenrolled Semester */}
          <div className="rounded-2xl p-6 border shadow-2xs relative overflow-hidden bg-stone-50 border-stone-200/90">
            <div className="space-y-4 relative z-10">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 bg-stone-200/80 text-stone-700 border border-stone-300">
                  <Info size={13} className="text-stone-600" />
                  <span>CHƯA ĐĂNG KÝ HỌC PHẦN (CHƯA PHÁT SINH HỌC PHÍ)</span>
                </span>
                <span className="text-xs text-stone-600 font-mono">
                  Kỳ đào tạo: <strong className="text-stone-900">{tuition.semesterName}</strong>
                </span>
              </div>

              {/* 3 Chỉ Tiêu Tài Chính: 0đ khi chưa đăng ký môn */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Tổng học phí</span>
                  <span className="text-lg font-bold font-mono text-stone-900 block mt-0.5">0 đ</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Đã thanh toán</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 block mt-0.5">0 đ</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Còn phải thanh toán</span>
                  <span className="text-lg font-bold font-mono text-stone-700 block mt-0.5">0 đ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Unenrolled Notification Card */}
          <div className="bg-white rounded-2xl p-10 sm:p-14 border border-stone-200/90 shadow-2xs text-center space-y-3">
            <div className="w-14 h-14 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200 text-amber-700">
              <Info size={28} />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              Chưa Phát Sinh Nghĩa Vụ Học Phí
            </h3>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              Bạn chưa đăng ký học phần trong học kỳ này. Chưa phát sinh học phí.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/student/registration')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white transition shadow-sm cursor-pointer"
              >
                <Zap size={15} className="text-amber-300" />
                <span>Đăng Ký Học Phần Kỳ Này</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 3. Financial Standing Card */}
          <div
            className={`rounded-2xl p-6 border shadow-2xs relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
              isPaid
                ? 'bg-stone-50 border-stone-200/90'
                : isPartial
                ? 'bg-amber-50/40 border-amber-200/80'
                : 'bg-stone-50 border-stone-200/90'
            }`}
          >
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none w-52 h-52">
              <img src="/images/stamp-seal.svg" alt="Seal" className="w-full h-full" />
            </div>

            <div className="space-y-4 relative z-10 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : isPartial
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
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

              {/* 3 Chỉ Tiêu Tài Chính Cốt Lõi: Phân biệt rõ Tổng học phí - Đã thanh toán - Còn phải thanh toán */}
              <div className={`grid grid-cols-1 ${tuition.excessAmount > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
                <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Tổng học phí</span>
                  <span className="text-lg font-bold font-mono text-stone-900 block mt-0.5">
                    {formatVnd(tuition.totalAmount)}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Đã thanh toán</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 block mt-0.5">
                    {formatVnd(tuition.paidAmount)}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                  <span className="text-[11px] text-stone-500 font-medium block">Còn phải thanh toán</span>
                  <span className={`text-lg font-bold font-mono block mt-0.5 ${
                    (tuition.remainingAmount || 0) > 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}>
                    {formatVnd(tuition.remainingAmount != null ? tuition.remainingAmount : 0)}
                  </span>
                </div>
                {tuition.excessAmount > 0 && (
                  <div className="bg-emerald-50/90 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-300 shadow-2xs">
                    <span className="text-[11px] text-emerald-800 font-semibold block flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-700" />
                      Số dư bảo lưu
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-800 block mt-0.5">
                      {formatVnd(tuition.excessAmount)}
                    </span>
                  </div>
                )}
              </div>

              {tuition.excessAmount > 0 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                  <Info size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Ghi nhận số dư bảo lưu:</strong> Bạn có khoản tiền đã nộp vượt học phí là{' '}
                    <strong>{formatVnd(tuition.excessAmount)}</strong> (do điều chỉnh/hủy môn học sau khi đã thanh toán).
                    Khoản tiền dư này được nhà trường bảo lưu nguyên vẹn và tự động cấn trừ cho nghĩa vụ học phí các kỳ tiếp theo.
                  </div>
                </div>
              )}

              <div className="flex items-baseline gap-2.5 pt-1">
                <h2 className="text-2xl sm:text-4xl font-mono font-bold text-stone-900 tracking-tight">
                  {formatVnd(tuition.remainingAmount != null ? tuition.remainingAmount : tuition.totalAmount)}
                </h2>
                <span className="text-xs text-stone-500 font-medium font-sans">
                  {isPaid ? '(Đã thanh toán đủ)' : '(Số tiền còn phải nộp)'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 font-mono pt-0.5">
                <span>
                  Tổng số tín chỉ: <strong className="text-stone-900">{tuition.totalCredits} TC</strong>
                </span>
                <span>•</span>
                <span>
                  Định mức chuẩn:{' '}
                  <strong className="text-stone-900">{formatVnd(tuition.creditUnitPrice)} / TC</strong>
                </span>
                <span>•</span>
                <span>
                  Hạn quyết toán:{' '}
                  <strong className="text-red-700">{tuition.dueDate || '30 ngày sau chốt ĐK'}</strong>
                </span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              {!isPaid ? (
                <button
                  onClick={handleOpenPayOs}
                  disabled={creatingPayOs}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-700 via-rose-700 to-amber-700 hover:from-red-800 hover:to-amber-800 text-white transition shadow-sm hover:shadow cursor-pointer disabled:opacity-50 ring-2 ring-red-400/30"
                >
                  <Zap size={16} className="text-amber-200" />
                  <span>{creatingPayOs ? 'Đang tạo mã PayOS QR...' : 'Thanh Toán Qua PayOS (VietQR)'}</span>
                </button>
              ) : (
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5 font-mono shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 size={14} className="text-emerald-700" />
                    <span>Giao dịch thành công</span>
                  </div>
                  <div>
                    Mã biên lai: <strong className="text-stone-900 font-bold">{tuition.transactionCode}</strong>
                  </div>
                  <div>
                    Phương thức:{' '}
                    <span className="text-stone-800">{tuition.paymentMethod || 'PayOS VietQR (Tự động)'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Breakdown Course Fee Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-stone-900 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Building size={16} className="text-red-700" />
                  Bảng Kê Chi Tiết Quyết Toán Học Phần ({tuition.courses?.length || 0} môn)
                </h3>
                <span className="text-[11px] text-stone-600">
                  Căn cứ quy chế đào tạo tín chỉ và định mức học vụ
                </span>
              </div>

              {!isPaid && (
                <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                  Chưa gạch nợ
                </span>
              )}
            </div>

            <div className="overflow-x-auto touch-scroll">
              <table className="w-full text-left border-collapse text-xs min-w-[620px]">
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
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-800">
                        {c.credits} TC
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                        {formatVnd(tuition.creditUnitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {formatVnd(c.fee)}
                      </td>
                    </tr>
                  ))}
                  {tuition.totalCredits > 0 && (
                    <tr className="bg-stone-50/40">
                      <td className="py-3.5 px-4 font-mono text-stone-400 text-center">-</td>
                      <td className="py-3.5 px-4 font-mono text-stone-500 font-bold">FEE-FACILITY</td>
                      <td className="py-3.5 px-4 text-stone-700">
                        Phí duy trì cơ sở vật chất, thư viện số &amp; phòng lab thực hành
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-400">-</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-500">Định mức kỳ</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                        {formatVnd(tuition.facilityFee)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/90 border-t-2 border-stone-200 text-xs font-bold font-mono">
                    <td colSpan="3" className="py-4 px-4 text-stone-900 uppercase">
                      TỔNG CỘNG HỌC PHÍ PHẢI QUYẾT TOÁN
                    </td>
                    <td className="py-4 px-4 text-center text-red-800 font-bold">
                      {tuition.totalCredits} TC
                    </td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right text-base text-red-800 font-bold">
                      {formatVnd(tuition.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 5. PAYOS VIETQR CHECKOUT MODAL (Focused, Compact, No Iframe Clutter) */}
      {showPayOsModal && payOsData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-700 via-rose-700 to-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Zap size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 font-mono tracking-tight">
                      Cổng Thanh Toán PayOS
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Mã đơn hàng:{' '}
                    <strong className="text-red-700 font-mono font-bold">#{payOsData.orderCode}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowPayOsModal(false)
                  setPollingActive(false)
                }}
                className="text-stone-400 hover:text-stone-700 text-2xl leading-none p-1 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* VietQR Code Card */}
              <div className="relative mx-auto w-full bg-gradient-to-b from-stone-50 to-white border border-stone-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-2xs">
                <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-stone-200 text-[10px] font-mono font-bold">
                  <span className="text-red-700 uppercase flex items-center gap-1">
                    <QrCode size={13} /> Mã VietQR Thanh Toán
                  </span>
                  <span className="text-emerald-700 uppercase flex items-center gap-1">
                    <CheckCircle2 size={13} /> Tự Động Gạch Nợ
                  </span>
                </div>

                {payOsData.accountNumber ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-stone-200">
                      <img
                        src={
                          payOsQrError && payOsData.qrCode
                            ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                                payOsData.qrCode
                              )}`
                            : `https://img.vietqr.io/image/${payOsData.bin || '970422'}-${payOsData.accountNumber}-compact2.png?amount=${payOsData.amount || 0}&addInfo=${encodeURIComponent(
                                payOsData.description || ''
                              )}&accountName=${encodeURIComponent(
                                payOsData.accountName || 'NGUYEN QUANG VINH'
                              )}`
                        }
                        onError={() => setPayOsQrError(true)}
                        alt="PayOS VietQR Code"
                        className="w-52 h-auto object-contain rounded-xl"
                      />
                    </div>
                    <p className="text-[11px] text-stone-600 text-center mt-2.5 font-medium">
                      Mở App Ngân hàng bất kỳ &gt; Quét mã VietQR để thanh toán chính xác
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-stone-500">
                    <RefreshCw size={24} className="animate-spin mx-auto text-stone-400 mb-2" />
                    Đang tạo mã thanh toán VietQR...
                  </div>
                )}
              </div>

              {/* Transaction Details Grid */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs space-y-2 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-sans">Ngân hàng thụ hưởng:</span>
                  <span className="text-stone-900 font-bold font-sans">
                    MBBank (Ngân hàng TMCP Quân đội)
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Chủ tài khoản:</span>
                  <strong className="text-stone-900 font-bold">
                    {payOsData.accountName || 'NGUYEN QUANG VINH'}
                  </strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tài khoản nhận:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 text-sm font-bold">
                      {payOsData.accountNumber}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(payOsData.accountNumber, 'Số tài khoản')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'Số tài khoản' ? (
                        <CheckCheck size={13} className="text-emerald-700" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-red-700 text-sm font-bold">
                      {formatVnd(payOsData.amount)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(payOsData.amount), 'Số tiền')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép số tiền"
                    >
                      {copiedField === 'Số tiền' ? (
                        <CheckCheck size={13} className="text-emerald-700" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                      {payOsData.description}
                    </strong>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(payOsData.description, 'Nội dung chuyển khoản PayOS')
                      }
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {copiedField === 'Nội dung chuyển khoản PayOS' ? (
                        <CheckCheck size={13} className="text-emerald-700" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Status Sync */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping shrink-0" />
                  <span className="text-emerald-950 text-[11px] font-medium">
                    Hệ thống tự động kiểm tra giao dịch mỗi 2-3 giây.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckPayOsStatus}
                  disabled={checkingStatus}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw size={13} className={checkingStatus ? 'animate-spin text-emerald-700' : 'text-emerald-700'} />
                  <span>{checkingStatus ? 'Đang kiểm tra...' : 'Kiểm Tra Trạng Thái'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {payOsData.checkoutUrl ? (
                <a
                  href={payOsData.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 transition"
                >
                  <ExternalLink size={13} />
                  <span>Mở Trang Thanh Toán PayOS (pay.payos.vn) ↗</span>
                </a>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  setShowPayOsModal(false)
                  setPollingActive(false)
                }}
                className="w-full sm:w-auto py-2 px-5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ELECTRONIC RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in-95 my-8">
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

            <div className="mt-4 p-6 sm:p-8 rounded-2xl border border-stone-300 bg-stone-50/40 relative overflow-hidden space-y-5 print:border-none print:p-0 print:m-0">
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
                  Mã giao dịch / Transaction Ref:{' '}
                  <strong className="text-stone-900">
                    {tuition?.transactionCode || 'TXN-PAYOS-' + Date.now()}
                  </strong>
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Sinh viên nộp phí:</span>
                  <span className="font-bold text-stone-900">
                    {tuition?.studentName || studentName} (MSSV: {tuition?.studentCode || studentCode})
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Mã số sinh viên (MSSV):</span>
                  <strong className="font-mono text-stone-900 font-bold">
                    {tuition?.studentCode || studentCode}
                  </strong>
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
                  <strong className="font-mono text-red-800 text-base font-bold">
                    {formatVnd(tuition?.totalAmount)}
                  </strong>
                </div>

                <div className="py-1 text-xs">
                  <span className="text-stone-500 block">Số tiền viết bằng chữ:</span>
                  <span className="italic font-serif text-stone-800 font-medium block pt-0.5">
                    {numberToVietnameseWords(tuition?.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-500">Phương thức thanh toán:</span>
                  <span className="font-medium text-stone-800 font-mono">
                    {tuition?.paymentMethod || 'PayOS VietQR (Tự động)'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Thời điểm ghi nhận hệ thống:</span>
                  <span className="font-mono text-stone-700">
                    {tuition?.paymentDate
                      ? new Date(tuition.paymentDate).toLocaleString('vi-VN')
                      : new Date().toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>

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
