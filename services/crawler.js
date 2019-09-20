const { User } = require('../db/models/UserSchema')
const urlParser = require('query-string')
const Nightmare = require('nightmare')
const { exec } = require('child_process')
const jwt = require('jsonwebtoken')
const stringHash = require('string-hash')
const _ = require('lodash')
const { createUrl } = require('../utils/utils')

function getAllUsers() {
  return new Promise((resolve, reject) => {
    User.find((error, users) => {
      if (error) return reject(error)
      resolve(users)
    })
  })
}

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
 
  const url = createUrl(neighborhood, fromPrice, toPrice, fromRooms, toRooms)
  console.log('url: ', url)
  const token = stringHash(url)
  return { url, token }
}



//crawler:  https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=205&rooms=1-2.5&price=500-1000
//crawler:  https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=205&rooms=1-2.5&price=500-1000

//add alert:https://www.yad2.co.il/realestate/rent?city=5000&neighborhood=1483&rooms=2-2.5&price=500-1000

function addNewSearch(token, email) {
  return new Promise((resolve, reject) => {
    User.findOne({ email }, (error, user) => {
      if (error) {
        return reject({error})
      }
      if (!user) {
        return reject('no user')
      }
  
      const searches = _.cloneDeep(user.searches)
      if (!searches[token]) {
        searches[token] = {}
        searches[token].old = []
        searches[token].new = []
      }
      user.searches = searches
      user.save((error, doc) => {
        if (error) {
          console.log(error)
          reject(error)
        }
        resolve('searches saved')
      })
    })
  })
}

function addLinks(token, links, state, email) {
 
  return new Promise((resolve, reject) => {
    if (!links.length) return resolve()
    User.findOne({ email }, (error, user) => {
      if (error) {
        return reject({error})
      }
      if (!user) {
        return reject('no user')
      }


  
      const searches = _.cloneDeep(user.searches)

      // prevent from updating the links when there was some 
      // problem with the headless browser and it couldn't
      // get all links from the page
      if (state === 'old' && searches[token]['old'] && searches[token]['old'].length > links.length) return

      searches[token][state] = links
      user.searches = searches
      user.save((error, doc) => {
        if (error) {
          console.log(error)
          reject(error)
        }
        resolve('searches saved')
      })
    })
  })
}


async function expendFeed(instance, config, email) {
  
  try {
    const { url, token } = urlBuilder(config)

    await addNewSearch(token, email)
    
    const list = await instance
    .goto(url)
    .wait('.feed_list')
    .evaluate(async () => {
  
      const clickableItemQuery = '.feeditem .feed_item div'
      const children = document.querySelector('.feed_list').children
      const textNodes = []
      
      for(let i = 0; i < children.length; i++) {
        const el = children[i].querySelector(clickableItemQuery)
        if (el) await el.click()
      }
    })
    return token
  } catch(e) {
    return null
  }
}


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

function writeLinks(links, fileName) {
  exec(`> ${fileName}`)
  links.forEach(link => {
    exec(`echo ${link} >> ${fileName}`)
  })
}

function readLinks(token, state, email) {
  return new Promise((resolve, reject) => {
    User.findOne({ email }, (error, user) => {
      if (error) {
        return reject({error})
      }
      if (!user) {
        return reject('no user')
      }
  
      const searches = _.cloneDeep(user.searches)
      resolve(user.searches[token][state])
    })
  })
}

function getNewLinks(prevLinks, currentLinks) {
  console.log({ prevLinks, currentLinks })
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

function compare(prevLinks, currentLinks) {
  return getNewLinks(prevLinks, currentLinks)
}

async function main(req, res, next) {
  console.log('start')
  
  const users = await getAllUsers()

  if (!users.length) return

  const results = {}

  for(let user of users) {
    const email = user.email
    for(let id in user.alerts) {
      const url = urlParser.parse(user.alerts[id])
      const nightmare = Nightmare({ show: true, waitTimeout: 5000 })
      // go to yad2

      const config = {
        neighborhood:url.neighborhood,
        fromPrice:url.price.split('-')[0],
        toPrice:url.price.split('-')[1],
        fromRooms:url.rooms.split('-')[0],
        toRooms:url.rooms.split('-')[1],
      }

      try {
        const token = await expendFeed(nightmare, config, email);

        // get links from yad2
        const newLinks = await getLinks(nightmare)
  
        // write links to file
        await addLinks(token, newLinks, 'new', email)
  
        //const newLinks = await readLinks(token, 'new')
        const oldLinks = await readLinks(token, 'old', email)
  
        // replace old links with the new one's
        await addLinks(token, newLinks, 'old', email)
  
        // get new files
        const foundLinks = getNewLinks(oldLinks, newLinks)
        results[token] = foundLinks
      } catch(e) {
        console.log('no results here')
      }
    }
    console.log({ results, email })
  }
}


module.exports = { main, compare, readLinks, writeLinks, getNewLinks, urlBuilder }

