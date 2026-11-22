const PERIOD_TITLES = {
  Day: 'Топ за день',

  Week: 'Топ за неделю',
  Month: 'Топ за месяц',

  AllTime: 'Топ за всё время',
  CurrentStream: 'Топ за стрим'
};


const CURRENCY_SYMBOLS = {
  RUB: '₽',

  USD: '$',

  EUR: '€',
  KZT: '₸',
  BYN: 'Br',
  UAH: '₴'
};


const card = document.getElementById('widget-card');
const chatContainer = document.getElementById('chat-messages');
const donatorsList = document.getElementById('donators-list');
const topTitleEl = document.getElementById('top-title');

// Элементы полоски сбора
const goalContainer = document.getElementById('goal-container');

const goalNameEl = document.getElementById('goal-name');
const goalStatsEl = document.getElementById('goal-stats');
const goalBarFillEl = document.getElementById('goal-bar-fill');
const goalPercentEl = document.getElementById('goal-percent');

topTitleEl.textContent = PERIOD_TITLES[CONFIG.DONATEX_PERIOD] || 'Топ донатеров';


let isFlipped = false;
let timeLeft = CONFIG.CHAT_SECONDS;
let globalEmotesMap = new Map();
let lastDonateXFetchTime = 0;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}


function replaceGlobalEmotesInText(text) {
  return text.split(/(\s+)/).map(part => {
    if (globalEmotesMap.has(part)) {
      const url = globalEmotesMap.get(part);
      const safeName = escapeHtml(part);
      return `<img class="chat-emote" src="${url}" alt="${safeName}" title="${safeName}">`;
    }
    return escapeHtml(part);
  }).join('');
}

function formatMessageWithEmotes(message, emotes) {
  if (!emotes) {

    return replaceGlobalEmotesInText(message);

  }

  const replacements = [];
  for (const [emoteId, positions] of Object.entries(emotes)) {
    positions.forEach(pos => {
      const [start, end] = pos.split('-').map(Number);
      replacements.push({ id: emoteId, start, end });
    });
  }

  replacements.sort((a, b) => a.start - b.start);

  const chars = Array.from(message);
  let result = '';
  let lastIndex = 0;

  replacements.forEach(({ id, start, end }) => {
    if (start > lastIndex) {
      const textChunk = chars.slice(lastIndex, start).join('');
      result += replaceGlobalEmotesInText(textChunk);
    }

    const emoteName = chars.slice(start, end + 1).join('');
    const safeName = escapeHtml(emoteName);
    const emoteUrl = globalEmotesMap.get(emoteName) || `https://jtvnw.net{id}/default/dark/2.0`;
    result += `<img class="chat-emote" src="${emoteUrl}" alt="${safeName}" title="${safeName}">`;

    lastIndex = end + 1;
  });

  if (lastIndex < chars.length) {
    const tailChunk = chars.slice(lastIndex).join('');
    result += replaceGlobalEmotesInText(tailChunk);
  }


  return result;
}


async function loadEmotes() {
  try {
    globalEmotesMap = await API.getTwitchGlobalEmotes();
    console.log(`Загружено глобальных смайлов Twitch: ${globalEmotesMap.size}`);
  } catch (error) {
    console.error('Ошибка загрузки смайлов Twitch:', error);
  }
}


async function updateDonateXData(force = false) {
  const now = Date.now();
  const cacheMs = (CONFIG.DONATEX_CACHE_SECONDS || 300) * 1000;

  if (!force && lastDonateXFetchTime > 0 && (now - lastDonateXFetchTime) < cacheMs) {
    return;
  }

  try {
    const [donators, goal] = await Promise.all([
      API.getTopDonators(),
      API.getCurrentGoal().catch(err => {
        console.warn('DonateX goal fetch error:', err);
        return null;
      })
    ]);


    renderDonators(donators);
    renderGoal(goal);
    lastDonateXFetchTime = Date.now();
  } catch (error) {
    console.error('DonateX fetch error:', error);
    if (lastDonateXFetchTime === 0) {

      donatorsList.innerHTML = `<div class="status-msg">Ошибка (${escapeHtml(error.message)})</div>`;
    }
  }
}

function renderDonators(donators) {
  if (donators.length === 0) {
    donatorsList.innerHTML = '<div class="status-msg">Пока нет донатов за этот период</div>';
    return;
  }


  donatorsList.innerHTML = '';


  donators.forEach(item => {
    const rank = Number(item.rank) || 0;
    const username = escapeHtml(item.username || 'Аноним');
    const amount = Number(item.totalAmountInRub || 0).toLocaleString('ru-RU', {
      maximumFractionDigits: 2
    });
    const symbol = CURRENCY_SYMBOLS[item.currency] || item.currency || '₽';
    const dateStr = formatDate(item.lastDonationDate);


    const row = document.createElement('div');
    row.className = `donator-item rank-${rank}`;


    row.innerHTML = `
            <div class="donator-left">

                <span class="donator-rank">#${rank}</span>
                <div class="donator-info">
                    <span class="donator-name" title="${username}">${username}</span>
                    ${dateStr ? `<span class="donator-date">${dateStr}</span>` : ''}
                </div>
            </div>
            <span class="donator-amount">${amount} ${escapeHtml(symbol)}</span>
        `;


    donatorsList.appendChild(row);
  });
}

function renderGoal(goal) {

  if (!goal || !goal.name) {
    goalContainer.style.display = 'none';
    return;
  }

  const symbol = CURRENCY_SYMBOLS[goal.currency] || goal.currency || '₽';
  const current = Number(goal.currentAmount || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  const target = Number(goal.goalAmount || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  const rawPercent = Number(goal.progressPercent) || 0;
  const clampedPercent = Math.min(Math.max(rawPercent, 0), 100);

  goalNameEl.textContent = goal.name;
  goalNameEl.title = goal.name;
  goalStatsEl.textContent = `${current} / ${target} ${symbol}`;
  goalBarFillEl.style.width = `${clampedPercent}%`;
  goalPercentEl.textContent = `${Math.round(rawPercent)}%`;

  goalContainer.classList.toggle('is-completed', Boolean(goal.isCompleted));
  goalContainer.style.display = 'flex';

}

// Инициализация

loadEmotes();
updateDonateXData(true);

setInterval(() => {
  timeLeft--;


  if (!isFlipped && timeLeft === 2) {
    updateDonateXData();
  }

  if (timeLeft <= 0) {
    isFlipped = !isFlipped;
    card.classList.toggle('is-flipped', isFlipped);
    timeLeft = isFlipped ? CONFIG.BACK_SECONDS : CONFIG.CHAT_SECONDS;
  }

}, 1000);

// Подключение к чату Twitch через tmi.js
const client = new tmi.Client({
  channels: [CONFIG.CHANNEL_NAME]
});

client.connect().catch(console.error);

client.on('message', (channel, tags, message, self) => {

  const msgEl = document.createElement('div');
  msgEl.classList.add('message');

  const userEl = document.createElement('span');
  userEl.classList.add('username');
  userEl.style.color = tags['color'] || '#9146FF';
  userEl.textContent = (tags['display-name'] || tags['username']) + ':';


  const textEl = document.createElement('span');
  textEl.innerHTML = formatMessageWithEmotes(message, tags.emotes);


  msgEl.appendChild(userEl);
  msgEl.appendChild(textEl);
  chatContainer.appendChild(msgEl);

  if (chatContainer.children.length > CONFIG.MAX_MESSAGES) {
    chatContainer.removeChild(chatContainer.firstChild);
  }
});

