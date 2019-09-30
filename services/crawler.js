const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const hashFunc = require('object-hash')
const _ = require('lodash')
const { 
  addNewSearch 
} = require('./database/mongoFactory')()

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
    // .on('console', (log, msg) => {
    //   console.log(msg)
    // })
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
  getNewLinks, 
  urlBuilder,
  sendLinks,
  expendFeed,
  getLinks
}

