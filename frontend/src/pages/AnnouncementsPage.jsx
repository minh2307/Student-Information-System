import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import {
  Bell,
  Pin,
  Calendar,
  Search,
  Filter,
  Plus,
  Trash2,
  BookOpen,
  Award,
  Sparkles,
  ChevronRight,
  User,
  CheckCircle2
} from 'lucide-react'

const CATEGORIES = ['Tất cả', 'HỌC VỤ', 'LỊCH THI', 'HỌC BỔNG', 'HOẠT ĐỘNG']

export const AnnouncementsPage = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state for creating
  const [formData, setFormData] = useState({
    title: '',
    category: 'HỌC VỤ',
    content: '',
    author: 'Phòng Đào tạo',
    isPinned: false
  })

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await api.get('/announcements')
      if (res.data?.data) {
        setAnnouncements(res.data.data)
      }
    } catch (err) {
      console.error('Lỗi tải bảng tin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.title || !formData.content) {
      alert('Vui lòng nhập tiêu đề và nội dung thông báo!')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/announcements', formData)
      setShowCreateModal(false)
      setFormData({
        title: '',
        category: 'HỌC VỤ',
        content: '',
        author: 'Phòng Đào tạo',
        isPinned: false
      })
      fetchAnnouncements()
    } catch (err) {
      alert('Không thể tạo thông báo: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thông báo: "${title}"?`)) return
    try {
      await api.delete(`/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert('Không thể xóa thông báo: ' + (err.response?.data?.message || err.message))
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Bảng Tin & Thông Báo Đào Tạo</h1>
            <p className="text-xs text-slate-500">Tin tức học vụ, lịch thi, học bổng và các sự kiện chung của nhà trường</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus size={16} />
            <span>Đăng thông báo mới</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Đang tải bảng tin thông báo...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
          <p className="text-sm text-slate-500">Không tìm thấy thông báo nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedArticle(item)}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                item.isPinned ? 'border-amber-300 bg-amber-50/15' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadge(item.category)}`}>
                      {item.category}
                    </span>
                    {item.isPinned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Pin size={11} className="fill-amber-600" />
                        Ghim
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <User size={13} className="text-slate-400" />
                  {item.author || 'Phòng Đào tạo'}
                </span>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id, item.title)
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                      title="Xóa thông báo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <span className="font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Đọc tiếp <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
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
                <span>Người đăng: <strong className="text-slate-700">{selectedArticle.author}</strong></span>
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

      {/* Admin Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Đăng Thông Báo Học Vụ Mới</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề thông báo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề thông báo..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Danh mục *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="HỌC VỤ">HỌC VỤ</option>
                    <option value="LỊCH THI">LỊCH THI</option>
                    <option value="HỌC BỔNG">HỌC BỔNG</option>
                    <option value="HOẠT ĐỘNG">HOẠT ĐỘNG</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn vị ban hành</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung chi tiết *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Nhập nội dung đầy đủ của thông báo..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pinCheck" className="font-semibold text-slate-700 cursor-pointer">
                  Ghim thông báo lên đầu trang
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm"
                >
                  {submitting ? 'Đang lưu...' : 'Đăng bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
