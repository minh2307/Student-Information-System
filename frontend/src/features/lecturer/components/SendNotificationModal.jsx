import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Send,
  MessageSquare,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Users,
  User,
  Loader2,
  Sparkles,
  Mail
} from 'lucide-react'
import api from '../../../services/api'

const PRESET_TITLES = [
  'Nhắc nhở hạn nộp bài tập lớn',
  'Dặn dò lịch thi và ôn tập cuối kỳ',
  'Cảnh báo chuyên cần và số buổi vắng',
  'Trao đổi về kết quả bài kiểm tra giữa kỳ',
  'Thông báo đổi phòng / lịch học bù'
]

export function SendNotificationModal({
  open,
  onClose,
  sectionId,
  sectionCode,
  courseName,
  students = [],
  initialStudent = null,
  onSuccess
}) {
  const [recipientMode, setRecipientMode] = useState('ALL') // 'ALL' | 'SINGLE'
  const [selectedStudentCode, setSelectedStudentCode] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [notifType, setNotifType] = useState('LECTURER_MESSAGE') // 'LECTURER_MESSAGE' | 'EARLY_WARNING' | 'ANNOUNCEMENT'
  const [sendEmail, setSendEmail] = useState(true)
  const [testRecipientEmail, setTestRecipientEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [successResult, setSuccessResult] = useState(null)

  // Initialize or reset when modal opens
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccessResult(null)
      setSendEmail(true)
      setTestRecipientEmail('')
      if (initialStudent) {
        setRecipientMode('SINGLE')
        setSelectedStudentCode(initialStudent.studentCode || '')
        setTitle(`Nhắc nhở học tập: ${initialStudent.fullName}`)
      } else {
        setRecipientMode('ALL')
        setSelectedStudentCode(students.length > 0 ? students[0].studentCode : '')
        setTitle('')
      }
      setMessage('')
      setNotifType('LECTURER_MESSAGE')
    }
  }, [open, initialStudent, students])

  const targetStudent = useMemo(() => {
    return students.find(s => s.studentCode === selectedStudentCode) || null
  }, [students, selectedStudentCode])

  if (!open) return null

  const handleApplyPreset = (presetText) => {
    setTitle(presetText)
    if (presetText.includes('Cảnh báo')) {
      setNotifType('EARLY_WARNING')
    } else if (presetText.includes('Thông báo') || presetText.includes('lịch thi')) {
      setNotifType('ANNOUNCEMENT')
    }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề thông báo.')
      return
    }
    if (!message.trim()) {
      setError('Vui lòng nhập nội dung tin nhắn/thông báo.')
      return
    }

    setSending(true)
    setError(null)
    setSuccessResult(null)

    try {
      const payload = {
        sectionId: Number(sectionId),
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        sendEmail: sendEmail,
        testRecipientEmail: testRecipientEmail.trim() || undefined,
      }

      if (recipientMode === 'SINGLE') {
        if (!selectedStudentCode) {
          setError('Vui lòng chọn sinh viên nhận thông báo.')
          setSending(false)
          return
        }
        payload.studentCodes = [selectedStudentCode]
      }

      const res = await api.post('/lecturer/early-warnings/notify', payload)
      const data = res.data?.data
      setSuccessResult(data || { sentCount: recipientMode === 'SINGLE' ? 1 : students.length })
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err) {
      console.error('[SendNotificationModal] error:', err)
      setError(err.response?.data?.message || err.message || 'Lỗi khi gửi thông báo tới sinh viên.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Gửi thông báo & Dặn dò học sinh
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                <span className="font-mono text-red-600 font-semibold mr-1.5">{sectionCode}</span>
                {courseName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Success Banner */}
          {successResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-800 animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-900">
                  Gửi thông báo thành công!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Đã chuyển phát thông báo tới {successResult.sentCount} sinh viên. Sinh viên sẽ nhận được thông báo ngay tại Cổng thông tin đào tạo (chuông thông báo & dashboard).
                </p>
                {successResult.emailsDispatched > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <Mail size={13} className="text-emerald-700" />
                    Đồng thời đã phát hành {successResult.emailsDispatched} email thông báo thành công qua Gmail SMTP!
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Hoàn tất & Đóng
                  </button>
                  <button
                    onClick={() => {
                      setSuccessResult(null)
                      setTitle('')
                      setMessage('')
                    }}
                    className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Gửi thông báo khác
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900">Không thể gửi thông báo</p>
                <p className="text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!successResult && (
            <form id="send-notification-form" onSubmit={handleSend} className="space-y-4">
              
              {/* Đối tượng nhận */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Đối tượng nhận thông báo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('ALL')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      recipientMode === 'ALL'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users size={16} className={recipientMode === 'ALL' ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="text-left">
                      <div>Toàn bộ lớp học phần</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tất cả {students.length} sinh viên</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientMode('SINGLE')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      recipientMode === 'SINGLE'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User size={16} className={recipientMode === 'SINGLE' ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="text-left">
                      <div>Gửi riêng cho 1 sinh viên</div>
                      <div className="text-[10px] text-slate-400 font-normal">Nhắn tin / cảnh báo cá nhân</div>
                    </div>
                  </button>
                </div>

                {/* Chọn sinh viên cụ thể nếu chế độ SINGLE */}
                {recipientMode === 'SINGLE' && (
                  <div className="mt-2.5 animate-in fade-in">
                    <select
                      value={selectedStudentCode}
                      onChange={(e) => setSelectedStudentCode(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    >
                      <option value="">-- Chọn sinh viên --</option>
                      {students.map((st) => (
                        <option key={st.enrollmentId || st.studentCode} value={st.studentCode}>
                          {st.fullName} ({st.studentCode}) {st.letterGrade ? `· Điểm: ${st.letterGrade}` : ''}
                        </option>
                      ))}
                    </select>

                    {targetStudent && (
                      <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-800">{targetStudent.fullName}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({targetStudent.studentCode})</span>
                        </div>
                        {targetStudent.attendanceRate !== undefined && (
                          <span className="text-[11px] text-slate-500">
                            Chuyên cần: <strong>{targetStudent.attendanceRate}%</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Loại thông báo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Phân loại thông báo
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'LECTURER_MESSAGE', label: '💬 Dặn dò / Nhắn tin riêng', color: 'blue' },
                    { id: 'EARLY_WARNING', label: '⚠️ Cảnh báo học tập / Vắng', color: 'amber' },
                    { id: 'ANNOUNCEMENT', label: '📢 Thông báo chung của lớp', color: 'indigo' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNotifType(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        notifType === t.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gợi ý tiêu đề nhanh */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" /> Gợi ý nhanh:
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_TITLES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề thông báo (vd: Nhắc nhở hạn nộp bài tập lớn...)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Nội dung thông báo */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nội dung thông báo <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {message.length} ký tự
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="Nhập nội dung dặn dò, lưu ý bài thi, bài tập hoặc yêu cầu học vụ chi tiết gửi đến sinh viên..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs font-normal border border-slate-300 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Cấu hình gửi kèm Email */}
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-indigo-950 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <Mail size={15} className="text-indigo-600" />
                    Đồng thời gửi Email thông báo tới sinh viên
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-full border border-indigo-200">
                    Gmail SMTP
                  </span>
                </div>

                {sendEmail && (
                  <div className="pt-2 border-t border-indigo-100/80 space-y-1.5 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Chuyển tiếp kiểm thử (nếu muốn test trực tiếp trên 1 email):</span>
                      <button
                        type="button"
                        onClick={() => setTestRecipientEmail('workspacegateos@gmail.com')}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                      >
                        workspacegateos@gmail.com
                      </button>
                    </div>
                    <input
                      type="email"
                      placeholder="Để trống để gửi trực tiếp tới email sinh viên trong hệ thống"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      className="w-full text-xs font-medium border border-indigo-200 rounded-lg p-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    />
                  </div>
                )}
              </div>

              {/* Preview Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <Bell size={12} /> Xem trước thông báo hiển thị cho sinh viên:
                </div>
                <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-sm space-y-1">
                  <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    📢 {title.trim() || '(Chưa có tiêu đề)'}
                  </p>
                  <p className="text-[11px] text-slate-600 whitespace-pre-wrap line-clamp-3">
                    {message.trim() || '(Nội dung thông báo sẽ hiển thị ở đây...)'}
                  </p>
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Lớp: {sectionCode} - {courseName} · Vừa xong
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!successResult && (
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="send-notification-form"
              disabled={sending || !title.trim() || !message.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Đang gửi thông báo...
                </>
              ) : (
                <>
                  <Send size={13} />
                  Gửi thông báo ngay
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
