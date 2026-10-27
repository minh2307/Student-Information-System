import React, { useState, useEffect, useRef } from 'react'
import { QrCode, Play, StopCircle, RefreshCw, Users, CheckCircle, Clock, Copy, Check, ShieldCheck, X } from 'lucide-react'
import api from '../../../services/api'

export function QrAttendanceModal({ sectionId, sectionCode, courseName, onClose }) {
  const [session, setSession] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(15)
  const [error, setError] = useState(null)

  const pollingRef = useRef(null)
  const timerRef = useRef(null)

  // Load or fetch current session
  const fetchCurrentSession = async () => {
    try {
      const res = await api.get(`/lecturer/classes/${sectionId}/attendance/session`)
      if (res.data?.data) {
        setSession(res.data.data)
      }
    } catch (err) {
      // If 404, no active session yet
      if (err.response?.status !== 404) {
        console.error('Lỗi tải phiên điểm danh:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch rotating QR code
  const fetchRotatingQr = async () => {
    try {
      const res = await api.get(`/lecturer/classes/${sectionId}/attendance/qr-code`)
      if (res.data?.data) {
        setQrData(res.data.data)
        setCountdown(res.data.data.remainingSeconds || 15)
      }
    } catch (err) {
      console.warn('Lỗi lấy QR xoay vòng:', err)
    }
  }

  // Start new session
  const handleStartSession = async () => {
    try {
      setStarting(true)
      setError(null)
      const res = await api.post(`/lecturer/classes/${sectionId}/attendance/session`, {
        sessionName: `Điểm danh ${new Date().toLocaleDateString('vi-VN')}`
      })
      if (res.data?.data) {
        setSession(res.data.data)
        await fetchRotatingQr()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể bắt đầu phiên điểm danh.')
    } finally {
      setStarting(false)
    }
  }

  // Close session
  const handleCloseSession = async () => {
    try {
      setClosing(true)
      const res = await api.post(`/lecturer/classes/${sectionId}/attendance/close-session`)
      if (res.data?.data) {
        setSession(res.data.data)
        setQrData(null)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đóng phiên điểm danh.')
    } finally {
      setClosing(false)
    }
  }

  useEffect(() => {
    fetchCurrentSession()
  }, [sectionId])

  // Polling for QR code and session attendee updates
  useEffect(() => {
    if (session?.status === 'OPEN') {
      fetchRotatingQr()

      // 1-second countdown tick
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            fetchRotatingQr()
            return 15
          }
          return prev - 1
        })
      }, 1000)

      // 5-second attendee list refresh
      pollingRef.current = setInterval(() => {
        fetchCurrentSession()
      }, 4000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [session?.status])

  const copyQrToken = () => {
    if (qrData?.qrToken) {
      navigator.clipboard.writeText(qrData.qrToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Điểm Danh QR Động (Anti-Proxy)
                {session?.status === 'OPEN' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Đang mở
                  </span>
                )}
                {session?.status === 'CLOSED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Đã kết thúc
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {courseName} • Lớp: <span className="font-semibold text-slate-800 dark:text-slate-200">{sectionCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-sm border border-red-200 dark:border-red-900">
            {error}
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {session?.status === 'OPEN' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* QR display section */}
              <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
                <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  {qrData?.qrToken ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData.qrToken)}`}
                      alt="Rotating Attendance QR Code"
                      className="w-52 h-52 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-slate-400">
                      <RefreshCw className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                  {/* Rotation badge */}
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow">
                    {countdown}s
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Mã QR tự động đổi sau 15 giây (chống chụp ảnh gửi ngoài)
                </div>

                {/* Progress bar */}
                <div className="w-full mt-3 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(countdown / 15) * 100}%` }}
                  />
                </div>

                <div className="mt-4 flex gap-2 w-full">
                  <button
                    onClick={copyQrToken}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Đã sao chép token' : 'Sao chép token test'}
                  </button>
                  <button
                    onClick={handleCloseSession}
                    disabled={closing}
                    className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <StopCircle className="h-4 w-4" />
                    {closing ? 'Đang đóng...' : 'Kết thúc điểm danh'}
                  </button>
                </div>
              </div>

              {/* Live Attendee List */}
              <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Sinh viên đã điểm danh ({session.records?.length || 0})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Cập nhật tự động
                  </span>
                </div>

                <div className="mt-3 flex-1 overflow-y-auto max-h-64 space-y-2 pr-1">
                  {session.records && session.records.length > 0 ? (
                    session.records.map((r) => (
                      <div
                        key={r.recordId}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {r.studentName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            MSSV: {r.studentCode}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                          <CheckCircle className="h-3 w-3" />
                          {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Vừa xong'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-400">
                      Chưa có sinh viên nào quét mã điểm danh...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Idle / Closed state */
            <div className="text-center py-10 px-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                <QrCode className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Bắt đầu phiên điểm danh QR động
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Hệ thống sẽ tạo mã QR bảo mật xoay vòng 15 giây/lần. Sinh viên quét mã trực tiếp trên màn chiếu để điểm danh. Chống gian lận và chụp ảnh gửi nhóm hoàn toàn.
              </p>

              {session && (
                <div className="mt-4 p-3 inline-block rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  Phiên gần nhất: <span className="font-semibold">{session.sessionName}</span> • Số SV đã điểm danh: <span className="font-semibold">{session.totalAttendees || 0}</span>
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Play className="h-5 w-5 fill-current" />
                  {starting ? 'Đang khởi tạo...' : 'Mở phiên điểm danh QR ngay'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
