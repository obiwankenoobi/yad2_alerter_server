const { getAllUsers } = require('../services/crawler')
const { User, Search } = require('../mocks/mongoose.mock')

describe('Testing mock mongoose', () => {
  test('getting all users from database', () => {
    User.find((e, docs) => {
      expect(Array.isArray(docs)).toBe(true)
    })
  })
  test('getting search by query from databack', () => {
    const hash = '2363238414'
    Search.findOne({ hash }, (e, search) => {
      expect(typeof search).toBe('object')
      expect(search.url).toBe('https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=205&rooms=1-3&price=0-4000')
      expect(typeof search.searches).toBe('object')
    })
  })
})