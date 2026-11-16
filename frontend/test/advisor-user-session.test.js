import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock Storage implementation for Node.js environment
class MockStorage {
  constructor() {
    this.store = new Map()
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  }
  setItem(key, value) {
    this.store.set(key, String(value))
  }
  removeItem(key) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
  get length() {
    return this.store.size
  }
}

// Setup global mock storage before importing stores
const mockLocalStorage = new MockStorage()
const mockSessionStorage = new MockStorage()
globalThis.localStorage = mockLocalStorage
globalThis.sessionStorage = mockSessionStorage
globalThis.window = {
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
}

// Import stores and utilities
const {
  getAdvisorStorageKey,
  loadMessagesForUser,
  saveMessagesForUser,
  useAdvisorStore,
  DEFAULT_GREETING,
} = await import('../src/store/advisorStore.js')

const { useAuthStore } = await import('../src/store/authStore.js')

describe('Academic Advisor User Session Isolation Suite (SOLID & Multi-user Safety)', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    mockSessionStorage.clear()
    useAdvisorStore.getState().resetSession()
  })

  describe('1. Storage Key Derivation by User ID (Requirement 1: Phân tách theo User ID)', () => {
    it('generates distinct storage keys for different user IDs', () => {
      const keyUserA = getAdvisorStorageKey(4)
      const keyUserB = getAdvisorStorageKey(10)
      const keyUserC = getAdvisorStorageKey('sv2024001')

      assert.equal(keyUserA, 'eduportal_student_advisor_history_4')
      assert.equal(keyUserB, 'eduportal_student_advisor_history_10')
      assert.equal(keyUserC, 'eduportal_student_advisor_history_sv2024001')
      assert.notEqual(keyUserA, keyUserB)
    })

    it('extracts ID correctly when given a user object', () => {
      const userObj = { id: 4, username: 'sv2024001', fullName: 'Nguyễn Văn C' }
      const key = getAdvisorStorageKey(userObj)
      assert.equal(key, 'eduportal_student_advisor_history_4')
    })

    it('falls back to guest key when no user ID is provided', () => {
      assert.equal(getAdvisorStorageKey(null), 'eduportal_student_advisor_history_guest')
      assert.equal(getAdvisorStorageKey(undefined), 'eduportal_student_advisor_history_guest')
      assert.equal(getAdvisorStorageKey(''), 'eduportal_student_advisor_history_guest')
    })
  })

  describe('2. Data Isolation Between Users (Requirement 1 & 3)', () => {
    it('ensures User B does not see User A chat messages', () => {
      const userAId = 4
      const userBId = 10

      // User A chats with advisor
      const userAMessages = [
        DEFAULT_GREETING,
        { id: '1', role: 'user', content: 'Điểm CS201 của mình thế nào?' },
        { id: '2', role: 'assistant', content: 'Chào bạn Nguyễn Văn C, điểm của bạn là 8.78 (Điểm A).' },
      ]
      saveMessagesForUser(userAId, userAMessages)

      // Verify User A history is saved under key 4
      const loadedForA = loadMessagesForUser(userAId)
      assert.equal(loadedForA.length, 3)
      assert.ok(loadedForA[2].content.includes('Nguyễn Văn C'))

      // User B loads history -> must NOT see User A's data, should see default greeting
      const loadedForB = loadMessagesForUser(userBId)
      assert.equal(loadedForB.length, 1)
      assert.equal(loadedForB[0].id, 'greeting')
      assert.ok(!loadedForB[0].content.includes('Nguyễn Văn C'))
    })
  })

  describe('3. In-memory State Reset on Logout (Requirement 2: Reset state khi Logout)', () => {
    it('resets in-memory messages on logout while preserving localStorage data', () => {
      const userAId = 4
      const userAMessages = [
        DEFAULT_GREETING,
        { id: '101', role: 'user', content: 'Tư vấn tín chỉ' },
        { id: '102', role: 'assistant', content: 'Chào Nguyễn Văn C, bạn được đăng ký tối đa 24 tín chỉ.' },
      ]

      // Login User A and store messages
      useAdvisorStore.getState().loadUserHistory(userAId)
      saveMessagesForUser(userAId, userAMessages)
      useAdvisorStore.setState({ messages: userAMessages })

      assert.equal(useAdvisorStore.getState().messages.length, 3)
      assert.equal(useAdvisorStore.getState().currentUserId, userAId)

      // Trigger logout via authStore
      useAuthStore.getState().logout()

      // 1. In-memory state of current session must be reset to greeting
      assert.equal(useAdvisorStore.getState().messages.length, 1)
      assert.equal(useAdvisorStore.getState().messages[0].id, 'greeting')
      assert.equal(useAdvisorStore.getState().currentUserId, null)

      // 2. CRITICAL: User A's history in localStorage must NOT be deleted
      const savedAInStorage = mockLocalStorage.getItem(getAdvisorStorageKey(userAId))
      assert.ok(savedAInStorage, 'User A data should still exist in localStorage after logout')
      const parsed = JSON.parse(savedAInStorage)
      assert.equal(parsed.length, 3)
      assert.ok(parsed[2].content.includes('Nguyễn Văn C'))
    })
  })

  describe('4. Account Switching & Session Sync (Requirement 3: Đồng bộ khi đổi tài khoản)', () => {
    it('restores correct history when switching back and forth between accounts', () => {
      const userAId = 4
      const userBId = 10

      const msgsA = [
        DEFAULT_GREETING,
        { id: 'a1', role: 'user', content: 'Hỏi môn CS201' },
        { id: 'a2', role: 'assistant', content: 'Chào Nguyễn Văn C...' },
      ]

      const msgsB = [
        DEFAULT_GREETING,
        { id: 'b1', role: 'user', content: 'Hỏi môn AI' },
        { id: 'b2', role: 'assistant', content: 'Chào Nguyễn Sơn Minh...' },
      ]

      saveMessagesForUser(userAId, msgsA)
      saveMessagesForUser(userBId, msgsB)

      // Switch to User B (Nguyễn Sơn Minh)
      useAdvisorStore.getState().loadUserHistory(userBId)
      assert.equal(useAdvisorStore.getState().currentUserId, userBId)
      assert.ok(useAdvisorStore.getState().messages[2].content.includes('Nguyễn Sơn Minh'))
      assert.ok(!useAdvisorStore.getState().messages[2].content.includes('Nguyễn Văn C'))

      // Switch back to User A (Nguyễn Văn C)
      useAdvisorStore.getState().loadUserHistory(userAId)
      assert.equal(useAdvisorStore.getState().currentUserId, userAId)
      assert.ok(useAdvisorStore.getState().messages[2].content.includes('Nguyễn Văn C'))
      assert.ok(!useAdvisorStore.getState().messages[2].content.includes('Nguyễn Sơn Minh'))
    })
  })

  describe('5. Clear History action isolation', () => {
    it('clearHistory() only purges the active user storage, leaving other users untouched', () => {
      const userAId = 4
      const userBId = 10

      saveMessagesForUser(userAId, [{ id: '1', role: 'user', content: 'User A note' }])
      saveMessagesForUser(userBId, [{ id: '2', role: 'user', content: 'User B note' }])

      // User A clears history
      useAdvisorStore.getState().loadUserHistory(userAId)
      useAdvisorStore.getState().clearHistory()

      // User A storage is purged
      assert.equal(mockLocalStorage.getItem(getAdvisorStorageKey(userAId)), null)
      assert.equal(useAdvisorStore.getState().messages.length, 1)

      // User B storage is completely preserved!
      const userBData = mockLocalStorage.getItem(getAdvisorStorageKey(userBId))
      assert.ok(userBData)
      assert.ok(userBData.includes('User B note'))
    })
  })
})
