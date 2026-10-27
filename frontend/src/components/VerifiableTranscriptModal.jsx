import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Download,
  X,
  Loader2,
  Lock,
  Building,
  GraduationCap
} from 'lucide-react'
import api from '../services/api'

export function VerifiableTranscriptModal({ open, onClose }) {
  if (!open) return null

  const [loading, setLoading] = useState(true)
  const [credential, setCredential] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedSig, setCopiedSig] = useState(false)

  useEffect(() => {
    fetchCredential()
  }, [])

  const fetchCredential = async () => {
    setLoading(true)
    try {
      const res = await api.get('/student/credentials/transcript')
      setCredential(res.data?.data)
    } catch (err) {
      console.error('Lỗi sinh chứng thực số:', err)
      alert('Không thể tạo bảng điểm số xác thực: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (credential?.verificationUrl) {
      navigator.clipboard.writeText(credential.verificationUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const copySignature = () => {
    if (credential?.signature) {
      navigator.clipboard.writeText(credential.signature)
      setCopiedSig(true)
      setTimeout(() => setCopiedSig(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-r from-red-800 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Bảng Điểm Số Xác Thực Mật Mã
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tamper-Proof
                </span>
              </h2>
              <p className="text-xs text-rose-100">
                Chứng chỉ học vụ số hóa với chữ ký điện tử HMAC-SHA256 & QR đối soát chống giả mạo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-red-700 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang sinh chữ ký số mật mã cho hồ sơ học tập...</p>
            </div>
          ) : credential ? (
            <div className="space-y-6">
              
              {/* Digital Certificate Card */}
              <div className="relative p-6 rounded-2xl border-2 border-amber-300/80 bg-linear-to-b from-amber-50/40 via-white to-amber-50/20 shadow-sm space-y-4">
                
                {/* Certificate Brand Header */}
                <div className="flex items-start justify-between border-b border-amber-200/80 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-800 tracking-wider uppercase block">
                      Học Viện Công Nghệ Rikkei • Rikkei Academy of Technology
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      GIẤY CHỨNG NHẬN KẾT QUẢ HỌC TẬP SỐ
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Serial: <strong className="text-slate-800">{credential.serial}</strong>
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    ĐÃ XÁC THỰC SỐ
                  </span>
                </div>

                {/* Main Dossier Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
                  
                  {/* Student Details (2 Cols) */}
                  <div className="sm:col-span-2 space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Họ và tên sinh viên:</span>
                      <span className="font-bold text-slate-900 text-sm">{credential.fullName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Mã số sinh viên:</span>
                        <span className="font-mono font-bold text-slate-800">{credential.studentCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Chuyên ngành:</span>
                        <span className="font-semibold text-slate-800">{credential.major}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-amber-100">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Điểm CGPA tích lũy:</span>
                        <span className="font-mono font-black text-red-700 text-base">{credential.cgpa} / 10.0</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Tín chỉ tích lũy:</span>
                        <span className="font-mono font-bold text-slate-800">{credential.creditsEarned} / {credential.totalRequiredCredits} TC</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-slate-500 text-[11px] block">Xếp loại học vụ:</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[11px]">
                        {credential.academicStanding}
                      </span>
                    </div>
                  </div>

                  {/* QR Code (1 Col) */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-amber-200 text-center shadow-2xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(credential.verificationUrl)}`}
                      alt="Verifiable Transcript QR"
                      className="w-32 h-32 object-contain"
                    />
                    <span className="text-[10px] text-slate-500 font-medium mt-2">
                      Quét mã QR để đối soát tính hợp lệ
                    </span>
                  </div>

                </div>

                {/* Footer of Card */}
                <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Cơ quan cấp: <strong>Học Viện Rikkei</strong></span>
                  <span>Ngày cấp: {credential.issuedAt}</span>
                </div>

              </div>

              {/* Cryptographic Signature Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock size={13} className="text-slate-600" />
                    Chữ ký số mật mã (HMAC-SHA256 Signature):
                  </span>
                  <button
                    onClick={copySignature}
                    className="text-[11px] text-red-700 hover:text-red-800 font-bold flex items-center gap-1 transition"
                  >
                    {copiedSig ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedSig ? 'Đã sao chép' : 'Sao chép chữ ký'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                  {credential.signature}
                </div>
              </div>

              {/* Public Verification Link */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ExternalLink size={13} className="text-emerald-700" />
                    Đường dẫn đối soát công khai (Dành cho Nhà tuyển dụng / Phụ huynh):
                  </span>
                  <button
                    onClick={copyLink}
                    className="text-[11px] text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 transition"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedLink ? 'Đã sao chép URL' : 'Sao chép URL'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={credential.verificationUrl}
                    className="flex-1 font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-emerald-200 outline-none select-all"
                  />
                  <a
                    href={credential.verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs whitespace-nowrap transition"
                  >
                    <span>Mở trang đối soát</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}
export default VerifiableTranscriptModal
