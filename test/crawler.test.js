const { 
  getAllUsers,
  urlBuilder,
  addNewSearch,
  readLinks,
  getNewLinks,
  getHashes,
  addSearchResultHashToRedis,
  getSearchResultsHashFromRedis
} = require('../services/crawler')
const { User, Search } = require('./mongoose.mock')
const urlParser = require('query-string')
const randomstring = require("randomstring")
const Redis = require('./redis.mock')

describe('Testing crawler', () => {
  test('{getAllUsers} expect to return an array of users', async () => {
    const users = await getAllUsers(User)
    expect(Array.isArray(users)).toBe(true)
  })
  test('{urlBuilder} expect to returns {UrlObject} with new url and hash of the url', () => {
    const config = {
      neighborhood: '205',
      fromPrice: '1000',
      toPrice: '4000',
      fromRooms: '1',
      toRooms: '3',
      //ignoreAgencies:true
    }
    const { url, hash } = urlBuilder(config)
    expect(typeof url).toBe('string')
    expect(typeof hash).toBe('string')

    const parsedUrl = urlParser.parse(url)
    expect(parsedUrl.neighborhood).toBe('205')
    expect(parsedUrl.price.split('-')[0]).toBe('1000')
    expect(parsedUrl.price.split('-')[1]).toBe('4000')
    expect(parsedUrl.rooms.split('-')[0]).toBe('1')
    expect(parsedUrl.rooms.split('-')[1]).toBe('3')
  })
  test('{readLinks} should return links from {Search} based on a given hash and state', async () => {
    const readLinksWithSchema = readLinks(Search)
    const oldLinks = await readLinksWithSchema('2363238414', 'old')
    expect(Array.isArray(oldLinks)).toBe(true)
  })
  test('{getNewLinks} should return new links based on two given array', () => {
    const prevLinks = Array(20).fill(null).map(i => `https://www.yad2.co.il/s/c/${ randomstring.generate({ length: 6 }) }`)
    const currentLinks = [...prevLinks, `https://www.yad2.co.il/s/c/${ randomstring.generate({ length: 6 }) }`]
    const found = getNewLinks(prevLinks, currentLinks)
    expect(found.length).toBe(1)
  })
  test('{getHashes} should create and return object with search hashes linked to user emails', async () => {
    const redis = new Redis()
    const users = await getAllUsers(User)
    const hashes = await getHashes(redis, users)
    expect(typeof hashes).toBe('object')
  })

  const redis = new Redis()
  const urlHash = '2626769505'
  test('{addSearchResultHashToRedis} should add hash of results to redis', async () => {
    const newHashedResults = '6046e67a6986462c2e9377fa8e274981c9d19050'
    const newSearchesLength = 25
    const url = 'https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000'
    const hashed = await addSearchResultHashToRedis(redis, urlHash, newHashedResults, newSearchesLength, url)
    expect(typeof hashed).toBe('object')
  })
  test('{getSearchResultsHashFromRedis} should return object with hash of results, url and length', async () => {
    const { 
      searchedResultHash,
      length,
      url
     } = await getSearchResultsHashFromRedis(redis, urlHash)
    expect(url).toBe('https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000')
    expect(length).toBe(25)
    expect(searchedResultHash).toBe('6046e67a6986462c2e9377fa8e274981c9d19050')
  })
})