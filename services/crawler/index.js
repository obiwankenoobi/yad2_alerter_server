const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const hashFunc = require('object-hash')
const _ = require('lodash')
const { 
  addNewSearch 
} = require('../database/mongoFactory')

const { User } = require('../../db/models/UserSchema')
const { Search } = require('../../db/models/SearchesSchema')
const { createUrl, print } = require('../../utils/utils')



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


 class Crawler {
   constructor(nightmare) {
     this.instance = nightmare
   }

   /**
   * function to build url for the search
   * @param {SearchConfig} config object with search config
   * @returns {UrlObject}
   */
  urlBuilder({ neighborhood, fromPrice = 0, toPrice = 999999, fromRooms = 0, toRooms = 99999 }) {
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
  
    const urlParams = {
      neighborhood,
      fromPrice,
      toPrice,
      fromRooms,
      toRooms
    }
    const url = createUrl(urlParams)
    const hash = stringHash(url).toString()

    return { url, hash }
  }

  /**
  * function to open yad2 and expend the listing
  * @param {Nightmare} instance instance of nightmare
  * @param {SearchConfig} config search config
  */
  async expendFeed(config) {
    try {
      const { url, hash } = this.urlBuilder(config)

      await addNewSearch(Search)(url, hash)
  
      const list = await this.instance
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
      console.log(e)
      return null
    }
  }

  /**
   * function to get links of listing from yad2
   * @param {Nightmare} instance instance of nightmare
   */
  async getLinks() {
    const isOpened = '.feeditem .accordion_opened'
    const links = await this.instance
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
  getNewLinks(prevLinks, currentLinks) {
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

  clear() {
    this.instance = Nightmare({ show: false, waitTimeout: 10000 })
  }
 }


const nightmare = Nightmare({ show: false, waitTimeout: 10000 })

const crawler = new Crawler(nightmare)

module.exports = { 
  getNewLinks:crawler.getNewLinks.bind(crawler), 
  urlBuilder:crawler.urlBuilder.bind(crawler),
  expendFeed:crawler.expendFeed.bind(crawler),
  getLinks:crawler.getLinks.bind(crawler),
  clearCrawler:crawler.clear.bind(crawler)
}

