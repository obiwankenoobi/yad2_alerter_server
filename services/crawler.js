const { User } = require('../db/models/UserSchema')
const { Search } = require('../db/models/SearchesSchema')
const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const sendEmail = require('./sendEmail')
const _ = require('lodash')
const { createUrl } = require('../utils/utils')


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
 * return all users from database
 * @returns {Array<User>}
 */
function getAllUsers() {
  return new Promise((resolve, reject) => {
    User.find((e, users) => {
      if (e) {
        console.log(e)
        return reject(e)
      }
      resolve(users)
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
  
  const token = stringHash(url)

  return { url, token }
}
/**
 * function to add new search term to db
 * @param {String} url the url to crawl
 * @param {String} hash the hash of url to crawl
 * @returns {Promise}
 */
function addNewSearch(url, hash) {
  console.log('adding new search')
  return new Promise((resolve, reject) => {
    Search.findOne({ hash }, (error, searchObj) => {
      if (error) return reject({ error })
      if (!searchObj) {
        const newSearch = 
          new Search({ hash, url, searches:{ old:[], new:[] } })

        newSearch.save((error, doc) => {
          if (error) {
            console.log('error in saving doc')
            console.log(error)
            reject(error)
          }
          resolve('searches saved')
        })
      } else {
        searchObj.save((error, doc) => {
          if (error) {
            console.log(error)
            console.log('error in saving doc')
            reject(error)
          }
          resolve('searches saved')
        })
      }
    })
  })
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
        console.log(error)
        return reject({error})
      }
      if (!searchObj) {
        console.log('no search with hash: ', hash)
        return reject('no hash')
      }


      // prevent from updating the links when there was some 
      // problem with the headless browser and it couldn't
      // get all links from the page
      // if (state === 'old' && searchObj.searches['old'] && searchObj.searches['old'].length > links.length) return
      
      searchObj.searches[state] = links
      searchObj.markModified('searches');
      searchObj.save((error, doc) => {
        if (error) {
          console.log(error)
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
    const { url, token } = urlBuilder(config)

    await addNewSearch(url, token)
    console.log('expending feed')
    const list = await instance
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
        
        // else if (config.ignoreAgencies) {
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
    return token
  } catch(e) {
    console.log('error in expending feed')
    console.log(e)
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
function readLinks(hash, state) {
  return new Promise((resolve, reject) => {
    Search.findOne({ hash }, (error, searchObj) => {
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
 * function that returns new links from the website
 * @param {Array} prevLinks the links that already exist
 * @param {Array} currentLinks new links to compare
 * @returns {Array} of new IDs
 */
function compare(prevLinks, currentLinks) {
  return getNewLinks(prevLinks, currentLinks)
}
/**
 * function to get search hashes from signed users
 * @param {Redis} redis redis instance
 * @param {Object} users object of users 
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
  return hashes
}

async function main(redis) {
  console.log('starting')
  const users = await getAllUsers()

  if (!users.length) return

  const results = {}
  const hashes = await getHashes(redis, users)
  console.log('hashes found:\n', hashes)
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
      const token = await expendFeed(nightmare, config);

      console.log('getting links')
      // get links from yad2
      const newLinks = await getLinks(nightmare)

      console.log('adding links')
      // write links to file
      await addLinks(token, newLinks, 'new')

      console.log('getting old links')
      //const newLinks = await readLinks(token, 'new')
      const oldLinks = await readLinks(token, 'old')

      console.log('adding new links to db')
      // replace old links with the new one's
      await addLinks(token, newLinks, 'old')

      console.log('calculating new results')
      // get new links
      const foundLinks = getNewLinks(oldLinks, newLinks)
      
      results[token] = { foundLinks, emails:hashes[hash].emails }
      console.log('results:\n', results)

      // send links to emails
      sendLinks(results)
    } catch(e) {
      console.log('error detected')
      console.log({ error: e })
    }
  }

  console.log(JSON.stringify(results, null, 2))

}


function sendLinks(results) {
  console.log('send emails:\n', results)
  for(let hash in results) {
    for(let email in results[hash].emails) {
      const linksFound = results[hash].foundLinks

      if (!linksFound.length) return 

      console.log('send email to:\n', email)
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


module.exports = { main, compare, readLinks, writeLinks, getNewLinks, urlBuilder, getHashes, getAllUsers }

