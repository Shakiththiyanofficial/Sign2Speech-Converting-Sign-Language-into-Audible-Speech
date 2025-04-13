const functions = require('firebase-functions');
const admin = require('firebase-admin');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');

// ✅ Load service account credentials from JSON file
const serviceAccount = require('./sign2speech-2598c-a39dff875eb3.json'); // Adjust if named differently

// ✅ Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'sign2speech-2598c.firebasestorage.app',// Replace with your Firebase Storage bucket name
  databaseURL: 'https://sign2speech-2598c-default-rtdb.firebaseio.com/'
});

const db = admin.database();
const bucket = admin.storage().bucket();
const ttsClient = new textToSpeech.TextToSpeechClient({
  credentials: serviceAccount
});

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
      // ✅ 1. Generate TTS audio
      const request = {
        input: { text },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' }
      };

      const [response] = await ttsClient.synthesizeSpeech(request);

      // ✅ 2. Save to temp file
      const filename = `${userId}_${signCode}.mp3`;
      const tempFilePath = path.join(os.tmpdir(), filename);
      await util.promisify(fs.writeFile)(tempFilePath, response.audioContent, 'binary');

      // ✅ 3. Upload to Firebase Storage
      const storagePath = `tts_audio/${filename}`;
      await bucket.upload(tempFilePath, {
        destination: storagePath,
        contentType: 'audio/mpeg',
        metadata: {
          cacheControl: 'public,max-age=31536000'
        }
      });

      // ✅ 4. Make public and save URL
      const file = bucket.file(storagePath);
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      await db.ref(`/users/${userId}/signs/${signCode}/audioUrl`).set(publicUrl);

      console.log(`✅ Audio created and stored at: ${publicUrl}`);
      return null;
    } catch (error) {
      console.error("❌ Error during TTS generation:", error);
      return null;
    }
  });
