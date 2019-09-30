const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const hashFunc = require('object-hash')
const _ = require('lodash')

const { User } = require('../db/models/UserSchema')
const { Search } = require('../db/models/SearchesSchema')
const { createUrl, print } = require('../utils/utils')
const sendEmail = require('./sendEmail')


/**
 * @typedef User
 * @property {String} email 
 * @property {Object} alerts
 */
/**
 * @typedef {Object} UrlObject
 * @property {String} url the url that was created
 * @property {String} token the hash of the url
 */
/**
 * @typedef {Object} SearchConfig
 * @property {String} neighborhood string with the id of neighborhood
 * @property {Number} fromPrice starting price
 * @property {Number} toPrice limit price
 * @property {Number} fromRooms starting rooms 
 * @property {Number} toRooms limit rooms 
 * @property {Boolean} ignoreAgencies ignore agencies listing
 */
/**
 * @typedef {Object} HashResultsObject
 * @property {String} url the url which hash linked to
 * @property {String} searchedResultHash the hash of search results
 * @property {Numbere} length the length of results
 */
/**
 * @typedef {Object} HashObject
 * @example
 * {
 *  "2626769505": {
 *    "url": "https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-3000",
 *    "emails": {
 *      "artium1@gmail.com": true
 *    }
 *  },
 *  "2626769504": {
  *    "url": "https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1520&rooms=1-5.5&price=0-2000",
  *    "emails": {
  *      "a@b.c": true
  *    }
  *  }
 * }
 */
/**
 * return all users from database
 * @returns {Array<User>}
 */
function getAllUsers(docSchema) {
  return new Promise((resolve, reject) => {
    docSchema.find((e, docs) => {
      if (e) {
        print(e)
        return reject(e)
      }
      resolve(docs)
    })
  })
}
/**
 * function to build url for the search
 * @param {SearchConfig} config object with search config
 * @returns {UrlObject} { url}
 */
function urlBuilder({neighborhood, fromPrice = 0, toPrice = 999999, fromRooms = 0, toRooms = 99999}) {
  const neighborhoods = {
    florentine:'205',
    north_old_north:'1483',
    north_old_south:'1461',
    north_new_south:'1519',
    north_new_north:'204',
    big_chunk:'195',
    ramat_aviv:'197',
    heart_tel_aviv:'1520'
  }

  if (neighborhood && !Object.values(neighborhoods).includes(neighborhood)) {
    throw new Error('No such neighborhood')
  }
 
  const url = 
    createUrl(neighborhood, fromPrice, toPrice, fromRooms, toRooms)
  
  const hash = stringHash(url).toString()

  return { url, hash }
}
/**
 * function to add new search term to db
 * @param {String} url the url to crawl
 * @param {String} hash the hash of url to crawl
 * @returns {Promise}
 */
function addNewSearch(docSchema) {
  return function(url, hash) {
    return new Promise((resolve, reject) => {
      docSchema.findOne({ hash }, (error, searchObj) => {
        if (error) return reject({ error })
        if (!searchObj) {
          const newSearch = 
            new docSchema({ hash, url, searches:{ old:[], new:[] } })
  
          newSearch.save((error, doc) => {
            if (error) {
              print(error)
              reject(error)
            }
            resolve('searches saved')
          })
        } else {
          searchObj.save((error, doc) => {
            if (error) {
              print(error)
              reject(error)
            }
            resolve('searches saved')
          })
        }
      })
    })
  }
}
/**
 * function to add links to db
 * @param {String} hash hash of the url to crawl
 * @param {Array} links array of links to add
 * @param {String} state can be 'old' | 'new' based on the place it called
 */
function addLinks(hash, links, state) {
  return new Promise((resolve, reject) => {
    if (!links.length) return reject()
    Search.findOne({ hash }, (error, searchObj) => {
      if (error) {
        print(error)
        return reject({error})
      }
      if (!searchObj) {
        return reject('no hash')
      }

      searchObj.searches[state] = links
      searchObj.markModified('searches');
      searchObj.save((error, doc) => {
        if (error) {
          print(error)
          reject(error)
        }
        resolve('searches saved')
      })
    })
  })
}
/**
 * function to open yad2 and expend the listing
 * @param {Nightmare} instance instance of nightmare
 * @param {SearchConfig} config search config
 */
async function expendFeed(instance, config) {
  try {
    const { url, hash } = urlBuilder(config)

    const addNewSearchWithSchema = addNewSearch(Search)
    await addNewSearchWithSchema(url, hash)

    const list = await instance
    .on('console', (log, msg) => {
      console.log(msg)
    })
    .goto(url)
    .wait('.feed_list')
    .evaluate(async () => {
  
      const clickableItemQuery = '.feeditem .feed_item div'
      const adFinderQuery = '.feeditem .platinum'
      const agencyFinderQuery = '.feeditem .agency'
      const children = document.querySelector('.feed_list').children
      const textNodes = []
      
      for(let i = 0; i < children.length; i++) {
        
        // ignoring sponsored links
        if (children[i].querySelector(adFinderQuery)) {
          console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
          console.log('@@@@@@@@@@@@@ ad alert @@@@@@@@@@@@@')
          console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
          continue;
        } 
        
        // if (config.ignoreAgencies) {
        //   if (children[i].querySelector(agencyFinderQuery)) {
        //     console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
        //     console.log('@@@@@@@@@@@ agency alert @@@@@@@@@@@')
        //     console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
        //     continue;
        //   }
        // } 
        
        else {
          const el = children[i].querySelector(clickableItemQuery)
          if (el) await el.click()
        }
      }
    })
    return hash
  } catch(e) {
    print(e)
    return null
  }
}
/**
 * function to get links of listing from yad2
 * @param {Nightmare} instance instance of nightmare
 */
async function getLinks(instance) {
  
  const isOpened = '.feeditem .accordion_opened'
  const links = await instance
  .wait(isOpened)
  .evaluate(async() => {
    async function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
    await wait(1000)
    const feedQuery = '.feed_list'
    const linkQuery = '.feeditem .feed_item .accordion_wide .wrapper .footer li>a .copy_link_placeholder'
    const children = document.querySelector(feedQuery).children
    const arr = []

    for(let i = 0; i < children.length; i++) {
      const el = children[i].querySelector(linkQuery)
      if (el) arr.push(el.textContent.split('s/c/')[1])
    }
    return arr
  })
  .end()

  return links
}
/**
 * function to write links into file
 * @param {Array} links array of links to write
 * @param {String} fileName name of file to write links to
 */
function writeLinks(links, fileName) {
  exec(`> ${fileName}`)
  links.forEach(link => {
    exec(`echo ${link} >> ${fileName}`)
  })
}
/**
 * function to read links from search term in db
 * @param {String} hash hash of the search to read from
 * @param {String} state can be 'old' | 'new' based on where it's called
 */
function readLinks(docSchema) {
  return function(hash, state) {
    return new Promise((resolve, reject) => {
      docSchema.findOne({ hash }, (error, searchObj) => {
        if (error) {
          return reject({error})
        }
        if (!searchObj) {
          return reject('no user')
        }
        resolve(searchObj.searches[state])
      })
    })
  }
}
/**
 * function to compare between two list and return the difference as the new links
 * @param {Array} prevLinks links that already exist in db
 * @param {Array} currentLinks links that just crawled
 * @returns {Array} array of new listings
 */
function getNewLinks(prevLinks, currentLinks) {
  const newLinks = {}

  currentLinks.forEach(link => {
    const linkId = link.split('s/c/')[1]
    newLinks[link] = true
  })

  prevLinks.forEach(link => {
    const linkId = link.split('s/c/')[1]
    if (newLinks[link]) {
      delete newLinks[link]
    }
  })

  return Object.keys(newLinks)
}
/**
 * function to get search hashes from signed users
 * @param {Redis} redis redis instance
 * @param {Object} users object of users 
 * @returns {HashObject} 
 */
async function getHashes(redis, users) {
  let hashes = await redis.getAsync('hashes')
  if (!hashes) {
    const hashesTmp = {}
    for(let user of users) {
      const email = user.email
      for(let id in user.alerts) {
        if (!hashesTmp[id]) {
          hashesTmp[id] = {
            url:user.alerts[id],
            emails:{ [user.email]: true }
          }
        } else {
          hashesTmp[id].emails[user.email] = true
        }
      }
    }
    await redis.setAsync('hashes', JSON.stringify(hashesTmp))
    hashes = hashesTmp;
  } else {
    hashes = JSON.parse(hashes);
  }
  console.log('hashes:')
  print(hashes)
  return hashes
}

/**
 * function to set hash of the returned results in redis
 * @param {Redis} redis instance of redis
 * @param {Object} newSearches new hashed results exmp: { <searcUrlHash>:<resultsHash> }
 */
async function addSearchResultHashToRedis(redis, hash, newHashedResults, newSearchesLength, url) {
  const hashedSearchResults = await redis.getAsync('hashedSearchResults')
  try {
    if (hashedSearchResults) {
      const hashedSearchResultsObj = JSON.parse(hashedSearchResults)
      hashedSearchResultsObj[hash] = {
        searchedResultHash: newHashedResults,
        length:newSearchesLength,
        url
      }
      print({ hashedSearchResultsObj })
      await redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))      
      print(JSON.parse(await redis.getAsync('hashedSearchResults')))
    } else {
      const hashedSearchResultsObj = {}
      hashedSearchResultsObj[hash] = {
        searchedResultHash: newHashedResults,
        length:newSearchesLength,
        url
      }
      await redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))
      const hashed = JSON.parse(await redis.getAsync('hashedSearchResults'))
      print(hashed)
      return(hashed)
    }
  } catch(e) {
    Promise.reject(new Error(e))
  }
}

/**
 * function to return object with hash of results, length of results and the url of results
 * @param {Redis} redis instance of redis
 * @param {String} urlHash url hash by which to find the search hash
 * @returns {HashResultsObject}
 */
function getSearchResultsHashFromRedis(redis, urlHash) {
  return new Promise( async (resolve, reject) => {
    const hashedSearchResults = await redis.getAsync('hashedSearchResults')
    if (hashedSearchResults) {
      const hashedSearchResultsObj = JSON.parse(hashedSearchResults)
      print({ urlHash, hashedSearchResultsObj })
      console.log('getSearchResultsHashFromRedis returns:\n')
      print(hashedSearchResultsObj[urlHash])
      return resolve(hashedSearchResultsObj[urlHash])
    } else {
      resolve(null)
    }
  })
}

async function main(redis) {
  console.log('starting')
  const users = await getAllUsers(User)

  if (!users.length) return

  const results = {}
  const hashes = await getHashes(redis, users)
  console.log('hashes found:\n')
  print(hashes)
  for(let hash in hashes) { 
    const url = urlParser.parse(hashes[hash].url)
    const nightmare = Nightmare({ show: true, waitTimeout: 10000 })
    const config = {
      neighborhood:url.neighborhood,
      fromPrice:url.price.split('-')[0],
      toPrice:url.price.split('-')[1],
      fromRooms:url.rooms.split('-')[0],
      toRooms:url.rooms.split('-')[1],
      ignoreAgencies:true
    }

    try {
      const searchedUrlHash = await expendFeed(nightmare, config);

      console.log('getting links')
      // get links from yad2
      const newLinks = await getLinks(nightmare)
      const oldHashedResults = await getSearchResultsHashFromRedis(redis, hash)
      const newHashedResults = hashFunc(newLinks)

      console.log('oldHashedResults:')
      print(oldHashedResults)

      if (!oldHashedResults) {
        console.log('!oldHashedResults')
        print({ hash, searchedUrlHash })
        await addSearchResultHashToRedis(redis, hash, newHashedResults, newLinks.length, hashes[hash].url)
      } else {
        const oldLinksLength = oldHashedResults.length

        // until i will think about better solution
        // the issue is that sometimes Nightmare wont read 
        // all links and instead of returning 20 links to db
        // it will return only 10 and next time it crawl it will 
        // fake find 10 new links because it will think 
        // these extra 10 are new

        console.log(`oldLinksLength: ${oldLinksLength}\n newLinks.length: ${newLinks.length}`)
        
        if (oldLinksLength > 3 && oldLinksLength - newLinks.length > 3) return

        console.log(`oldLinksLength: ${oldLinksLength}\n newLinks.length: ${newLinks.length}`)

        // if there is no change in results return
        if (oldHashedResults.searchedResultHash === newHashedResults) return

        // setting hash of thee results for the current search
        await addSearchResultHashToRedis(redis, hash, newHashedResults, newLinks.length, hashes[hash].url)

        // write links to db//
        await addLinks(hash, newLinks, 'new')

        // read old links
        const readLinksWithSchema = readLinks(Search)
        const oldLinks = await readLinksWithSchema(hash, 'old')
  
        // replace old links with the new one's
        await addLinks(hash, newLinks, 'old')
  
        // get new links
        const foundLinks = getNewLinks(oldLinks, newLinks)
        
        results[hash] = { foundLinks, emails:hashes[hash].emails }
        console.log('results:\n')
        print(results)
  
        // send links to emails
        sendLinks(results)
      }
    } catch(e) {
      print(e)
    }
  }
}


function sendLinks(results) {
  for(let hash in results) {
    for(let email in results[hash].emails) {
      const linksFound = results[hash].foundLinks

      if (!linksFound.length) return 

      const emailObj = {
        fromEmail:'dev@inlyne.co',
        toEmail: email,
        subject:'hello world', 
        text: linksFound.map(id => 'https://www.yad2.co.il/item/'.concat(id) + '\n').toString().replace(/,/g, ''),
        html:''
      }
      sendEmail(emailObj).catch(console.error)
    }
  }
} 


module.exports = { 
  main, 
  readLinks, 
  writeLinks, 
  getNewLinks, 
  urlBuilder, 
  getHashes, 
  getAllUsers, 
  addNewSearch,
  addSearchResultHashToRedis,
  getSearchResultsHashFromRedis
}

