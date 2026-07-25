// Imports

// Functions
export async function getWeatherInfo(settingsStore) {
  const url = "https://forecast-v2.metoceanapi.com/point/time"
  
  const data = {
    points: [{lon: settingsStore.weather_lon, lat: settingsStore.weather_lat}],
    variables: ['precipitation.rate'],
    time: {
      from: '2026-07-26T00:00:00Z',
      interval: '3h',
      repeat: 3,
    }
  }
  
  const headers = new Headers();
  headers.append("Accept", "application/json")
  headers.append("content-type", "application/json")
  headers.append("x-api-key", settingsStore.weather_api_key)
  
  const options = {
    method: "POST",
    body: JSON.stringify(data),
    headers: headers,
  }
  
  const response = await fetch(url, options)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error))

  console.log(response)
  return response
}