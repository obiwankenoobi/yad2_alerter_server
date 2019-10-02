const { User } = require('../../db/models/UserSchema')
const { Search } = require('../../db/models/SearchesSchema')

/**
 * @typedef User
 * @property {String} email 
 * @property {Object} alerts
 */
class MongoFactory {
  /**
   * return all users from database
   * @returns {Array<User>}
   */
  getAllUsers(docSchema) {
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
  addNewSearch(docSchema) {
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
  addLinks(hash, links, state) {
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
  readLinks(docSchema) {
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
}

const mongoFactory = new MongoFactory()

module.exports = {
  getAllUsers:mongoFactory.getAllUsers.bind(mongoFactory),
  addNewSearch:mongoFactory.addNewSearch.bind(mongoFactory),
  addLinks:mongoFactory.addLinks.bind(mongoFactory),
  readLinks:mongoFactory.readLinks.bind(mongoFactory)
}