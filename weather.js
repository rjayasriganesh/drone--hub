import config from './config.js';

export const weather = {
    async getWeatherData(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.OPENWEATHER_API_KEY}`
            );
            const data = await response.json();
            return {
                temperature: data.main.temp,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                conditions: data.weather[0].main
            };
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }
}; 