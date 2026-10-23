// Danh sách ảnh chụp thực tế Go Yoon Jung từ Pinterest
export const REAL_AVATARS = [
  '/images/avatars/gyj-1.jpg',
  '/images/avatars/gyj-2.jpg',
  '/images/avatars/gyj-3.jpg',
  '/images/avatars/gyj-4.jpg',
  '/images/avatars/gyj-5.jpg',
  '/images/avatars/gyj-6.jpg',
  '/images/avatars/gyj-7.jpg',
  '/images/avatars/gyj-8.jpg',
  '/images/avatars/gyj-9.jpg',
  '/images/avatars/gyj-10.jpg',
  '/images/avatars/gyj-11.jpg',
  '/images/avatars/gyj-12.jpg',
  '/images/avatars/gyj-13.jpg',
  '/images/avatars/gyj-14.jpg',
  '/images/avatars/gyj-15.jpg',
]

/**
 * Trả về ảnh chân dung thực tế ngẫu nhiên nhưng ổn định (deterministic hash) theo mã SV/GV/username
 * Tuyệt đối không dùng avatar AI/robot
 */
export const getRealAvatar = (identifier = '') => {
  if (!identifier) return REAL_AVATARS[0]

  if (typeof identifier === 'object') {
    if (identifier.avatarUrl && 
        !identifier.avatarUrl.includes('dicebear') && 
        !identifier.avatarUrl.includes('bottts') && 
        !identifier.avatarUrl.includes('api.dicebear.com')) {
      return identifier.avatarUrl
    }
    identifier = identifier.username || identifier.email || identifier.fullName || identifier.studentCode || identifier.lecturerCode || identifier.id || 'user'
  }

  let hash = 0
  const str = String(identifier)
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % REAL_AVATARS.length
  return REAL_AVATARS[index]
}
