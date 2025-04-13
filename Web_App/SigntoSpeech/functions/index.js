const functions = require('firebase-functions');
const admin = require('firebase-admin');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');

// ✅ Load service account credentials
const serviceAccount = require('./sign2speech-2598c-a39dff875eb3.json');

// ✅ Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'sign2speech-2598c.appspot.com',
  databaseURL: 'https://sign2speech-2598c-default-rtdb.firebaseio.com'
});

const db = admin.database();
const bucket = admin.storage().bucket();
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: serviceAccount
});

// ✅ On CREATE: Generate audio and update audioUrl in user node
exports.generateAudioForSign = functions.database
  .ref('/users/{userId}/signs/{signCode}')
  .onCreate(async (snapshot, context) => {
    const { userId, signCode } = context.params;
    const signData = snapshot.val();
    const text = signData?.text;

    if (!text) {
      console.log('⚠️ No text provided for this sign.');
      return null;
    }

    try {
      // 1️⃣ Generate TTS audio
      const request = {
        input: { text },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' }
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      // 2️⃣ Save to temp file
      const filename = `${userId}_${signCode}.mp3`;
      const tempFilePath = path.join(os.tmpdir(), filename);
      await util.promisify(fs.writeFile)(tempFilePath, response.audioContent, 'binary');

      // 3️⃣ Upload to Firebase Storage
      const storagePath = `tts_audio/${filename}`;
      await bucket.upload(tempFilePath, {
        destination: storagePath,
        contentType: 'audio/mpeg',
        metadata: { cacheControl: 'public,max-age=31536000' }
      });

      // 4️⃣ Make file public and get URL
      const file = bucket.file(storagePath);
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // 5️⃣ Update audioUrl in user's signs
      await db.ref(`/users/${userId}/signs/${signCode}/audioUrl`).set(publicUrl);

      console.log(`✅ Audio uploaded and audioUrl saved for ${signCode}`);
      return null;

    } catch (error) {
      console.error("❌ Error during TTS generation and upload:", error);
      return null;
    }
  });
