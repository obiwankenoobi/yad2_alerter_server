const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const hashFunc = require('object-hash')
const _ = require('lodash')

const { 
  addLinks,
  readLinks,
  getAllUsers,
 } = require('./database/mongoFactory')()

const { 
  getSearchResultsHashFromRedis,
  addSearchResultHashToRedis,
  getHashes
} = require('../services/redis/redisFactoryExport')

const { 
  expendFeed,
  getLinks,
  getNewLinks
 } = require('./crawler')

 const { sendLinks } = reequire('./email')

const { User } = require('../db/models/UserSchema')
const { Search } = require('../db/models/SearchesSchema')
const { print } = require('../utils/utils')
const sendEmail = require('./sendEmail')

async function main() {
  console.log('starting')
  const users = await getAllUsers(User)

  if (!users.length) return

  const results = {}
  const hashes = await getHashes(users)

  for(let hash in hashes) { 
    const url = urlParser.parse(hashes[hash].url)
    const nightmare = Nightmare({ show: false, waitTimeout: 10000 })
    const config = {
      neighborhood:url.neighborhood,
      fromPrice:url.price.split('-')[0],
      toPrice:url.price.split('-')[1],
      fromRooms:url.rooms.split('-')[0],
      toRooms:url.rooms.split('-')[1],
      ignoreAgencies:true
    }

    try {
      // expending feed to get access to links
      const searchedUrlHash = await expendFeed(nightmare, config);    

      // get links from yad2
      const newLinks = await getLinks(nightmare)
      const oldHashedResults = await getSearchResultsHashFromRedis(hash)
      const newHashedResults = hashFunc(newLinks)

      // console.log('oldHashedResults:')
      // print(oldHashedResults)

      const searchResultHashObj = {
        hash,
        newHashedResults,
        newSearchesLength: newLinks.length,
        url: hashes[hash].url
      }
      if (!oldHashedResults) {
        // console.log('!oldHashedResults')
        // print({ hash, searchedUrlHash })
        await addSearchResultHashToRedis(searchResultHashObj)
      } else {
        const oldLinksLength = oldHashedResults.length

        // until i will think about better solution
        // the issue is that sometimes Nightmare wont read 
        // all links and instead of returning 20 links to db
        // it will return only 10 and next time it crawl it will 
        // fake find 10 new links because it will think 
        // these extra 10 are new
        console.log(`oldLinksLength: ${oldLinksLength}\n newLinks.length: ${newLinks.length}`)
        if (oldLinksLength > 3 && oldLinksLength - newLinks.length > 3) continue
        
        // if there is no change in results return
        if (oldHashedResults.searchedResultHash === newHashedResults) continue

        // setting hash of the results for the current search
        await addSearchResultHashToRedis(searchResultHashObj)

        // write links to db
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
      console.log(e)
      print(e)
    }
  }
}

module.exports = { main }