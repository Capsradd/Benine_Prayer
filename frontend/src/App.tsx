import patternImage from './assets/pattern.png'
import benine_logo from './assets/benine_logo.png'
import menu_button from './assets/menu_button.png'
import imsak from './assets/imsak.svg'
import fajr from './assets/fajr.svg'
import dzuhur from './assets/dzuhur.svg'
import ashar from './assets/ashar.svg'
import maghrib from './assets/maghrib.svg'
import isya from './assets/isha.svg'
import reactIcon from './assets/react.svg'
import tailwindIcon from './assets/tailwind.svg'
import elysiaIcon from './assets/elysia.svg'
import islamicapiIcon from './assets/islamic_api.png'
import osmapIcon from './assets/Openstreetmap.png'
import { useState, useEffect } from 'react';

interface PrayerTimes {
  imsak?: string;
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>({});
  const [hijriDate, setHijriDate] = useState<string>('1 Ramadhan 1447 AH');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [cityName, setCityName] = useState<string>('Jakarta');
  const [latitude, setLatitude] = useState<number>(-6.1753083);
  const [longitude, setLongitude] = useState<number>(106.822347);
  const [cityInput, setCityInput] = useState<string>('');
  const [isEditingCity, setIsEditingCity] = useState<boolean>(false);
  const [utcOffset, setUtcOffset] = useState<string>('+07:00');

  const toggleItem = (item: string) => {
    setCheckedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item) 
        : [...prev, item]
    );
  };

  const searchCity = async () => {
    if (!cityInput.trim()) {
      setIsEditingCity(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/geocode?city=${encodeURIComponent(cityInput)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to find city');
      }
      
      const data = await response.json();
      setCityName(data.city);
      setLatitude(data.lat);
      setLongitude(data.lon);
      setIsEditingCity(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find city');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      // Calculate time based on UTC offset
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      
      // Parse UTC offset (e.g., "+07:00" or "-05:00")
      const offsetSign = utcOffset.charAt(0) === '-' ? -1 : 1;
      const offsetHours = parseInt(utcOffset.substring(1, 3));
      const offsetMinutes = parseInt(utcOffset.substring(4, 6));
      const totalOffsetMs = offsetSign * (offsetHours * 60 + offsetMinutes) * 60000;
      
      const cityTime = new Date(utc + totalOffsetMs);
      setCurrentTime(cityTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [utcOffset]);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        setLoading(true);
        
       // 20 = indonesia (kemenag), 3 = Muslim World League (default for non-indonesia)
        const isIndonesia = cityName.toLowerCase().includes('indonesia');
        const method = isIndonesia ? 20 : 3;
        
        const response = await fetch(
          `http://localhost:3000/api/prayer-times?lat=${latitude}&lon=${longitude}&method=${method}&school=1`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch prayer times');
        }
        
        const result = await response.json();
        
        const times = result.data?.times || {};
        setPrayerTimes({
          imsak: times.Imsak,
          fajr: times.Fajr,
          dhuhr: times.Dhuhr,
          asr: times.Asr,
          maghrib: times.Maghrib,
          isha: times.Isha,
        });
        

        const hijri = result.data?.date?.hijri;
        if (hijri) {
          setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} ${hijri.designation.abbreviated}`);
        }
        
        // Extract timezone offset
        const timezone = result.data?.timezone;
        if (timezone?.utc_offset) {
          setUtcOffset(timezone.utc_offset);
        }
        
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching prayer times:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
  }, [latitude, longitude, cityName]);

  return (
  <div className="bg-[#09637E] h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col"> {/*background color / main container*/}
   {/*header section*/}
    <header className="bg-[#088395] rounded-b-[71px] relative z-0 h-60 sm:h-64 md:h-56 lg:h-64">
      <img src={patternImage} className='w-full h-full object-cover rounded-b-[71px]' />
      <div className="absolute inset-0 max-w-[95%] mx-auto w-full">    
        <div className="absolute top-1/2 md:top-1/3 left-[16px] md:left-[0px] transform -translate-y-1/2">
          {/*content on the left */}
          <img src={benine_logo} className="w-24 md:w-32" />
          <p className="text-white font-bold text-xl md:text-3xl">Prayer Time 1.0</p>
        </div>
        <div className="absolute top-1/2 md:top-1/3 right-[16px] md:right-[0px] transform -translate-y-1/2">
          {/*content on the right */}
          <img src={menu_button} className="w-14 md:w-auto" />
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
          <p>{hijriDate}</p>
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
              { name: 'imsak', time: prayerTimes.imsak, icon: imsak },
              { name: 'fajr', time: prayerTimes.fajr, icon: fajr },
              { name: 'dhuhr', time: prayerTimes.dhuhr, icon: dzuhur },
              { name: 'asr', time: prayerTimes.asr, icon: ashar },
              { name: 'maghrib', time: prayerTimes.maghrib, icon: maghrib },
              { name: 'isha', time: prayerTimes.isha, icon: isya },
            ].map((prayer, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                  <img src={prayer.icon} className="w-14 h-14 mb-1" />     
                  <p className="text-l font-bold">{prayer.name}</p>  
                  {/* The Time */}
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
            onKeyPress={(e) => {
              if (e.key === 'Enter') searchCity();
              if (e.key === 'Escape') setIsEditingCity(false);
            }}
            onBlur={() => cityInput.trim() && searchCity()}
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
          {['Tarawih', 'Tadarus', 'Sholat', 'Sadaqah'].map((item) => {
            const isChecked = checkedItems.includes(item);
            
            return (
              <div 
                key={item} 
                onClick={() => toggleItem(item)}
                className="flex justify-between items-center border-b border-white/20 pb-2 cursor-pointer group"
              >
                {/* Text: Becomes gray and gets a line-through when checked */}
                <span className={`text-lg transition-all duration-300 ${
                  isChecked ? 'text-gray-400 line-through' : 'text-white font-medium'
                }`}>
                  {item}
                </span>
                
                {/* The Circle: Changes color or adds a checkmark icon when clicked */}
                <div className={`w-5 h-5 rounded-full transition-colors duration-300 flex items-center justify-center ${
                  isChecked ? 'bg-green-400' : 'bg-gray-300 group-hover:bg-white/50'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-[#107593]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <img src={patternImage} className='absolute inset-0 w-full h-full object-cover opacity-30' />
    <div className='absolute inset-0 bg-[#064a5e]/80'></div>
    <div className='relative text-white flex flex-wrap justify-between items-start w-full px-4 md:px-8 py-8 text-[15px] gap-6'>
        <div className="text-left">
            <p className='font-semibold mb-1'>Made while fasting using</p>
            <div className='flex space-x-4 mt-3 mb-3'>
                <a href="https://react.dev/" target="_blank"><img src={reactIcon} className='w-10 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://tailwindcss.com" target="_blank"><img src={tailwindIcon} className='w-10 translate-y-1 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://elysiajs.com/" target="_blank"><img src={elysiaIcon} className='w-10 hover:scale-110 transition-transform duration-200' /></a>
                <a href="https://islamicapi.com/" target="_blank"><img src={islamicapiIcon} className='w-45 hover:scale-110 transition-transform duration-200 brightness-0 invert' /></a>
                <a href="https://openstreetmap.org/" target="_blank"><img src={osmapIcon} className='w-10 hover:scale-110 transition-transform duration-200' /></a>
            </div>
            <p className='opacity-70'>react, tailwind css, elysia, islamic api, openstreetmap api</p>
        </div>
        <div className="flex flex-row items-start justify-start md:justify-end gap-8 md:ml-auto">
          <div className='text-left'> 
            <img src={benine_logo} className='w-35'/>
            <p className='mt-2 opacity-70'>Website Prayer_Time by Raddin Pratama/B9 Media, <br/> All right not reseve yet</p>
          </div>
        </div>
    </div>
    </footer>
  </div>
  )
}

export default App