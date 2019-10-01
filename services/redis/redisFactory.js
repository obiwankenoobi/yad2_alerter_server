const { createUrl, print } = require('../../utils/utils')
const { getAllUsers } = require('../crawler')
function redisFactory(redis) {
  /**
   * function to get search hashes from signed users
   * @param {Redis} redis redis instance
   * @param {Object} users object of users 
   * @returns {HashObject} 
   */
  async function getHashes(users) {
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

  /**
   * function to set hash of the returned results in redis
   * @param {String} hash hashed url examp: '2626769505'
   * @param {String} newHashedResults hash of the new results examp: '6046e67a6986462c2e9377fa8e274981c9d19050'
   * @param {Number} newSearchesLength length of the results
   * @param {String} url the url that has used for the search
   */
  async function addSearchResultHashToRedis(hash, newHashedResults, newSearchesLength, url) {
    const hashedSearchResults = await redis.getAsync('hashedSearchResults')
    try {
      if (hashedSearchResults) {
        const hashedSearchResultsObj = JSON.parse(hashedSearchResults)
        hashedSearchResultsObj[hash] = {
          searchedResultHash: newHashedResults,
          length:newSearchesLength,
          url
        }
        //print({ hashedSearchResultsObj })
        await redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))      
        //print(JSON.parse(await redis.getAsync('hashedSearchResults')))
      } else {
        const hashedSearchResultsObj = {}
        hashedSearchResultsObj[hash] = {
          searchedResultHash: newHashedResults,
          length:newSearchesLength,
          url
        }
        await redis.setAsync('hashedSearchResults', JSON.stringify(hashedSearchResultsObj))
        const hashed = JSON.parse(await redis.getAsync('hashedSearchResults'))
        //print(hashed)
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
  function getSearchResultsHashFromRedis(urlHash) {
    return new Promise( async (resolve, reject) => {
      const hashedSearchResults = await redis.getAsync('hashedSearchResults')
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
   * @param {Redis} redis instance of redis
   * @param {String} hash hash of the searhing url
   * @param {Object} hashes object of the hashes that already in memory
   * @param {String} email email of user
   * @param {String} url url of the search 
   */
  async function updateAlertInRedis(hash, hashes, email, url) {
    let readyHashes = typeof hashes !== 'object' ? JSON.parse(hashes) : hashes
    if (!readyHashes) {
      const users = await getAllUsers()
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
    await redis.setAsync('hashes', JSON.stringify(readyHashes))

    const saved = await redis.getAsync('hashes')
    return JSON.parse(saved)
  }

  /**
   * a function that injects redis into it to use in its scope
   * @param {Function} fn function to inject redis into
   * @param  {...any} args arguments to pass into the fuunction
   */
  function addRedis(fn, ...args) {
    return fn(redis, ...args)
  }

  /**
   * getter for redis
   * @param {String} key key to find in redis
   */
  async function getValue(key) {
    return await redis.getAsync(key)
  }

  return {
    getSearchResultsHashFromRedis,
    addSearchResultHashToRedis,
    getHashes,
    addRedis,
    updateAlertInRedis,
    getValue
  }
}

module.exports = redisFactory