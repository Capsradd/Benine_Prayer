import { useState, useEffect, useCallback, useRef } from 'react';

interface PrayerTimes {
  imsak?: string;
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

interface ApiResponse {
  city: string;
  lat: number;
  lon: number;
  prayerTimes: {
    data?: {
      times?: Record<string, string>;
      date?: {
        hijri?: {
          day: string;
          month: { en: string };
          year: string;
          designation: { abbreviated: string };
        };
      };
      timezone?: {
        utc_offset?: string;
      };
    };
  };
  currentTime?: {
    utcOffset: string;
    timestamp: number;
  };
  isIndonesia: boolean;
}

// Constants moved outside component for better performance
const PRAYER_ICONS = {
  imsak: '/icon_pray/imsak.svg',
  fajr: '/icon_pray/fajr.svg',
  dhuhr: '/icon_pray/dzuhur.svg',
  asr: '/icon_pray/ashar.svg',
  maghrib: '/icon_pray/maghrib.svg',
  isha: '/icon_pray/isha.svg',
} as const;

const DAILY_TRACKER_ITEMS = ['Tarawih', 'Tadarus', 'Sholat', 'Sadaqah'] as const;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>({
    imsak: '04:45',
    fajr: '04:55', 
    dhuhr: '12:05',
    asr: '15:25',
    maghrib: '18:15',
    isha: '19:35'
  });
  const [hijriDate, setHijriDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string>('Jakarta, Indonesia');
  const [latitude, setLatitude] = useState<number>(-6.1753083);
  const [longitude, setLongitude] = useState<number>(106.822347);
  const [cityInput, setCityInput] = useState<string>('');
  const [isEditingCity, setIsEditingCity] = useState<boolean>(false);
  const [utcOffset, setUtcOffset] = useState<string>('+07:00');
  
  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set default Hijri date on mount
  useEffect(() => {
    // Function to get accurate Hijri date from our backend (just for the date, not prayer times)
    const getHijriDate = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/prayer-data?city=Jakarta`);
        
        if (response.ok) {
          const result: ApiResponse = await response.json();
          const hijri = result.prayerTimes?.data?.date?.hijri;
          if (hijri) {
            setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} ${hijri.designation.abbreviated}`);
            return;
          }
        }
      } catch (error) {
        console.log('Failed to fetch Hijri date, using fallback');
      }

      // Fallback: Calculate approximate Hijri date
      const today = new Date();
      const hijriMonths = ['Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani', 'Jumada al-awwal', 'Jumada al-thani', 
                          'Rajab', 'Sha\'ban', 'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'];
      
      // Approximate Hijri date calculation (simplified)
      const gregorianYear = today.getFullYear();
      const hijriYear = Math.floor((gregorianYear - 622) * 1.031) + 1;
      const dayOfYear = Math.floor((today.getTime() - new Date(gregorianYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
      const hijriMonthIndex = Math.floor((dayOfYear / 30.4) % 12);
      const hijriDay = Math.floor(dayOfYear % 30.4) + 1;
      
      setHijriDate(`${hijriDay} ${hijriMonths[hijriMonthIndex]} ${hijriYear} AH`);
    };

    getHijriDate();
  }, []);

  const toggleItem = useCallback((item: string) => {
    setCheckedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  }, []);

  const applyPrayerData = useCallback((result: ApiResponse) => {
    setCityName(result.city);
    setLatitude(result.lat);
    setLongitude(result.lon);

    const times = result.prayerTimes?.data?.times || {};
    setPrayerTimes({
      imsak: times.Imsak,
      fajr: times.Fajr,
      dhuhr: times.Dhuhr,
      asr: times.Asr,
      maghrib: times.Maghrib,
      isha: times.Isha,
    });

    const hijri = result.prayerTimes?.data?.date?.hijri;
    if (hijri) {
      setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} ${hijri.designation.abbreviated}`);
    }

    // Use backend-calculated timezone offset for better performance
    if (result.currentTime?.utcOffset) {
      setUtcOffset(result.currentTime.utcOffset);
    } else {
      // Fallback to prayer times timezone if currentTime not available  
      const timezone = result.prayerTimes?.data?.timezone;
      if (timezone?.utc_offset) {
        setUtcOffset(timezone.utc_offset);
      }
    }
  }, []);

  const searchCity = useCallback(async () => {
    if (!cityInput.trim()) {
      setIsEditingCity(false);
      return;
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${API_BASE_URL}/api/prayer-data?city=${encodeURIComponent(cityInput)}`,
        { signal: abortControllerRef.current.signal }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to find city: ${response.status}`);
      }
      
      const result: ApiResponse = await response.json();
      applyPrayerData(result);

      setIsEditingCity(false);
      setCityInput(''); // Clear input after successful search
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Failed to find city');
        console.error('Search error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [cityInput, applyPrayerData]);

  const prayer_icons = PRAYER_ICONS;

  // Memoize timezone calculation
  const timezoneOffsetMs = useCallback(() => {
    const offsetSign = utcOffset.charAt(0) === '-' ? -1 : 1;
    const offsetHours = parseInt(utcOffset.substring(1, 3));
    const offsetMinutes = parseInt(utcOffset.substring(4, 6));
    return offsetSign * (offsetHours * 60 + offsetMinutes) * 60000;
  }, [utcOffset]);

  useEffect(() => {
    const totalOffsetMs = timezoneOffsetMs();

    const updateTime = () => {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const cityTime = new Date(utc + totalOffsetMs);
      setCurrentTime(cityTime);
    };

    updateTime(); // Update immediately
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, [timezoneOffsetMs]);

  // Only call API when user searches, not on page load

  return (
  <div className="bg-[#09637E] h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col">
    <header className="bg-[#088395] rounded-b-[71px] relative z-0 h-60 sm:h-64 md:h-56 lg:h-64">
      <img src="/pattern.png" alt="Background pattern" className='w-full h-full object-cover rounded-b-[71px]' />
      <div className="absolute inset-0 max-w-[95%] mx-auto w-full">    
        <div className="absolute top-1/2 md:top-1/3 left-[16px] md:left-[0px] transform -translate-y-1/2">
          <img src="/benine_logo.png" alt="Benine Logo" className="w-24 md:w-32" />
          <p className="text-white font-bold text-xl md:text-3xl">Prayer Time 1.0</p>
        </div>
        <div className="absolute top-1/2 md:top-1/3 right-[16px] md:right-[0px] transform -translate-y-1/2">
          <img src="/menu_button.png" alt="Menu" className="w-14 md:w-auto" />
        </div>
      </div>
    </header>
    <main className="grid grid-cols-1 md:grid-cols-12 gap-4 text-white mt-4 sm:mt-2 md:-mt-16 lg:-mt-20 z-20 relative px-4 md:px-8">
      {/*main content*/}

      {/*BOX 1 - time*/}
      <div className="bg-[#107593] rounded-[20px] p-6 md:col-span-3 text-center flex flex-col justify-center min-h-[200px]">
        <h2 className="text-6xl font-bold tracking-tighter">
            {currentTime.getHours().toString().padStart(2, '0')}
            <span className="animate-pulse">.</span>
            {currentTime.getMinutes().toString().padStart(2, '0')}
        </h2>
        <p className="text-lg opacity-80 mt-2">
          <span className="block">{hijriDate}</span>
          {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/*BOX 2 - prayer times*/}
      <div className="bg-[#107593] rounded-[20px] p-6 md:col-span-6 flex flex-col justify-center">
        {loading ? (
          <div className="text-center">
            <p className="text-xl">Loading prayer times...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="text-xl text-red-300">Error: {error}</p>
          </div>
        ) : (
          <div className='flex flex-wrap justify-center items-center text-center gap-4 md:gap-20'>
            {[
              { name: 'imsak', time: prayerTimes.imsak, icon: prayer_icons.imsak },
              { name: 'fajr', time: prayerTimes.fajr, icon: prayer_icons.fajr },
              { name: 'dhuhr', time: prayerTimes.dhuhr, icon: prayer_icons.dhuhr },
              { name: 'asr', time: prayerTimes.asr, icon: prayer_icons.asr },
              { name: 'maghrib', time: prayerTimes.maghrib, icon: prayer_icons.maghrib },
              { name: 'isha', time: prayerTimes.isha, icon: prayer_icons.isha },
            ].map((prayer) => (
              <div key={prayer.name} className="flex flex-col items-center gap-1">
                  <img src={prayer.icon} alt={`${prayer.name} prayer icon`} className="w-14 h-14 mb-1" />     
                  <p className="text-l font-bold capitalize">{prayer.name}</p>  
                  <p className="text-lg font-medium">{prayer.time}</p>
                </div>
            ))}
        </div>
        )}
      </div>

      {/*BOX 3 - location*/}
      <div className="bg-[#107593] rounded-[20px] p-6 md:col-span-3 text-center flex flex-col justify-center min-h-[200px] gap-3">
        {isEditingCity ? (
          <input 
            type="text" 
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') searchCity();
              if (e.key === 'Escape') {
                setIsEditingCity(false);
                setCityInput('');
              }
            }}
            onBlur={() => {
              if (cityInput.trim()) {
                searchCity();
              } else {
                setIsEditingCity(false);
              }
            }}
            placeholder="Enter city name"
            autoFocus
            className='text-2xl font-bold px-3 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/40 focus:outline-none focus:border-white text-center'
          />
        ) : (
          <div 
            className='flex items-center justify-center gap-3 cursor-pointer group'
            onClick={() => {
              setCityInput(cityName);
              setIsEditingCity(true);
            }}
            title="Click to change city"
          >
            <h1 className='text-3xl font-bold group-hover:text-white/80 transition-colors'>
              {cityName}
            </h1>
            <svg 
              className="w-8 h-8 opacity-70 group-hover:opacity-100 transition-opacity" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="3" 
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
        )}
        <p className='text-xl opacity-80'>
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </p>
      </div>

      {/*BOX 4 - hadits*/}
      <div className="bg-[#107593] rounded-[20px] p-6 md:col-span-9">
        <h1 className='text-xl font-bold'>Hadits</h1>
        <div className='w-full text-left mt-4 pt-5 pb-15 flex justify-center'>
          <div className='pl-8 md:pl-16 pr-4 md:pr-8'>
            <h2 className='text-4xl font-bold mt-4'>"مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ."</h2>
            <p className='text-xl mt-2'>"Whoever fasts Ramadan out of faith and hoping for a reward from Allah, his past sins will be forgiven." <br/> (HR. Bukhari and Muslim)</p>
          </div>
         </div>
        </div>
      {/* BOX 5 - Daily Tracker */}
      <div className="bg-[#107593] rounded-[20px] p-6 md:col-span-3 ">
        <h1 className='text-xl font-bold mb-6 text-white'>Daily Tracker</h1>
        
        <div className="flex flex-col gap-4">
          {DAILY_TRACKER_ITEMS.map((item) => {
            const isChecked = checkedItems.includes(item);
            
            return (
              <div 
                key={item} 
                onClick={() => toggleItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleItem(item);
                  }
                }}
                tabIndex={0}
                role="checkbox"
                aria-checked={isChecked}
                className="flex justify-between items-center border-b border-white/20 pb-2 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
              >
                <span className={`text-lg transition-all duration-300 ${
                  isChecked ? 'text-gray-400 line-through' : 'text-white font-medium'
                }`}>
                  {item}
                </span>
                
                <div className={`w-5 h-5 rounded-full transition-colors duration-300 flex items-center justify-center ${
                  isChecked ? 'bg-green-400' : 'bg-gray-300 group-hover:bg-white/50'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-[#107593]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  <div className='flex-grow min-h-4'></div>
  <footer className='relative overflow-hidden rounded-t-[40px] min-h-fit'>
    <img src="/pattern.png" className='absolute inset-0 w-full h-full object-cover opacity-30' />
    <div className='absolute inset-0 bg-[#064a5e]/80'></div>
    <div className='relative text-white flex flex-wrap justify-between items-start w-full px-4 md:px-8 py-8 text-[15px] gap-6'>
        <div className="text-left">
            <p className='font-semibold mb-1'>Made while fasting using</p>
            <div className='flex space-x-4 mt-3 mb-3'>
                <a href="https://react.dev/" target="_blank" rel="noopener noreferrer"><img src="/logo_footer/react.svg" alt="React" className='w-10 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer"><img src="/logo_footer/tailwind.svg" alt="Tailwind CSS" className='w-10 translate-y-1 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://elysiajs.com/" target="_blank" rel="noopener noreferrer"><img src="/logo_footer/elysia.svg" alt="Elysia" className='w-10 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://islamicapi.com/" target="_blank" rel="noopener noreferrer"><img src="/logo_footer/islamic_api.png" alt="Islamic API" className='w-45 hover:scale-110 transition-transform duration-200 brightness-0 invert' /></a>
                <a href="https://openstreetmap.org/" target="_blank" rel="noopener noreferrer"><img src="/logo_footer/Openstreetmap.png" alt="OpenStreetMap" className='w-10 hover:scale-110 transition-transform duration-200' /></a>
            </div>
            <p className='opacity-70'>react, tailwind css, elysia, islamic api, openstreetmap api</p>
        </div>
        <div className="flex flex-row items-start justify-start md:justify-end gap-8 md:ml-auto">
          <div className='text-left'> 
            <img src="benine_logo.png" alt="Benine Logo" className='w-35'/>
            <p className='mt-2 opacity-70'>Website Prayer_Time by <a href="https://github.com/Capsradd" target="_blank" className="text-blue-300 hover:underline">Raddin Pratama </a>/ B9 Media, <br/> All right not reseve yet</p>
          </div>
        </div>
    </div>
    </footer>
  </div>
  )
}

export default App