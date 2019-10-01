const { 
  urlBuilder,
  addNewSearch,
  getNewLinks,
} = require('../services/crawler')
const urlParser = require('query-string')
const randomstring = require("randomstring")
const Redis = require('../mocks/redis.mock')

describe('Testing crawler', () => {
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

  test('{getNewLinks} should return new links based on two given array', () => {
    const prevLinks = Array(20).fill(null).map(i => `https://www.yad2.co.il/s/c/${ randomstring.generate({ length: 6 }) }`)
    const currentLinks = [...prevLinks, `https://www.yad2.co.il/s/c/${ randomstring.generate({ length: 6 }) }`]
    const found = getNewLinks(prevLinks, currentLinks)
    expect(found.length).toBe(1)
  })
})