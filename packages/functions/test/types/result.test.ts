import { success, failure, Result } from '../../src/types/result'

describe('Result', () => {
  describe('Success', () => {
    it('should create a successful result', () => {
      const result = success('test-value')
      expect(result._tag).toBe('Success')
      expect(result.value).toBe('test-value')
      expect(result.isSuccess()).toBe(true)
      expect(result.isFailure()).toBe(false)
    })

    it('should return value when matched with onSuccess', () => {
      const result = success('test-value')
      const value = result.match({
        onSuccess: (val) => val.toUpperCase(),
        onFailure: () => 'error',
      })
      expect(value).toBe('TEST-VALUE')
    })

    it('should return default value when matched with onFailure', () => {
      const result = success('test-value')
      const value = result.match({
        onSuccess: () => 'success',
        onFailure: () => 'error',
      })
      expect(value).toBe('success')
    })
  })

  describe('Failure', () => {
    it('should create a failure result', () => {
      const error = new Error('test-error')
      const result = failure(error)
      expect(result._tag).toBe('Failure')
      expect(result.error).toBe(error)
      expect(result.isSuccess()).toBe(false)
      expect(result.isFailure()).toBe(true)
    })

    it('should return error when matched with onFailure', () => {
      const error = new Error('test-error')
      const result = failure(error)
      const value = result.match({
        onSuccess: () => 'success',
        onFailure: (err) => err.message,
      })
      expect(value).toBe('test-error')
    })

    it('should return default value when matched with onSuccess', () => {
      const error = new Error('test-error')
      const result = failure(error)
      const value = result.match({
        onSuccess: () => 'success',
        onFailure: () => 'error',
      })
      expect(value).toBe('error')
    })
  })

  describe('Type guards', () => {
    it('should correctly identify Success type', () => {
      const successResult = success('test')
      const failureResult = failure(new Error('test'))

      if (successResult.isSuccess()) {
        expect(successResult.value).toBeDefined()
      }

      if (failureResult.isFailure()) {
        expect(failureResult.error).toBeDefined()
      }
    })
  })
})