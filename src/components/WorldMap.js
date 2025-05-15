import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import './WorldMap.css';

// World map JSON data
const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

const WorldMap = ({ API_URL }) => {
  const [countryData, setCountryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Country name to ISO code mapping (comprehensive list including smaller countries)
  const countryToISO = {
    'United States': 'USA',
    'Canada': 'CAN',
    'United Kingdom': 'GBR',
    'Australia': 'AUS',
    'Germany': 'DEU',
    'France': 'FRA',
    'Italy': 'ITA',
    'Spain': 'ESP',
    'Japan': 'JPN',
    'China': 'CHN',
    'India': 'IND',
    'Brazil': 'BRA',
    'Russia': 'RUS',
    'South Africa': 'ZAF',
    'Mexico': 'MEX',
    'Argentina': 'ARG',
    'Netherlands': 'NLD',
    'Sweden': 'SWE',
    'Norway': 'NOR',
    'Finland': 'FIN',
    'Denmark': 'DNK',
    'Poland': 'POL',
    'Switzerland': 'CHE',
    'Austria': 'AUT',
    'Belgium': 'BEL',
    'Portugal': 'PRT',
    'Greece': 'GRC',
    'Turkey': 'TUR',
    'Egypt': 'EGY',
    'Saudi Arabia': 'SAU',
    'UAE': 'ARE',
    'Singapore': 'SGP',
    'Malaysia': 'MYS',
    'Indonesia': 'IDN',
    'Thailand': 'THA',
    'Vietnam': 'VNM',
    'South Korea': 'KOR',
    'New Zealand': 'NZL',
    'Ireland': 'IRL',
    'Ukraine': 'UKR',
    'Israel': 'ISR',
    // Adding smaller and less common countries
    'Faroe Islands': 'FRO',
    'Iceland': 'ISL',
    'Greenland': 'GRL',
    'Luxembourg': 'LUX',
    'Monaco': 'MCO',
    'Liechtenstein': 'LIE',
    'Andorra': 'AND',
    'San Marino': 'SMR',
    'Vatican City': 'VAT',
    'Malta': 'MLT',
    'Cyprus': 'CYP',
    'Estonia': 'EST',
    'Latvia': 'LVA',
    'Lithuania': 'LTU',
    'Belarus': 'BLR',
    'Moldova': 'MDA',
    'Romania': 'ROU',
    'Bulgaria': 'BGR',
    'Serbia': 'SRB',
    'Croatia': 'HRV',
    'Slovenia': 'SVN',
    'Bosnia and Herzegovina': 'BIH',
    'North Macedonia': 'MKD',
    'Albania': 'ALB',
    'Montenegro': 'MNE',
    'Kosovo': 'XKX',
    'Georgia': 'GEO',
    'Armenia': 'ARM',
    'Azerbaijan': 'AZE',
    'Kazakhstan': 'KAZ',
    'Uzbekistan': 'UZB',
    'Turkmenistan': 'TKM',
    'Kyrgyzstan': 'KGZ',
    'Tajikistan': 'TJK',
    'Mongolia': 'MNG',
    'Nepal': 'NPL',
    'Bhutan': 'BTN',
    'Bangladesh': 'BGD',
    'Sri Lanka': 'LKA',
    'Maldives': 'MDV',
    'Cambodia': 'KHM',
    'Laos': 'LAO',
    'Myanmar': 'MMR',
    'Philippines': 'PHL',
    'Brunei': 'BRN',
    'East Timor': 'TLS',
    'Papua New Guinea': 'PNG',
    'Fiji': 'FJI',
    'Solomon Islands': 'SLB',
    'Vanuatu': 'VUT',
    'Samoa': 'WSM',
    'Tonga': 'TON',
    'Kiribati': 'KIR',
    'Micronesia': 'FSM',
    'Marshall Islands': 'MHL',
    'Palau': 'PLW',
    'Nauru': 'NRU',
    'Tuvalu': 'TUV',
    'Unknown': 'UNK'
  };

  // Fetch country data
  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/stats/users-by-country`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch country data');
        }
        
        const data = await response.json();
        setCountryData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching country data:', err.message);
        setError('Failed to load country statistics');
        
        // Use mock data for demo if API fails
        setCountryData([
          { country: 'United States', user_count: 120 },
          { country: 'Germany', user_count: 85 },
          { country: 'United Kingdom', user_count: 67 },
          { country: 'Canada', user_count: 45 },
          { country: 'Australia', user_count: 38 },
          { country: 'France', user_count: 32 },
          { country: 'Japan', user_count: 28 },
          { country: 'Brazil', user_count: 25 },
          { country: 'India', user_count: 22 },
          { country: 'Spain', user_count: 18 },
          { country: 'Faroe Islands', user_count: 15 },
          { country: 'Iceland', user_count: 12 },
          { country: 'Greenland', user_count: 8 },
          { country: 'Luxembourg', user_count: 7 },
          { country: 'Monaco', user_count: 5 },
          { country: 'Liechtenstein', user_count: 4 },
          { country: 'Andorra', user_count: 3 },
          { country: 'San Marino', user_count: 2 },
          { country: 'Vatican City', user_count: 1 },
          { country: 'Unknown', user_count: 10 }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCountryData();
  }, [API_URL]);

  // Create color scale based on user count
  const maxUsers = Math.max(...countryData.map(d => d.user_count), 1);
  const colorScale = scaleLinear()
    .domain([0, maxUsers])
    .range(['#1a1a2e', '#8a2be2']);

  // Handle tooltip
  const handleMouseEnter = (geo, data) => {
    setTooltipContent(`${geo.properties.name}: ${data ? data.user_count : 0} users`);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setTooltipContent('');
    setShowTooltip(false);
  };

  const handleMouseMove = (e) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="world-map-container">
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading world map data...</p>
        </div>
      ) : (
        <>
          {error && <div className="map-error">{error}</div>}
          
          <div className="map-stats">
            <h3>User Distribution by Country</h3>
            <div className="stats-grid">
              {countryData.slice(0, 10).map((item, index) => (
                <div key={index} className="stat-item">
                  <span className="country-name">{item.country}</span>
                  <span className="user-count">{item.user_count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="map-wrapper" onMouseMove={handleMouseMove}>
            <ComposableMap projection="geoMercator">
              <ZoomableGroup center={[0, 20]} zoom={1}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map(geo => {
                      const countryISO = geo.properties.id;
                      const countryName = Object.keys(countryToISO).find(
                        key => countryToISO[key] === countryISO
                      );
                      const currentCountry = countryData.find(
                        d => d.country === countryName
                      );
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={currentCountry ? colorScale(currentCountry.user_count) : '#1a1a2e'}
                          stroke="#2a2a40"
                          strokeWidth={0.5}
                          onMouseEnter={() => handleMouseEnter(geo, currentCountry)}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            default: { outline: 'none' },
                            hover: { outline: 'none', fill: '#6a5acd' },
                            pressed: { outline: 'none' }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            
            {showTooltip && (
              <div 
                className="map-tooltip"
                style={{
                  left: tooltipPosition.x + 10,
                  top: tooltipPosition.y - 40
                }}
              >
                {tooltipContent}
              </div>
            )}
          </div>
          
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#1a1a2e' }}></span>
              <span>0 users</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#8a2be2' }}></span>
              <span>{maxUsers} users</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorldMap;
