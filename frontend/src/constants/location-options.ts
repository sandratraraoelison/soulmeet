export const COUNTRY_OPTIONS = [
  'Algeria', 'Angola', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Benin',
  'Botswana', 'Brazil', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia',
  'Cameroon', 'Canada', 'Cape Verde', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Côte d’Ivoire",
  'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic',
  'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Guinea', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan',
  'Jordan', 'Kenya', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico',
  'Morocco', 'Mozambique', 'Namibia', 'Netherlands', 'New Zealand', 'Niger',
  'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore',
  'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Tanzania', 'Thailand', 'Togo', 'Tunisia', 'Turkey',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Venezuela', 'Vietnam', 'Zambia', 'Zimbabwe',
] as const;

const CITY_OPTIONS_BY_COUNTRY: Record<string, readonly string[]> = {
  Australia: ['Adelaide', 'Brisbane', 'Canberra', 'Melbourne', 'Perth', 'Sydney'],
  Belgium: ['Antwerp', 'Bruges', 'Brussels', 'Ghent', 'Liège'],
  Brazil: ['Belo Horizonte', 'Brasília', 'Curitiba', 'Rio de Janeiro', 'Salvador', 'São Paulo'],
  Cameroon: ['Bafoussam', 'Douala', 'Garoua', 'Yaoundé'],
  Canada: ['Calgary', 'Edmonton', 'Montréal', 'Ottawa', 'Toronto', 'Vancouver'],
  China: ['Beijing', 'Chengdu', 'Guangzhou', 'Shanghai', 'Shenzhen'],
  France: ['Bordeaux', 'Lille', 'Lyon', 'Marseille', 'Montpellier', 'Nantes', 'Nice', 'Paris', 'Strasbourg', 'Toulouse'],
  Germany: ['Berlin', 'Cologne', 'Düsseldorf', 'Frankfurt', 'Hamburg', 'Munich'],
  India: ['Bengaluru', 'Chennai', 'Delhi', 'Hyderabad', 'Kolkata', 'Mumbai'],
  Italy: ['Bologna', 'Florence', 'Milan', 'Naples', 'Rome', 'Turin'],
  Japan: ['Fukuoka', 'Kyoto', 'Nagoya', 'Osaka', 'Sapporo', 'Tokyo'],
  Kenya: ['Kisumu', 'Mombasa', 'Nairobi', 'Nakuru'],
  Madagascar: ['Antananarivo', 'Antsirabe', 'Fianarantsoa', 'Mahajanga', 'Toamasina', 'Toliara'],
  Mauritius: ['Curepipe', 'Port Louis', 'Quatre Bornes', 'Vacoas'],
  Morocco: ['Agadir', 'Casablanca', 'Fes', 'Marrakesh', 'Rabat', 'Tangier'],
  Netherlands: ['Amsterdam', 'Eindhoven', 'Rotterdam', 'The Hague', 'Utrecht'],
  Nigeria: ['Abuja', 'Ibadan', 'Kano', 'Lagos', 'Port Harcourt'],
  Portugal: ['Braga', 'Coimbra', 'Lisbon', 'Porto'],
  Russia: ['Kazan', 'Moscow', 'Novosibirsk', 'Saint Petersburg', 'Yekaterinburg'],
  Senegal: ['Dakar', 'Kaolack', 'Saint-Louis', 'Thiès'],
  'South Africa': ['Cape Town', 'Durban', 'Johannesburg', 'Port Elizabeth', 'Pretoria'],
  'South Korea': ['Busan', 'Daegu', 'Daejeon', 'Incheon', 'Seoul'],
  Spain: ['Barcelona', 'Bilbao', 'Madrid', 'Málaga', 'Seville', 'Valencia'],
  Switzerland: ['Basel', 'Bern', 'Geneva', 'Lausanne', 'Zürich'],
  Turkey: ['Ankara', 'Antalya', 'Istanbul', 'Izmir'],
  'United Arab Emirates': ['Abu Dhabi', 'Dubai', 'Sharjah'],
  'United Kingdom': ['Birmingham', 'Bristol', 'Edinburgh', 'Glasgow', 'London', 'Manchester'],
  'United States': ['Atlanta', 'Boston', 'Chicago', 'Dallas', 'Houston', 'Los Angeles', 'Miami', 'New York', 'San Francisco', 'Seattle', 'Washington'],
};

export const CITY_OPTIONS = [...new Set(Object.values(CITY_OPTIONS_BY_COUNTRY).flat())]
  .sort((a, b) => a.localeCompare(b));

const normalizeCountry = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const cityOptionsForCountry = (country: string) => {
  const aliases: Record<string, string> = {
    korea: 'south korea',
    'republic of korea': 'south korea',
    'korea republic of': 'south korea',
  };
  const normalized = normalizeCountry(country);
  const selected = aliases[normalized] ?? normalized;
  const key = Object.keys(CITY_OPTIONS_BY_COUNTRY).find(
    (candidate) => normalizeCountry(candidate) === selected,
  );
  return key ? CITY_OPTIONS_BY_COUNTRY[key] ?? [] : [];
};
