const { users, searches } = require('./mongoose.mock.data')

class MongooseMock {
  constructor(docs) {
    this.docs = docs
  }
  find(callback) {
    callback(null, this.docs)
  }
  findOne(query, callback) {
    const queryKeys = Object.keys(query)
    const filteredDocs = 
      this.docs.find(doc => doc[queryKeys[0]] === query[queryKeys[0]])
    callback(null, filteredDocs)
  }
  save(callback) {
    
  }
}



const User = new MongooseMock(users)
const Search = new MongooseMock(searches)

module.exports = { User, Search }