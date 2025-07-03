require('dotenv').config();

const fs = require('fs');
const express = require('express');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 難易度の順序
const difficultyOrder = [
    '10+', '11', '11+', '12', '12+', '13', '13+', '14', '14+', '15'
];

function isWithinDifficultyRange(level, min, max) {
    const index = difficultyOrder.indexOf(level);
    const minIndex = min ? difficultyOrder.indexOf(min) : 0;
    const maxIndex = max ? difficultyOrder.indexOf(max) : difficultyOrder.length - 1;

    return (
        index !== -1 &&
        minIndex !== -1 &&
        maxIndex !== -1 &&
        index >= minIndex &&
        index <= maxIndex
    );
}

// 課題曲読み込み
let songs = [];
try {
    const data = fs.readFileSync('songs.txt', 'utf-8');
    songs = data
        .split('\n')
        .map(line => {
            const [title, level] = line.trim().split(',');
            return { title, level };
        })
        .filter(song => song.title && song.level);
} catch (err) {
    console.error('❌ 曲リストの読み込みに失敗:', err);
}

// スラッシュコマンド定義
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

const commands = [
    new SlashCommandBuilder()
        .setName('song')
        .setDescription('全課題曲からランダムで1曲を提示する')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('level')
        .setDescription('難易度を指定して課題曲を提示する')
        .addStringOption(option =>
            option.setName('min')
                .setDescription('最小難易度 (例: 11, 13+)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('max')
                .setDescription('最大難易度 (例: 12+, 14)')
                .setRequired(false)
        )
        .toJSON()
];

// コマンド登録
(async () => {
    try {
        console.log('📡 コマンドを登録中...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ スラッシュコマンド登録完了');
    } catch (error) {
        console.error('❌ コマンド登録失敗:', error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;
    let filteredSongs = songs;

    try {
        try {
            await interaction.deferReply();
        } catch (e) {
            console.warn('⚠️ deferReply に失敗:', e.message);
            return;
        }

        console.log(`[${command}] コマンドが呼ばれました`);

        if (command === 'level') {
            const minLevel = interaction.options.getString('min');
            const maxLevel = interaction.options.getString('max');
            console.log(`min: ${minLevel}, max: ${maxLevel}`);

            if (minLevel && maxLevel) {
                filteredSongs = songs.filter(song =>
                    isWithinDifficultyRange(song.level, minLevel, maxLevel));
            } else if (minLevel) {
                const minIndex = difficultyOrder.indexOf(minLevel);
                filteredSongs = songs.filter(song =>
                    difficultyOrder.indexOf(song.level) >= minIndex);
            } else if (maxLevel) {
                const maxIndex = difficultyOrder.indexOf(maxLevel);
                filteredSongs = songs.filter(song =>
                    difficultyOrder.indexOf(song.level) <= maxIndex);
            }
        }

        if (command === 'song') {
            filteredSongs = songs;
        }

        console.log(`候補曲数: ${filteredSongs.length}`);

        if (filteredSongs.length === 0) {
            await interaction.editReply('❌ 条件に合う課題曲が見つかりませんでした。');
            return;
        }

        const randomSong = filteredSongs[Math.floor(Math.random() * filteredSongs.length)];
        console.log(`選ばれた曲: ${randomSong.title}（${randomSong.level}）`);

        await interaction.editReply(`🎧 おすすめの課題曲はこちら！\n🎵 ${randomSong.title}（${randomSong.level}）`);

    } catch (error) {
        console.error('💥 エラー発生:', error);

        if (interaction.deferred || interaction.replied) {
            try {
                await interaction.editReply('⚠️ エラーが発生しました。');
            } catch (e) {
                console.error('⚠️ editReply に失敗:', e.message);
            }
        } else {
            try {
                await interaction.reply('⚠️ エラーが発生しました。');
            } catch (e) {
                console.error('⚠️ reply に失敗:', e.message);
            }
        }
    }
});

// Bot起動
client.login(process.env.TOKEN)
    .then(() => console.log('🤖 Discord Bot にログインしました'))
    .catch(err => console.error('❌ Discord Bot のログインに失敗:', err));

// Expressサーバー起動
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('Bot is alive!'));
app.listen(PORT, () => {
    console.log(`Webサーバーがポート ${PORT} で起動中`);
});

// 異常終了対策
process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err);
    process.exit(1);
});
