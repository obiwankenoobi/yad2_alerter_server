const { errorCheckHandler } = require('../models/alerts')

describe('Checking {alerts}', () => {
  test('{errorCheckHandler} should return array with 2 errors', () => {
    const alert = {
      fromPrice: { value: 1000 },
      toPrice: { value: 500 },
      fromRooms: { value: 10 },
      toRooms: { value: 5 }
    }
    const errors = errorCheckHandler(alert)
    console.log('errors', errors)
    expect(Array.isArray(errors)).toBe(true)
  })
})