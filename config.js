const CONFIG = {
  // Настройки Twitch
  CHANNEL_NAME: '',
  TWITCH_ACCESS_TOKEN: '', // <-- Впиши OAuth-токен Twitch
  TWITCH_CLIENT_ID: '',       // <-- Впиши Client-ID приложения Twitch
  MAX_MESSAGES: 5,

  // Настройки DonateX API
  DONATEX_TOKEN: '',
  DONATEX_PERIOD: 'Month',    // Варианты: Day, Week, Month, AllTime, CurrentStream
  DONATEX_COUNT: 5,          // От 1 до 100
  DONATEX_CACHE_SECONDS: 300, // Как часто обновлять данные топа (300 сек = 5 минут)

  // Тайминги переворота (в секундах)
  CHAT_SECONDS: 15,
  BACK_SECONDS: 10
};
