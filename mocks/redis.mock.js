class Redis {
  constructor() {
    this.storage = {}
  }
  getAsync(key) {
    return Promise.resolve(this.storage[key])
  }
  setAsync(key, value) {
    this.storage[key] = value
    Promise.resolve()
  }
}

module.exports = Redis