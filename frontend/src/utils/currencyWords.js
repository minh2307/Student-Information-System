// Hàm chuyển đổi số tiền thành chữ Tiếng Việt chuẩn theo văn bản kế toán tài chính
const defaultUnits = ['', 'nghìn', 'triệu', 'tỷ']
const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

function readThreeDigits(threeDigits, isFull) {
  const hundreds = Math.floor(threeDigits / 100)
  const tens = Math.floor((threeDigits % 100) / 10)
  const units = threeDigits % 10
  let result = ''

  if (isFull || hundreds > 0) {
    result += digits[hundreds] + ' trăm '
  }

  if (tens > 1) {
    result += digits[tens] + ' mươi '
    if (units === 1) result += 'mốt '
    else if (units === 5) result += 'lăm '
    else if (units > 0) result += digits[units] + ' '
  } else if (tens === 1) {
    result += 'mười '
    if (units === 1) result += 'một '
    else if (units === 5) result += 'lăm '
    else if (units > 0) result += digits[units] + ' '
  } else {
    if (isFull && units > 0) result += 'lẻ '
    if (units > 0) result += digits[units] + ' '
  }

  return result
}

export function numberToVietnameseWords(num) {
  if (!num || isNaN(num) || num === 0) return 'Không đồng'
  let n = Math.abs(Math.round(num))
  const groups = []
  while (n > 0) {
    groups.push(n % 1000)
    n = Math.floor(n / 1000)
  }

  let result = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    if (group > 0) {
      const isFull = i < groups.length - 1
      result += readThreeDigits(group, isFull) + defaultUnits[i] + ' '
    }
  }

  result = result.trim().replace(/\s+/g, ' ')
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.'
}

export default numberToVietnameseWords
