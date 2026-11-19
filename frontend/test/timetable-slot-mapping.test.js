import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')

describe('Timetable Slot Mapping & Anti-Duplicate Verification Suite', () => {
  const studentTimetablePath = path.join(frontendDir, 'src', 'pages', 'StudentTimetable.jsx')
  const lecturerTimetablePath = path.join(frontendDir, 'src', 'pages', 'LecturerTimetable.jsx')
  const optimizerModalPath = path.join(frontendDir, 'src', 'components', 'ScheduleOptimizerModal.jsx')

  const studentContent = fs.readFileSync(studentTimetablePath, 'utf8')
  const lecturerContent = fs.readFileSync(lecturerTimetablePath, 'utf8')
  const optimizerContent = fs.readFileSync(optimizerModalPath, 'utf8')

  describe('1. Code Structure & Anti-Duplicate Contract', () => {
    test('StudentTimetable.jsx defines getSlotForClass and uses it in getClassesForSlot', () => {
      assert.ok(studentContent.includes('export const getSlotForClass'), 'Must export getSlotForClass')
      assert.ok(studentContent.includes('getSlotForClass(item) === slot.id'), 'Must filter by unique slot ID')
      // Ensure the old buggy overlap formula is removed
      assert.ok(!studentContent.includes('startF >= slot.startHour - 0.5 && startF < slot.endHour'), 'Buggy slot condition must be removed')
    })

    test('LecturerTimetable.jsx defines getSlotForClass and uses it in getClassesForSlot', () => {
      assert.ok(lecturerContent.includes('export const getSlotForClass'), 'Must export getSlotForClass')
      assert.ok(lecturerContent.includes('getSlotForClass(item) === slot.id'), 'Must filter by unique slot ID')
      assert.ok(!lecturerContent.includes('startF >= slot.startHour - 0.5 && startF < slot.endHour'), 'Buggy slot condition must be removed')
    })

    test('ScheduleOptimizerModal.jsx defines getPeriodForSection and maps to unique period ID', () => {
      assert.ok(optimizerContent.includes('getPeriodForSection'), 'Must define getPeriodForSection')
      assert.ok(optimizerContent.includes('getPeriodForSection(sec) === period.id'), 'Must filter by unique period ID')
    })
  })

  describe('2. Behavioral Accuracy of getSlotForClass Algorithm', () => {
    const TIME_SLOTS = [
      { id: 1, name: 'Ca 1 (Sáng sớm)', period: 'Tiết 1 - 3', time: '07:00 - 09:15', startHour: 7, endHour: 9.25 },
      { id: 2, name: 'Ca 2 (Sáng chính)', period: 'Tiết 4 - 6', time: '09:30 - 11:45', startHour: 9.5, endHour: 11.75 },
      { id: 3, name: 'Ca 3 (Chiều sớm)', period: 'Tiết 7 - 9', time: '13:00 - 15:15', startHour: 13, endHour: 15.25 },
      { id: 4, name: 'Ca 4 (Chiều muộn)', period: 'Tiết 10 - 12', time: '15:30 - 17:45', startHour: 15.5, endHour: 17.75 },
      { id: 5, name: 'Ca 5 (Tối)', period: 'Tiết 13 - 15', time: '18:00 - 20:15', startHour: 18, endHour: 20.25 },
    ]

    const timeStringToFloat = (tStr) => {
      if (!tStr) return 0
      const parts = tStr.split(':')
      return parseFloat(parts[0]) + parseFloat(parts[1] || 0) / 60
    }

    const getSlotForClass = (item) => {
      if (!item || !item.startTime) return null
      const startF = timeStringToFloat(item.startTime)
      let endF = timeStringToFloat(item.endTime)
      if (!endF || endF <= startF) {
        endF = startF + 1.5
      }

      let bestSlotId = null
      let maxOverlap = -1

      for (const slot of TIME_SLOTS) {
        const overlapStart = Math.max(startF, slot.startHour)
        const overlapEnd = Math.min(endF, slot.endHour)
        const overlap = Math.max(0, overlapEnd - overlapStart)

        if (overlap > maxOverlap) {
          maxOverlap = overlap
          bestSlotId = slot.id
        }
      }

      if (maxOverlap > 0) {
        return bestSlotId
      }

      const midPoint = (startF + endF) / 2
      let minDistance = Infinity
      for (const slot of TIME_SLOTS) {
        const slotMid = (slot.startHour + slot.endHour) / 2
        const dist = Math.abs(midPoint - slotMid)
        if (dist < minDistance) {
          minDistance = dist
          bestSlotId = slot.id
        }
      }

      return bestSlotId || 1
    }

    test('CS201 (09:00 - 10:30) maps exclusively to Ca 2 (Slot 2) and NOT Ca 1 (Slot 1)', () => {
      const cs201 = { courseCode: 'CS201', startTime: '09:00', endTime: '10:30', dayOfWeek: 'MON' }
      const slotId = getSlotForClass(cs201)
      assert.strictEqual(slotId, 2, 'CS201 must be mapped to Ca 2 (Sáng chính)')
    })

    test('CS301 (07:30 - 09:00) maps exclusively to Ca 1 (Slot 1)', () => {
      const cs301 = { courseCode: 'CS301', startTime: '07:30', endTime: '09:00', dayOfWeek: 'TUE' }
      const slotId = getSlotForClass(cs301)
      assert.strictEqual(slotId, 1, 'CS301 must be mapped to Ca 1 (Sáng sớm)')
    })

    test('CS401 (13:30 - 15:00) maps exclusively to Ca 3 (Slot 3)', () => {
      const cs401 = { courseCode: 'CS401', startTime: '13:30', endTime: '15:00', dayOfWeek: 'WED' }
      const slotId = getSlotForClass(cs401)
      assert.strictEqual(slotId, 3, 'CS401 must be mapped to Ca 3 (Chiều sớm)')
    })

    test('SEC301 (14:45 - 16:15) maps exclusively to Ca 4 (Slot 4) and NOT Ca 3', () => {
      const sec301 = { courseCode: 'SEC301', startTime: '14:45', endTime: '16:15', dayOfWeek: 'MON' }
      const slotId = getSlotForClass(sec301)
      assert.strictEqual(slotId, 4, 'SEC301 must be mapped to Ca 4 (Chiều muộn)')
    })

    test('Evening class (18:00 - 20:15) maps to Ca 5 (Slot 5)', () => {
      const eveningClass = { courseCode: 'EVN101', startTime: '18:00', endTime: '20:15', dayOfWeek: 'FRI' }
      const slotId = getSlotForClass(eveningClass)
      assert.strictEqual(slotId, 5, 'Evening class must be mapped to Ca 5 (Tối)')
    })

    test('All 5 student courses on timetable map to exactly 1 slot each without duplicates', () => {
      const studentTimetable = [
        { courseCode: 'CS201', dayOfWeek: 'MON', startTime: '09:00', endTime: '10:30' },
        { courseCode: 'SEC301', dayOfWeek: 'MON', startTime: '14:45', endTime: '16:15' },
        { courseCode: 'CS301', dayOfWeek: 'TUE', startTime: '07:30', endTime: '09:00' },
        { courseCode: 'CS401', dayOfWeek: 'WED', startTime: '13:30', endTime: '15:00' },
        { courseCode: 'CS405', dayOfWeek: 'FRI', startTime: '07:30', endTime: '09:00' },
      ]

      // On Monday, there should be exactly 2 matched courses across all 5 slots
      const monClassesInSlots = TIME_SLOTS.flatMap(slot => 
        studentTimetable.filter(item => item.dayOfWeek === 'MON' && getSlotForClass(item) === slot.id)
      )
      assert.strictEqual(monClassesInSlots.length, 2, 'Monday must contain exactly 2 classes across all slots')
      assert.strictEqual(monClassesInSlots[0].courseCode, 'CS201')
      assert.strictEqual(monClassesInSlots[1].courseCode, 'SEC301')

      // Verify slot 1 on Monday has 0 classes
      const monSlot1 = studentTimetable.filter(item => item.dayOfWeek === 'MON' && getSlotForClass(item) === 1)
      assert.strictEqual(monSlot1.length, 0, 'Monday Slot 1 (Ca 1) must be empty')

      // Verify slot 2 on Monday has CS201
      const monSlot2 = studentTimetable.filter(item => item.dayOfWeek === 'MON' && getSlotForClass(item) === 2)
      assert.strictEqual(monSlot2.length, 1, 'Monday Slot 2 (Ca 2) must have CS201')

      // Verify slot 4 on Monday has SEC301
      const monSlot4 = studentTimetable.filter(item => item.dayOfWeek === 'MON' && getSlotForClass(item) === 4)
      assert.strictEqual(monSlot4.length, 1, 'Monday Slot 4 (Ca 4) must have SEC301')
    })
  })
})
