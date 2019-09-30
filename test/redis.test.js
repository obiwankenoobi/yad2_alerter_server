const redisFactory = require('../services/redis/redisFactory')
const Redis = require('../mocks/redis.mock')
const { User, Search } = require('../mocks/mongoose.mock')
const { 
  getNewLinks,
} = require('../services/crawler')
const { getAllUsers } = require('../services/database/mongoFactory')()

describe('{redisFactory}', () => {
  const redis = new Redis()
  const { 
    getSearchResultsHashFromRedis, 
    addSearchResultHashToRedis,
    getHashes,
    addRedis,
    updateAlertInRedis
  } = redisFactory(redis)
  test('{factory} should return object with all redis related methods', () => {
    expect(typeof getSearchResultsHashFromRedis).toBe('function')
    expect(typeof addSearchResultHashToRedis).toBe('function')
    expect(typeof getHashes).toBe('function')
  })

  const urlHash = '2626769505'
  test('{addSearchResultHashToRedis} should add hash of results to redis', async () => {
    const newHashedResults = '6046e67a6986462c2e9377fa8e274981c9d19050'
    const newSearchesLength = 25
    const url = 'https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000'
    const hashed = await addSearchResultHashToRedis(urlHash, newHashedResults, newSearchesLength, url)
    expect(typeof hashed).toBe('object')
  })
  test('{getSearchResultsHashFromRedis} should return object with hash of results, url and length', async () => {
    const { 
      searchedResultHash,
      length,
      url
     } = await getSearchResultsHashFromRedis(urlHash)
    expect(url).toBe('https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000')
    expect(length).toBe(25)
    expect(searchedResultHash).toBe('6046e67a6986462c2e9377fa8e274981c9d19050')
  })
  test('{getHashes} should create and return object with search hashes linked to user emails', async () => {
    const redis = new Redis()
    const users = await getAllUsers(User)
    const hashes = await getHashes(users)
    expect(typeof hashes).toBe('object')
  })
})