const express = require('express');
const cors = require('cors');
const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { LocalStorage } = require('node-localstorage');
const input = require("input");

const app = express();
const port = 3000;
app.use(cors());
const apiId = 25645694;
const apiHash = '71da3b4add888a833442d47b606330cb';
const localStorage = new LocalStorage('./storage');
let sessionString = localStorage.getItem('my_session');
const session = new StringSession(sessionString || '');

const client = new TelegramClient(session, apiId, apiHash);

async function connectClient() {
  try {
    if (!sessionString) {
      await client.start({
        phoneNumber: async () => await input.text("number ?"),
        password: async () => await input.text("password?"),
        phoneCode: async () => await input.text("Code ?"),
        onError: (err) => console.log(err),
      });
      sessionString = client.session.save();
      localStorage.setItem('my_session', sessionString);
      await client.sendMessage('me', { message: '¡Hola!' });
    } else {
      await client.connect();
      console.log('Conexión exitosa.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function disconnectClient() {
  await client.disconnect();
}

async function getMessages(limit = 1) {
  const entity = await client.getEntity('Chollometro');
  const result = await client.invoke(
    new Api.messages.GetHistory({
      peer: entity,
      limit: limit,
      offsetId: 0,
      offsetDate: 0,
      addOffset: 0,
      maxId: 0,
      minId: 0,
      hash: 0,
    })
  );

  const messages = result.messages.map((message) => ({
    username: result.chats.username,
    id: message.id,
    text: message.message,
    views: message.views,
    date: getFormattedDate(message.date),
    media: message.media,
  }));
  
  console.log(messages);
  return messages;
}

function getFormattedDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const formattedDate = date.toLocaleString();
  return formattedDate;
}

app.get('/messages', async (req, res) => {
  await connectClient();
  const messages = await getMessages();
  await disconnectClient();
  res.send(messages);
});

app.get('/messages/:limit', async (req, res) => {
  const limit = parseInt(req.params.limit);
  await connectClient();
  const messages = await getMessages(limit);
  await disconnectClient();
  res.json(messages);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
