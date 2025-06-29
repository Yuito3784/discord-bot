require('dotenv').config();

const fs = require('fs');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 曲リスト（ランダムで選ばれる）
// 🔽 songs.txtから曲を読み込んで配列化
let songs = [];
try {
    const data = fs.readFileSync('songs.txt', 'utf-8');
    songs = data.split('\n').filter(line => line.trim() !== '');
} catch (err) {
    console.error('曲リストの読み込みに失敗しました:', err);
    process.exit(1);
}

// 反応するチャンネル名を指定
const TARGET_CHANNEL_NAME = '課題曲bot';  // 実際のチャンネル名に合わせてね！

client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (message.channel.name !== TARGET_CHANNEL_NAME) return;

    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    message.reply(`あなたにおすすめの曲はこれです！🎧\n🎵 ${randomSong}`);
});

// Botを起動して成功/失敗ログを出す
client.login(process.env.TOKEN)
    .then(() => {
        console.log('🤖 Discord Bot にログインしました');
    })
    .catch(err => {
        console.error('❌ Discord Bot のログインに失敗:', err);
    });

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Webサーバーがポート ${PORT} で起動中`);
});

// Botが落ちたときに再起動を促す
process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err);
    process.exit(1); // Replit側が自動で再起動する可能性あり
});