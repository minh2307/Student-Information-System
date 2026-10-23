import React, { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { toast } from '../store/toastStore'
import { confirmDialog } from '../store/confirmStore'
import {
  Bell,
  Pin,
  Calendar,
  Search,
  Filter,
  Plus,
  Trash2,
  BookOpen,
  ChevronRight,
  User,
  ShieldCheck,
  FileText
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
      toast.warning('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/announcements', formData)
      toast.success('Đã đăng tải thông báo mới thành công!')
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
      toast.error('Không thể tạo thông báo: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, title) => {
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa thông báo',
      message: `Bạn có chắc chắn muốn xóa bản tin thông báo:\n"${title}"?\nThao tác này sẽ gỡ bài viết khỏi bảng tin của học viện.`,
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await api.delete(`/announcements/${id}`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success(`Đã xóa thông báo "${title}" thành công!`)
    } catch (err) {
      toast.error('Không thể xóa thông báo: ' + (err.response?.data?.message || err.message))
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
        return 'bg-red-50 text-red-800 border-red-200'
      case 'LỊCH THI':
        return 'bg-stone-100 text-stone-800 border-stone-300'
      case 'HỌC BỔNG':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Gazette Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Học Viện Công Nghệ Rikkei • Văn Phòng Quản Lý Đào Tạo
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Bản Tin Công Báo & Văn Bản Đào Tạo Học Viện
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Thông tin kế hoạch đào tạo, công văn học vụ, lịch xét tốt nghiệp và học bổng
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold transition shadow-2xs"
          >
            <Plus size={15} />
            <span>Ban hành công văn mới</span>
          </button>
        )}
      </div>

      {/* 2. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tra cứu công văn..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
          />
        </div>
      </div>

      {/* 3. Content List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-stone-200/90 text-center">
          <div className="inline-block w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-stone-600">Đang tải danh sách công văn học viện...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-300 text-center">
          <p className="text-xs text-stone-600">Không tìm thấy thông báo nào trong danh mục này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedArticle(item)}
              className={`bg-white rounded-2xl border p-5 shadow-2xs hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between group ${
                item.isPinned ? 'border-stone-300 bg-stone-50/40' : 'border-stone-200/90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getCategoryBadge(item.category)}`}>
                      {item.category}
                    </span>
                    {item.isPinned && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        <Pin size={10} className="fill-stone-600" />
                        KHẨN
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-stone-500 mb-1">
                  Số: {100 + Number(item.id)}/TB-ĐT
                </div>

                <h3 className="font-bold text-stone-900 text-sm group-hover:text-red-800 transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-xs text-stone-600 mt-1.5 line-clamp-3 leading-relaxed">
                  {item.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <User size={13} className="text-stone-400" />
                  {item.author || 'Phòng Đào tạo'}
                </span>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id, item.title)
                      }}
                      className="p-1.5 rounded text-red-700 hover:bg-red-50 transition"
                      title="Xóa công văn"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <span className="font-semibold text-red-700 group-hover:text-red-900 flex items-center gap-0.5 text-xs">
                    Chi tiết <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal View Detail */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${getCategoryBadge(selectedArticle.category)}`}>
                  {selectedArticle.category}
                </span>
                {selectedArticle.isPinned && (
                  <span className="text-xs font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    Công văn khẩn
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto mt-4 pr-1 space-y-4">
              <div className="text-[11px] font-mono text-stone-500">
                Số: {100 + Number(selectedArticle.id)}/TB-ĐT
              </div>
              <h2 className="text-lg font-bold text-stone-900 leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-stone-500 border-b border-stone-100 pb-3 font-mono">
                <span>Ban hành: <strong className="text-stone-800">{selectedArticle.author || 'Phòng Đào tạo'}</strong></span>
                <span>•</span>
                <span>Ngày: <strong className="text-stone-800">{new Date(selectedArticle.createdAt).toLocaleString('vi-VN')}</strong></span>
              </div>

              <div className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {selectedArticle.content}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Announcement (Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-wider">
                Ban Hành Công Văn / Thông Báo Đào Tạo
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">
                  Tiêu đề công văn / Thông báo
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="V/v: Lịch thi học kỳ II năm học 2024 - 2025..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">
                    Phân loại danh mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-red-700"
                  >
                    <option value="HỌC VỤ">HỌC VỤ</option>
                    <option value="LỊCH THI">LỊCH THI</option>
                    <option value="HỌC BỔNG">HỌC BỔNG</option>
                    <option value="HOẠT ĐỘNG">HOẠT ĐỘNG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">
                    Đơn vị ban hành
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1 uppercase">
                  Nội dung chi tiết công văn
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Căn cứ theo kế hoạch năm học, Ban Đào tạo thông báo..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-stone-300 text-red-700"
                />
                <label htmlFor="pinCheck" className="text-xs font-medium text-stone-700 cursor-pointer">
                  Đánh dấu công văn khẩn (Ghim lên đầu bảng tin)
                </label>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition shadow-2xs"
                >
                  {submitting ? 'Đang lưu...' : 'Ban hành'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnouncementsPage
