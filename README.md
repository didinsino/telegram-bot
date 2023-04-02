# Telegram Bot API

Simple and lightweight NodeJS library for creating Telegram bots.

## Installation

```sh
npm install @didinsino/telegram-bot
```

## Getting started

```ts
const { TelegramBot } = require('@didinsino/telegram-bot');

// replace the value with the Telegram token you receive from @BotFather
const bot = new TelegramBot('YOUR_TELEGRAM_BOT_TOKEN');

// Listen for any kind of message. Called first before any other events
bot.on('update', ctx => {
  ctx.name = ctx.message?.from.first_name ?? ctx.callback_query?.from.first_name;
  console.log(JSON.stringify(ctx, null, 2));
});

// Handler for /start command or start button pressed
bot.start(ctx => {
  ctx.reply(`Welcome, ${ctx.name}. Which one do you prefer?`, {
    buttons_column: 2,
    buttons: [
      {
        text: 'JS',
        callback_data: 'button_Javascript',
      },
      {
        text: 'TS',
        callback_data: 'button_Typescript',
      },
      {
        text: 'Visit Github Repository',
        url: 'https://github.com/didinsino/telegram-bot',
      },
    ],
  });
});

// Listen for text message
bot.on('text', ctx => {
  ctx.reply(`What do you mean "${ctx.message.text}?"\nTry /help for list of commands`);
  // OR
  // reply incoming message without make new http instance (webhook only)
  // https://core.telegram.org/bots/faq#how-can-i-make-requests-in-response-to-updates
  ctx.directReply(`What do you mean "${ctx.message.text}?"\nTry /help for list of commands`);
});

// Matches "/help"
bot.command('help', async ctx => {
  await ctx.reply('There is no help here');
  await ctx.reply('CAACAgIAAxkBAAMsZChpxIYkc2atNDVJulzOpUeZ_NYAAlIDAAK6wJUFlfhk3Qz2478vBA', null, 'sticker');
});

// Matches for "button_aaa", "button_bbb", etc
bot.action(/button_(\w+)/, ctx => {
  const [, buttonNumber] = ctx.match;
  bot.editMessageText(
    ctx.callback_query.message.chat.id,
    ctx.callback_query.message.message_id,
    `✓ Your choice is: <b>${buttonNumber}</b>`,
    { parse_mode: 'HTML' }
  );
});

bot.catch(error => {
  console.log(error);
});


/* Getting updates from Telegram bot server */

// Using long polling
bot.startPolling();

// Using webhook (sample usage for Firebase Functions)
exports.telegramWebhook = functions.https.onRequest(async (req, resp) => {
  try {
    await bot.handleUpdate(req.body);
    const directReply = bot.getdirectReply();

    if (directReply != null) {
      resp.status(200).send(directReply);
    } else {
      resp.status(200).end();
    }

  } catch (error) {
    functions.logger.error(error.message);
    resp.status(200).end();
  }
});
```


## Usage

```ts
// Send text message
bot.sendMessage('CHAT_ID', 'Hello there, how are you?')
  .then(result => {
    console.log(`Message sent successfully with ID: ${result.message_id}`);
  })
  .catch(error => {
    console.log(`Error sending message:`, error.message);
  });

// Sends photo from URL
bot.sendPhoto('CHAT_ID', 'https://images.unsplash.com/photo-1680193966159-e371dff0d82c?fit=crop&w=687&q=80', {
  caption: 'A photo from unsplash.com',
});

// Sends photo using existing file_id
bot.sendPhoto('CHAT_ID', 'AgACAgQAAxkDAANYZClugC2gtJxq3pbpAAHZYdchdBCcAAJesDEba4lNUfPh5zkPqgshAQADAgADeQADLwQ');

// Sends document from local file
bot.sendDocument('CHAT_ID', './sample-document.pdf', {
  caption: 'Send document with caption'
});

// Sends document from buffer
bot.sendDocument('CHAT_ID', fs.readFileSync('./sample-document.pdf'), {
  caption: 'Send document from buffer',
  file_name: 'Custom File Name.pdf',
});

// Sends stream 
bot.sendVideo('CHAT_ID', fs.createReadStream('./sample-video.mp4'));
bot.sendAudio('CHAT_ID', fs.createReadStream('./sample-audio.mp3'));

// Edit/delete message
bot.editMessageText('CHAT_ID', 'MESSAGE_ID', 'New message text');
bot.editMessageCaption('CHAT_ID', 'MESSAGE_ID', 'New message caption');
bot.deleteMessage('CHAT_ID', 'MESSAGE_ID');

// Set webhook
bot.setWebhook('https://webhook.url');
// OR
bot.setWebhook({
  url: 'https://webhook.url',
  max_connections: 10,
  ...otherOptions
});

// Get webhook info
bot.getWebhookInfo();

// Delete webhook
bot.deleteWebhook(true);

// Manually get updates
bot.getUpdates({ offset: 12345, limit: 10}).then(updates => {
  // updates.forEach()
});

// Make custom request
bot.httpRequest(
  'forwardMessage', 
  {
    chat_id: 'CHAT_ID',
    message_id: 'MESSAGE_ID'
  }, 
  'post',
  ...axiosConfig
)
```
