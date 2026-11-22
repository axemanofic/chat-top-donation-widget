const API = {
  // Загрузка глобальных смайлов через Twitch Helix API
  async getTwitchGlobalEmotes() {
    const emotesMap = new Map();

    if (!CONFIG.TWITCH_ACCESS_TOKEN || !CONFIG.TWITCH_CLIENT_ID) {
      console.warn('Twitch API credentials не заданы в config.js');
      return emotesMap;
    }

    const response = await fetch('https://api.twitch.tv/helix/chat/emotes/global', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.TWITCH_ACCESS_TOKEN}`,
        'Client-Id': CONFIG.TWITCH_CLIENT_ID
      }
    });

    if (!response.ok) {
      throw new Error(`Twitch API ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const template = result.template || 'https://jtvnw.net{{id}}/{{format}}/{{theme_mode}}/{{scale}}';

    if (Array.isArray(result.data)) {
      result.data.forEach(emote => {
        const format = emote.format.includes('animated') ? 'animated' : (emote.format || 'static');
        const theme = emote.theme_mode.includes('dark') ? 'dark' : (emote.theme_mode || 'light');
        const scale = emote.scale.includes('2.0') ? '2.0' : (emote.scale || '1.0');

        const url = template
          .replace('{{id}}', emote.id)
          .replace('{{format}}', format)
          .replace('{{theme_mode}}', theme)
          .replace('{{scale}}', scale);

        emotesMap.set(emote.name, url);
      });
    }

    return emotesMap;
  },

  // Загрузка топ-донатеров через DonateX API
  async getTopDonators() {
    const response = await fetch(
      `https://donatex.gg/api/v1/top-donators/?period=${CONFIG.DONATEX_PERIOD}&count=${CONFIG.DONATEX_COUNT}`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.DONATEX_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
  // Загрузка текущего сбора средств через DonateX API
  async getCurrentGoal() {
    const response = await fetch('https://donatex.gg/api/v1/goals/current', {
      headers: {
        Authorization: `Bearer ${CONFIG.DONATEX_TOKEN}`,
      },
    });

    // Если активного сбора нет (например, 404 или 204), возвращаем null
    if (response.status === 404 || response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
};
