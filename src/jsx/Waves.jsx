import React, { useState, useEffect } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AudioListItem from './Audios';

export default function Waves() {
  const [recording, setRecording] = useState(null);
  const [memos, setMemos] = useState([]);
  const [audioMetering, setAudioMetering] = useState([]);
  const metering = useSharedValue(-100);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
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
  };

  const stopRecording = async () => {
    if (!recording) {
      return;
    }

    console.log('Stopping recording..');
    const currentRecording = recording;
    setRecording(null);
    await currentRecording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = currentRecording.getURI();
    console.log('Recording stopped and stored at', uri);
    metering.value = -100;
    if (uri) {
      setMemos((existingMemos) => [
        { uri, metering: audioMetering },
        ...existingMemos,
      ]);
    }
  };

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
        keyExtractor={(item, index) => index.toString()}
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

const styles = StyleSheet.create({
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
});