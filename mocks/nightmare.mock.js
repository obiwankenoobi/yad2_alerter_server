class Nightmare {
  constructor() {}
  goto(url) {
    return this
  }
  wait(query) {
    return this
  }
  evaluate(callback) {
    callback()
    return this
  }
  on(event, callback) {
    callback()
  } 
}

