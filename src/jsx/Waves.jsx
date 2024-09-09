import React, { useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system'
import { FFmpegKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
import { Recording } from 'expo-av/build/Audio';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AudioListItem from './Audios';


export default function Waves() {
  const [recording, setRecording] = useState();
  const [memos, setMemos] = useState([]);

  const [audioMetering, setAudioMetering] = useState([]);
  const metering = useSharedValue(-100);


  async function startRecording() {
    try {
      setAudioMetering([]);

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        100
      );
      setRecording(recording);

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering) {
          metering.value = status.metering;
          setAudioMetering((curVal) => [...curVal, status.metering || -100]);
        }
      });
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function convertAudio(inputUri) {
    try {

      const outputUri = `${FileSystem.documentDirectory}audio_${Date.now()}.mp3`

      FFmpegKitConfig.enableLogCallback((log) => {
        console.log('FFmpeg log:', log.getMessage());
      });

      FFmpegKitConfig.enableStatisticsCallback((statistics) => {
        console.log('FFmpeg statistics:', statistics);
      });

      
      const command = `-i '${inputUri}' -c:a libmp3lame -b:a 128k -ar 44.1k '${outputUri}'`


      FFmpegKit.executeAsync(command, async (session) => {
        const returnCode = await session.getReturnCode()

        if (returnCode.isValueSuccess()) {
          console.log('Conversion successful', outputUri)
          return outputUri
        }else{
          const failStackTrace = await session.getFailStackTrace()
          console.error('Conversion failed', failStackTrace)
          throw new Error(`Conversion failed with code ${returnCode}`)
        }
      })
    } catch (error) {
      console.error('Error during conversion', error)
      throw error
    }
  }


  async function stopRecording() {
    if (!recording) {
      return
    }

    console.log('Stopping recording...')
    setRecording(undefined)
    await recording.stopAndUnloadAsync()

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false
    })

    const uri = recording.getURI()
    console.log('Recording stopped and stored at', uri)

    metering.value = -100

    if (uri) {
      try {
        const mp3Uri = await convertAudio(uri)
        setMemos((existingMemos) => [
          { uri: mp3Uri, metering: audioMetering },
          ...existingMemos
        ])
      } catch (error) {
        console.error('Error converting audio, keeping original file', error)
        setMemos((existingMemos) => [
          { uri, metering: audioMetering },
          ...existingMemos
        ])
      }
    }
  }


  const animatedRedCircle = useAnimatedStyle(() => ({
    width: withTiming(recording ? '60%' : '100%'),
    borderRadius: withTiming(recording ? 5 : 35),
  }));

  const animatedRecordWave = useAnimatedStyle(() => {
    const size = withTiming(
      interpolate(metering.value, [-160, -60, 0], [0, 0, -30]),
      { duration: 100 }
    );
    return {
      top: size,
      bottom: size,
      left: size,
      right: size,
      backgroundColor: `rgba(255, 45, 0, ${interpolate(
        metering.value,
        [-160, -60, -10],
        [0.7, 0.3, 0.7]
      )})`,
    };
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={memos}
        renderItem={({ item }) => <AudioListItem memo={item} />}
      />

      <View style={styles.footer}>
        <View>
          <Animated.View style={[styles.recordWave, animatedRecordWave]} />
          <Pressable
            style={styles.recordButton}
            onPress={recording ? stopRecording : startRecording}
          >
            <Animated.View style={[styles.redCircle, animatedRedCircle]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
  },
  footer: {
    backgroundColor: 'white',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,

    borderWidth: 3,
    borderColor: 'gray',
    padding: 3,

    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  recordWave: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    left: -20,
    right: -20,
    borderRadius: 1000,
  },

  redCircle: {
    backgroundColor: 'orangered',
    aspectRatio: 1,
  },
};