const mineflayer = require('mineflayer');
const express = require('express');

// --- 1. RENDER PORT VE WEB SUNUCUSU ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).send('xBetray_Farm AFK Botu 7/24 Aktif!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Web sunucusu ${PORT} portunda başarıyla başlatıldı.`);
});

// --- 2. GLOBAL ÇÖKME KORUMALARI ---
process.on('uncaughtException', (err) => {
  console.log('[Sistem Uyarısı] Hata:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('[Sistem Uyarısı] Rejection:', reason);
});

let bot = null;
let afkInterval = null;
let kontrolInterval = null;
let isConnecting = false;

function botuBaslat() {
  if (isConnecting) return;
  isConnecting = true;

  console.log('RebornCraft sunucusuna bağlanılıyor...');

  try {
    bot = mineflayer.createBot({
      host: 'play.reborncraft.pw',
      port: 25565,
      username: 'xBetray_Farm',
      version: '1.21.6',
      viewDistance: 'tiny',
      checkTimeoutInterval: 120 * 1000,
      physicsEnabled: true
    });
  } catch (err) {
    console.log('Bot başlatma hatası:', err.message);
    sifirlaVeYenidenBaslat();
    return;
  }

  function komutGonder(komut) {
    if (bot && bot._client && typeof bot.chat === 'function') {
      try {
        bot.chat(komut);
      } catch (e) {
        console.log('Komut hatası:', e.message);
      }
    }
  }

  function sifirlaVeYenidenBaslat() {
    if (afkInterval) clearInterval(afkInterval);
    if (kontrolInterval) clearInterval(kontrolInterval);

    isConnecting = false;

    if (bot) {
      try { bot.quit(); } catch (e) {}
      bot = null;
    }

    console.log('10 saniye sonra tekrar bağlanılacak...');
    setTimeout(botuBaslat, 10000);
  }

  // NETHER HOME DÖNÜŞ FONKSİYONU
  function netherHomeDon() {
    console.log('>> Nether evine (/home) ışınlanılıyor...');
    setTimeout(() => komutGonder('/skyblock'), 2000);
    setTimeout(() => komutGonder('/home'), 8000);
  }

  // UZAKTAN /MSG İLE KONTROL FONKSİYONU
  function msgKomutIsle(gonderen, mesajIcerik) {
    const icerik = mesajIcerik.trim().toLowerCase();

    console.log(`>> [UZAKTAN KONTROL] ${gonderen} mesaj attı: ${mesajIcerik}`);

    if (icerik === 'home') {
      komutGonder('/home');
      komutGonder(`/msg ${gonderen} Nether evine (/home) ışınlanıldı!`);
    } else if (icerik === 'durum' || icerik === 'ping') {
      komutGonder(`/msg ${gonderen} Bot aktif ve Nether AFK konumunda!`);
    } else if (icerik.startsWith('komut ')) {
      const gonderilecekKomut = mesajIcerik.substring(6);
      komutGonder(gonderilecekKomut);
      komutGonder(`/msg ${gonderen} Komut çalıştırıldı: ${gonderilecekKomut}`);
    }
  }

  // MINEFLAYER DAHİLİ FISILTI DİNLEYİCİ
  bot.on('whisper', (username, message) => {
    msgKomutIsle(username, message);
  });

  // SUNUCU CHAT LOGLARI VE ÖZEL MESAJ YAKALAMA
  bot.on('message', (jsonMsg) => {
    const mesaj = jsonMsg.toString().trim();
    if (mesaj) console.log(`[SUNUCU]: ${mesaj}`);

    // Sunucu özel mesaj formatı tespiti (Örn: [Mesaj] Oyuncu -> Sana: mesaj)
    if (mesaj.includes('Sana:') || mesaj.includes('-> Sana')) {
      const parts = mesaj.split(/Sana:/i);
      if (parts.length > 1) {
        const mesajIcerik = parts[1].trim();
        const gonderenPart = parts[0].replace(/\[.*?\]/g, '').trim();
        const gonderen = gonderenPart.split(' ').pop().replace(/[^a-zA-Z0-9_]/g, '');
        if (gonderen) msgKomutIsle(gonderen, mesajIcerik);
      }
    }

    // Lobi / Düşme Tespiti
    if (
      mesaj.includes('Lobiye') ||
      mesaj.includes('aktarıldınız') ||
      mesaj.includes('yeniden başlatılıyor') ||
      mesaj.includes('Lütfen giriş komutunu kullanın')
    ) {
      console.log('>> Lobiye düştü! Tekrar Nether evine dönülüyor...');
      netherHomeDon();
    }
  });

  let spawnOldu = false;

  bot.on('spawn', () => {
    if (spawnOldu) return;
    spawnOldu = true;

    console.log('>> xBetray_Farm oyuna bağlandı.');

    // 1. Giriş Yap ve Nether Evine Işınlan
    setTimeout(() => {
      komutGonder('/login Efe_438021');
      console.log('>> [1/2] /login gönderildi.');
    }, 4000);

    setTimeout(() => {
      komutGonder('/home');
      console.log('>> [2/2] Nether evine (/home) çekildi.');
    }, 10000);

    // 2. AFK Zıplama & Kol Sallama (Her 25 saniyede bir)
    if (afkInterval) clearInterval(afkInterval);
    afkInterval = setInterval(() => {
      if (bot && bot.entity) {
        bot.setControlState('jump', true);
        try { bot.swingArm('right'); } catch (e) {}

        setTimeout(() => {
          if (bot && bot.entity) {
            bot.setControlState('jump', false);
          }
        }, 400);
      }
    }, 25000);

    // 3. Periyodik Nether /home Emniyeti (Her 15 dakikada bir)
    if (kontrolInterval) clearInterval(kontrolInterval);
    kontrolInterval = setInterval(() => {
      if (bot && bot.entity) {
        console.log('>> Periyodik kontrol: /home çekiliyor...');
        komutGonder('/home');
      }
    }, 15 * 60 * 1000);
  });

  bot.on('kicked', (reason) => {
    console.log('Bot atıldı! Sebep:', JSON.stringify(reason));
    sifirlaVeYenidenBaslat();
  });

  bot.on('end', () => {
    console.log('Bağlantı koptu (end).');
    sifirlaVeYenidenBaslat();
  });

  bot.on('error', (err) => {
    if (err.name === 'PartialReadError' || err.message?.includes('timed out')) return;
    console.log('Hata oluştu:', err.message);
    sifirlaVeYenidenBaslat();
  });
}

botuBaslat();
