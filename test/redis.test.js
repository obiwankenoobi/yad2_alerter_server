const RedisFactory = require('../services/redis/redisFactory')
const Redis = require('../mocks/redis.mock')
const { User, Search } = require('../mocks/mongoose.mock')
const { print } = require('../utils/utils')
const { 
  getNewLinks,
} = require('../services/crawler')
const { getAllUsers } = require('../services/database/mongoFactory')

describe('{redisFactory}', () => {
  const redis = new Redis()
  const redisFactory = new RedisFactory(redis)
  test('{factory} should return object with all redis related methods', () => {
    expect(typeof redisFactory.getSearchResultsHashFromRedis).toBe('function')
    expect(typeof redisFactory.addSearchResultHashToRedis).toBe('function')
    expect(typeof redisFactory.getHashes).toBe('function')
  })

  const urlHash = '2626769505'
  test('{addSearchResultHashToRedis} should add hash of results to redis', async () => {
    const newHashedResults = '6046e67a6986462c2e9377fa8e274981c9d19050'
    const newSearchesLength = 25
    const url = 'https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000'
    const searchResultHashObj = {
      hash: urlHash,
      newHashedResults,
      newSearchesLength,
      url
    }
    const hashed = await redisFactory.addSearchResultHashToRedis(searchResultHashObj)
    expect(typeof hashed).toBe('object')
  })
  test('{getSearchResultsHashFromRedis} should return object with hash of results, url and length', async () => {
    const { 
      searchedResultHash,
      length,
      url
     } = await redisFactory.getSearchResultsHashFromRedis(urlHash)
    expect(url).toBe('https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000')
    expect(length).toBe(25)
    expect(searchedResultHash).toBe('6046e67a6986462c2e9377fa8e274981c9d19050')
  })
  test('{getHashes} should create and return object with search hashes linked to user emails', async () => {
    const redis = new Redis()
    const users = await getAllUsers(User)
    const hashes = await redisFactory.getHashes(users)
    expect(typeof hashes).toBe('object')
  })
  test('{updateAlertInRedis} should add new alert to redis', async () => {
    const hashes = {
      "2084409008": {
        "url": "https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=205&rooms=1-5.5&price=0-3000",
        "emails": {
          "artium1@gmail.com": true
        }
      },
      "2626769505": {
        "url": "https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000",
        "emails": {
          "artium1@gmail.com": true
        }
      },
      "3488252183": {
        "url": "https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=205&rooms=1-5.5&price=0-1500",
        "emails": {
          "artium1@gmail.com": true
        }
      }
    }
    const email = 'artium1new@gmail.com'
    const url = 'https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000'
    const urlHash = '3488252153'
    const alertObj = {
      hash: urlHash,
      hashes,
      email,
      url
    }
    const nextHashes = 
      await redisFactory.updateAlertInRedis(alertObj)
      
    expect(typeof nextHashes).toBe('object')
    expect(nextHashes[urlHash]['url']).toBe(url)
    expect(nextHashes[urlHash]['emails'][email]).toBe(true)
  })
})