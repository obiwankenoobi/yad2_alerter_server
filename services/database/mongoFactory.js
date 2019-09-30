const { User } = require('../../db/models/UserSchema')
const { Search } = require('../../db/models/SearchesSchema')

function mongoFactory() {
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

  return {
    getAllUsers,
    addNewSearch,
    addLinks,
    readLinks
  }
}


module.exports = mongoFactory