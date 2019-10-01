const { 
  readLinks, 
  getAllUsers,
} = require('../services/database/mongoFactory')
const { User, Search } = require('../mocks/mongoose.mock')

describe('Testing {mongoFactory}', () => {
  test('{readLinks} should return links from {Search} based on a given hash and state', async () => {
    const readLinksWithSchema = readLinks(Search)
    const oldLinks = await readLinksWithSchema('2363238414', 'old')
    expect(Array.isArray(oldLinks)).toBe(true)
  })
  test('{getAllUsers} expect to return an array of users', async () => {
    const users = await getAllUsers(User)
    expect(Array.isArray(users)).toBe(true)
  })
})