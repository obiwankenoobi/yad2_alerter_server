function createUrl({ neighborhood, fromPrice, toPrice, fromRooms, toRooms }) {
  const neighborhoodStr = neighborhood ? `neighborhood=` + neighborhood : '';
  return `https://www.yad2.co.il/realestate/rent?city=5000&` + neighborhoodStr + `&rooms=${fromRooms}-${toRooms}&price=${fromPrice}-${toPrice}`
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2))
}

module.exports = { createUrl, print }