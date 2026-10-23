import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { 
  Lock, 
  User, 
  GraduationCap, 
  ShieldAlert, 
  ArrowRight,
  Bell,
  Pin,
  Calendar,
  Search,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  FileText,
  Clock
} from 'lucide-react'

const CATEGORIES = ['Tất cả', 'HỌC VỤ', 'LỊCH THI', 'HỌC BỔNG', 'HOẠT ĐỘNG']

export const Login = () => {
  const [username, setUsername] = useState('sv2024001')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  // Announcements state
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)

  // Tải danh sách thông báo chung
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements')
        if (res.data?.data) {
          setAnnouncements(res.data.data)
        }
      } catch (err) {
        console.warn('Chưa tải được bảng tin từ server, dùng seed data:', err.message)
      } finally {
        setLoadingAnnouncements(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { username, password })
      const { user, accessToken } = res.data.data
      login(user, accessToken)

      if (user.role === 'ADMIN') navigate('/admin/users')
      else if (user.role === 'LECTURER') navigate('/lecturer/classes')
      else navigate('/student/dashboard')
    } catch (err) {
      console.warn('API error, fallback demo mode:', err)
      const msg = err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu!'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillQuickAccount = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  // Lọc thông báo
  const filteredList = useMemo(() => {
    return announcements.filter(item => {
      const matchCat = selectedCategory === 'Tất cả' || item.category === selectedCategory
      const matchKey = !searchKeyword ||
        item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.content.toLowerCase().includes(searchKeyword.toLowerCase())
      return matchCat && matchKey
    })
  }, [announcements, selectedCategory, searchKeyword])

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'HỌC VỤ':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'LỊCH THI':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'HỌC BỔNG':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* 1. Portal Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-500/20">
              RE
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                HỌC VIỆN ĐÀO TẠO RIKKEI ACADEMY
              </h1>
              <p className="text-[11px] text-blue-600 font-semibold tracking-wide">
                CỔNG THÔNG TIN ĐÀO TẠO & QUẢN LÝ SINH VIÊN (EDUPORTAL)
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Phone size={14} className="text-blue-600" />
              Hotline: <strong className="text-slate-800">(024) 7300 6886</strong>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Mail size={14} className="text-blue-600" />
              Email: <strong className="text-slate-800">daotao@rikkei.edu.vn</strong>
            </span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-200">
              Năm học 2024 - 2025
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Body: Left Announcements Feed & Right Login Modal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ── LEFT SECTION: University Announcements Board (60 - 65%) ── */}
          <div className="flex-1 w-full space-y-5">
            {/* Board Title Banner */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Bảng Tin & Thông Báo Chung Của Học Viện
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cập nhật kế hoạch học vụ, lịch thi, học bổng và quy định mới nhất
                  </p>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm thông báo..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Announcements List */}
            {loadingAnnouncements ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-xs text-slate-500">Đang tải thông báo từ phòng Đào tạo...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center">
                <p className="text-xs text-slate-500">Không tìm thấy thông báo nào trong danh mục này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedArticle(item)}
                    className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all cursor-pointer group ${
                      item.isPinned ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Block */}
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0 group-hover:border-blue-300 transition-colors">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(item.createdAt).toLocaleDateString('vi-VN', { month: 'short' })}
                        </span>
                        <span className="text-lg font-extrabold text-blue-700 leading-none">
                          {new Date(item.createdAt).getDate()}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(item.createdAt).getFullYear()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadge(item.category)}`}>
                            {item.category}
                          </span>
                          {item.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Pin size={10} className="fill-amber-600" />
                              Ghim quan trọng
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium ml-auto hidden sm:inline">
                            {item.author || 'Phòng Đào tạo'}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>

                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Đăng lúc {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-xs">
                            Chi tiết <ChevronRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Links / Student Guides */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2 mb-3">
                <BookOpen size={15} />
                Cẩm nang & Quy định dành cho sinh viên
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <a
                  href="#guide-dang-ky"
                  onClick={(e) => { e.preventDefault(); alert('Cẩm nang hướng dẫn Đăng ký tín chỉ: Mở cổng từ 15/02 đến 28/02. Giới hạn tối đa 24 tín chỉ/học kỳ. Kiểm tra môn tiên quyết trước khi đăng ký.'); }}
                  className="bg-white p-3 rounded-xl border border-blue-100 font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-between shadow-2xs"
                >
                  <span>1. Hướng dẫn ĐK học phần</span>
                  <ExternalLink size={13} className="text-slate-400" />
                </a>
                <a
                  href="#guide-hoc-phi"
                  onClick={(e) => { e.preventDefault(); alert('Quy định Học phí: Đơn giá 450.000 VNĐ/tín chỉ. Hạn nộp cuối kỳ. Sinh viên có thể nộp qua VietQR hoặc thanh toán trực tiếp.'); }}
                  className="bg-white p-3 rounded-xl border border-blue-100 font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-between shadow-2xs"
                >
                  <span>2. Quy định đóng học phí</span>
                  <ExternalLink size={13} className="text-slate-400" />
                </a>
                <a
                  href="#guide-quy-che-thi"
                  onClick={(e) => { e.preventDefault(); alert('Quy chế phòng thi: Có mặt trước 15 phút. Bắt buộc mang Thẻ sinh viên hoặc CCCD. Cấm mang điện thoại vào phòng thi.'); }}
                  className="bg-white p-3 rounded-xl border border-blue-100 font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-between shadow-2xs"
                >
                  <span>3. Quy chế thi kết thúc môn</span>
                  <ExternalLink size={13} className="text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION: Login Modal Card (35 - 40%) ── */}
          <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Header of Login Card */}
              <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white text-center">
                <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-sm mb-2 shadow-inner">
                  <GraduationCap size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold">Đăng Nhập Hệ Thống</h2>
                <p className="text-xs text-blue-100 mt-1">
                  Dành cho Cán bộ, Giảng viên & Sinh viên
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Tên đăng nhập / Mã định danh
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User size={17} />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="sv2024001, gv001, admin..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock size={17} />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Vui lòng liên hệ Phòng Đào tạo (daotao@rikkei.edu.vn) để được cấp lại mật khẩu.')}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
                >
                  <span>{loading ? 'Đang xác thực tài khoản...' : 'Đăng Nhập'}</span>
                  <ArrowRight size={17} />
                </button>

                {/* Quick Account Switcher for Testers */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 mb-2 text-center uppercase tracking-wider">
                    Chọn nhanh tài khoản thử nghiệm (MK: 123456)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('sv2024001', '123456')}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition ${
                        username === 'sv2024001'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      Sinh viên
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('gv001', '123456')}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition ${
                        username === 'gv001'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      Giảng viên
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('admin', '123456')}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition ${
                        username === 'admin'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Hệ thống xác thực bảo mật chuẩn JWT SSO
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Học viện Công nghệ Rikkei Academy. Cổng đào tạo Rikkei EduPortal v1.0.0</span>
          <span className="text-slate-400">Bản quyền thuộc về Phòng Quản lý Đào tạo & Khảo thí</span>
        </div>
      </footer>

      {/* Article Detail Popup Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getCategoryBadge(selectedArticle.category)}`}>
                  {selectedArticle.category}
                </span>
                {selectedArticle.isPinned && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Pin size={12} className="fill-amber-600" /> Tin ghim
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto mt-4 pr-1 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-100 pb-3">
                <span>Người đăng: <strong className="text-slate-700">{selectedArticle.author || 'Phòng Đào tạo'}</strong></span>
                <span>•</span>
                <span>Ngày đăng: <strong className="text-slate-700">{new Date(selectedArticle.createdAt).toLocaleString('vi-VN')}</strong></span>
              </div>

              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed space-y-3">
                {selectedArticle.content}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Login
