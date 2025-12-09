const CITY_COORDS = {
  nairobi: { latitude: -1.2864, longitude: 36.8172 },
};

const cityInputEl   = document.getElementById('cityInput');
const searchBtnEl   = document.getElementById('searchBtn');
const loadingEl     = document.getElementById('loading');
const resultEl      = document.getElementById('weatherResult');
const cityNameEl    = document.getElementById('cityName');
const tempEl        = document.getElementById('temp');
const windEl        = document.getElementById('wind');
const iconEl        = document.getElementById('icon');
const errorMsgEl    = document.getElementById('errorMsg');

function showLoading() {
  loadingEl.classList.remove('hidden');
}
function hideLoading() {
  loadingEl.classList.add('hidden');
}
function clearError() {
  errorMsgEl.textContent = '';
  errorMsgEl.classList.add('hidden');
}
function showError(message) {
  errorMsgEl.textContent = message;
  errorMsgEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
}
function showResults() {
  resultEl.classList.remove('hidden');
}
function hideResults() {
  resultEl.classList.add('hidden');
}

function weatherCodeToDescriptor(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 97, 98, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown weather';
}

// 672305 - Gideon Maroko
// SVG generator used ref - https://www.svgrepo.com/svg/503354/generator (9/12/2025)

function svgDataUrlForWeather(code) {
  const desc = weatherCodeToDescriptor(code);

  const toDataUrl = (svg) =>
    'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  const svgBase = (content) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#ffffff"/>
      ${content}
    </svg>`;

  const sun = svgBase(`
    <circle cx="32" cy="32" r="12" fill="#FFC107"/>
    ${Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * Math.PI) / 4;
      const x1 = 32 + Math.cos(angle) * 18;
      const y1 = 32 + Math.sin(angle) * 18;
      const x2 = 32 + Math.cos(angle) * 26;
      const y2 = 32 + Math.sin(angle) * 26;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FFC107" stroke-width="3"/>`;
    }).join('')}
  `);

  const cloud = svgBase(`
    <ellipse cx="28" cy="36" rx="14" ry="9" fill="#B0BEC5"/>
    <ellipse cx="40" cy="34" rx="12" ry="8" fill="#CFD8DC"/>
    <ellipse cx="22" cy="32" rx="10" ry="6" fill="#ECEFF1"/>
  `);

  const rain = svgBase(`
    <ellipse cx="28" cy="34" rx="14" ry="8" fill="#B0BEC5"/>
    <ellipse cx="40" cy="32" rx="12" ry="7" fill="#CFD8DC"/>
    ${[20, 28, 36, 44].map(x => `<line x1="${x}" y1="44" x2="${x-2}" y2="58" stroke="#2196F3" stroke-width="3"/>`).join('')}
  `);

  const snow = svgBase(`
    <ellipse cx="30" cy="34" rx="14" ry="8" fill="#B0BEC5"/>
    ${[20, 28, 36, 44].map(x => `
      <line x1="${x}" y1="46" x2="${x}" y2="58" stroke="#90CAF9" stroke-width="2"/>
      <line x1="${x-3}" y1="52" x2="${x+3}" y2="52" stroke="#90CAF9" stroke-width="2"/>
    `).join('')}
  `);

  const thunder = svgBase(`
    <ellipse cx="34" cy="30" rx="14" ry="8" fill="#B0BEC5"/>
    <polygon points="30,40 38,40 32,56 40,56" fill="#FFC107"/>
  `);

  const fog = svgBase(`
    ${[24, 32, 40, 48].map(y => `<rect x="12" y="${y}" width="40" height="4" fill="#B0BEC5" />`).join('')}
  `);

  const drizzle = rain;
  const showers = rain;
  const unknown = svgBase(`<text x="10" y="36" font-size="16" fill="#9E9E9E">N/A</text>`);

  if (desc === 'Clear sky') return toDataUrl(sun);
  if (desc === 'Cloudy') return toDataUrl(cloud);
  if (desc === 'Fog') return toDataUrl(fog);
  if (desc === 'Drizzle') return toDataUrl(drizzle);
  if (desc === 'Rain' || desc === 'Rain showers') return toDataUrl(rain);
  if (desc === 'Snow' || desc === 'Snow showers') return toDataUrl(snow);
  if (desc === 'Thunderstorm') return toDataUrl(thunder);
  return toDataUrl(unknown);
}

async function fetchWeather({ latitude, longitude }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // timeout requirement

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }

    const data = await res.json();

    if (!data || !data.current_weather) {
      throw new Error('API response missing current_weather');
    }

    return {
      temperature: data.current_weather.temperature,
      windspeed: data.current_weather.windspeed,
      weathercode: data.current_weather.weathercode,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
}

async function handleSearch() {
  clearError();

  const input = cityInputEl.value.trim();
  if (!input) {
    showError('Please enter a city name.');
    return;
  }

  const key = input.toLowerCase();
  const coords = CITY_COORDS[key];
  if (!coords) {
    showError('Invalid city. Try "Nairobi".');
    return;
  }

  hideResults();
  showLoading();
  searchBtnEl.disabled = true;

  try {
    const weather = await fetchWeather(coords);

    cityNameEl.textContent = capitalize(input);
    tempEl.textContent = Number(weather.temperature).toFixed(1);
    windEl.textContent = Number(weather.windspeed).toFixed(1);

    const desc = weatherCodeToDescriptor(weather.weathercode);
    const iconUrl = svgDataUrlForWeather(weather.weathercode);
    iconEl.src = iconUrl;
    iconEl.alt = `Weather icon: ${desc} (code ${weather.weathercode})`;

    showResults();
  } catch (err) {
    showError(`Unable to retrieve weather: ${err.message}`);
  } finally {
    hideLoading();
    searchBtnEl.disabled = false;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

searchBtnEl.addEventListener('click', handleSearch);
cityInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});
