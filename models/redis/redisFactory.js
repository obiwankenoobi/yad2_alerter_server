const { print } = require('../../utils/utils')
const { getAllUsers } = require('../database/mongoFactory')
const { User } = require('../../db/models/UserSchema')

/**
* Object to save in redis with information about the current search
* @typedef {Object} SearchResultHashObj
* @property {String} hash hashed url examp: '2626769505'
* @property {String} newHashedResults hash of the new results examp: '6046e67a6986462c2e9377fa8e274981c9d19050'
* @property {Number} newSearchesLength length of the results
* @property {String} url the url that has used for the search
*/
/**
 * Alert object to save in redis
 * @typedef {Object} AlertObj
 * @property {String} hash hash of the searhing url
 * @property {Object} hashes object of the hashes that already in memory
 * @property {String} email email of user
 * @property {String} url url of the search 
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
 * @typedef {Object} HashResultsObject
 * @property {String} url the url which hash linked to
 * @property {String} searchedResultHash the hash of search results
 * @property {Numbere} length the length of results
 */

class RedisFactory {

  constructor(redis) {
    this.redis = redis
  }
  /**
   * function to get search hashes from signed users
   * @param {Redis} redis redis instance
   * @param {Object} users object of users 
   * @returns {HashObject} 
   */
  async getHashes(users) {
    let hashes = await this.redis.getAsync('hashes')
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
      await this.redis.setAsync('hashes', JSON.stringify(hashesTmp))
      hashes = hashesTmp;
    } else {
      hashes = JSON.parse(hashes);
    }

    return hashes
  }

  /**
   * function to set hash of the returned results in redis
   * @param {SearchResultHashObj} 
   */
  async addSearchResultHashToRedis({ hash, newHashedResults, newSearchesLength, url }) {
    const hashedSearchResults = await this.redis.getAsync('hashedSearchResults')
    try {
      if (hashedSearchResults) {
        const hashedSearchResultsObj = JSON.parse(hashedSearchResults)
        hashedSearchResultsObj[hash] = {
          searchedResultHash: newHashedResults,
          length:newSearchesLength,
          url
        }
        
        await this.redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))      
        
      } else {
        const hashedSearchResultsObj = {}
        hashedSearchResultsObj[hash] = {
          searchedResultHash: newHashedResults,
          length:newSearchesLength,
          url
        }
        await this.redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))
        const hashed = JSON.parse(await this.redis.getAsync('hashedSearchResults'))
        //print(hashed)
        return(hashed)
      }
    } catch(e) {
      Promise.reject(new Error(e))
    }
  }

  /**
   * function to return object with hash of results, length of results and the url of results
   * @param {String} urlHash url hash by which to find the search hash
   * @returns {HashResultsObject}
   */
  getSearchResultsHashFromRedis(urlHash) {
    return new Promise( async (resolve, reject) => {
      const hashedSearchResults = await this.redis.getAsync('hashedSearchResults')
      if (hashedSearchResults) {
        const hashedSearchResultsObj = JSON.parse(hashedSearchResults)
        return resolve(hashedSearchResultsObj[urlHash])
      } else {
        resolve(null)
      }
    })
  }

  /**
   * update alert in redis
   * @param {AlertObj}
   */
  async updateAlertInRedis({ hash, hashes, email, url }) {
    let readyHashes = typeof hashes !== 'object' ? JSON.parse(hashes) : hashes
    if (!readyHashes) {
      const users = await getAllUsers(User)
      const hashes = await getHashes(users)
      readyHashes = hashes
    }

    if (readyHashes[hash]) {
      readyHashes[hash].emails[email] = true
    } else {
      readyHashes[hash] = {}
      readyHashes[hash].url = url
      readyHashes[hash].emails = {}
      readyHashes[hash].emails[email] = true
    }
    await this.redis.setAsync('hashes', JSON.stringify(readyHashes))

    const saved = await this.redis.getAsync('hashes')
    return JSON.parse(saved)
  }

  /**
   * a function that injects redis into it to use in its scope
   * @param {Function} fn function to inject redis into
   * @param  {...any} args arguments to pass into the fuunction
   */
  addRedis(fn, ...args) {
    return fn(this.redis, ...args)
  }

  /**
   * getter for redis
   * @param {String} key key to find in redis
   */
  async getValue(key) {
    return await this.redis.getAsync(key)
  }
}

module.exports = RedisFactory