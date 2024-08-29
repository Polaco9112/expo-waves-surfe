import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AVPlaybackStatus, Audio } from 'expo-av';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const AudioListItem = ({ memo }) => {
  const [sound, setSound] = useState(null);
  const [status, setStatus] = useState(null);

  async function loadSound() {
    const { sound } = await Audio.Sound.createAsync(
      { uri: memo.uri },
      { progressUpdateIntervalMillis: 1000 / 60 },
      onPlaybackStatusUpdate
    );
    setSound(sound);
  }

  const onPlaybackStatusUpdate = useCallback(
    async (newStatus) => {
      setStatus(newStatus);

      if (!newStatus.isLoaded || !sound) {
        return;
      }

      if (newStatus.didJustFinish) {
        await sound.setPositionAsync(0);
      }
    },
    [sound]
  );

  useEffect(() => {
    loadSound();
  }, [memo]);

  async function playSound() {
    if (!sound) {
      return;
    }
    if (status.isLoaded && status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.replayAsync();
    }
  }

  useEffect(() => {
    return sound
      ? () => {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  const formatMillis = (millis) => {
    const minutes = Math.floor(millis / (1000 * 60));
    const seconds = Math.floor((millis % (1000 * 60)) / 1000);

    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const isPlaying = status ? status.isPlaying : false;
  const position = status ? status.positionMillis : 0;
  const duration = status ? status.durationMillis : 1;

  const progress = position / duration;

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: `${progress * 100}%`,
    // withTiming(`${progress * 100}%`, {
    //   duration:
    //     (status && status.progressUpdateIntervalMillis) || 100,
    // }),
  }));

  let numLines = 50;
  let lines = [];

  if (numLines > 0 && memo.metering.length > 0) {
    for (let i = 0; i < numLines; i++) {
      const meteringIndex = Math.floor((i * memo.metering.length) / numLines);
      const nextMeteringIndex = Math.ceil(
        ((i + 1) * memo.metering.length) / numLines
      );
      const values = memo.metering.slice(meteringIndex, nextMeteringIndex);
      if (values.length > 0) {
        const average = values.reduce((sum, a) => sum + a, 0) / values.length;
        lines.push(average);
      }
    }
  }

  return (
    <View style={styles.container}>
      <FontAwesome5
        onPress={playSound}
        name={isPlaying ? 'pause' : 'play'}
        size={20}
        color={'gray'}
      />

      <View style={styles.playbackContainer}>
        {/* <View style={styles.playbackBackground} /> */}

        <View style={styles.wave}>
          {lines.map((db, index) => (
            <View
              style={[
                styles.waveLine,
                {
                  height: interpolate(db, [-60, 0], [5, 50], Extrapolate.CLAMP),
                  backgroundColor:
                    progress > index / lines.length ? 'red' : 'gainsboro',
                },
              ]}
            />
          ))}
        </View>

        {/* <Animated.View
          style={[styles.playbackIndicator, animatedIndicatorStyle]}
        /> */}

        <Text
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            color: 'gray',
            fontFamily: 'Inter',
            fontSize: 12,
          }}
        >
          {formatMillis(position || 0)} / {formatMillis(duration || 0)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 15,

    // shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,

    elevation: 3,
  },

  playbackContainer: {
    flex: 1,
    height: 80,
    justifyContent: 'center',
  },
  playbackBackground: {
    height: 3,
    backgroundColor: 'gainsboro',
    borderRadius: 5,
  },
  playbackIndicator: {
    width: 10,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: 'red',
    position: 'absolute',
  },

  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveLine: {
    flex: 1,
    height: 30,
    backgroundColor: 'gainsboro',
    borderRadius: 20,
  },
});

export default AudioListItem;