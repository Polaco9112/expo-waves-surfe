import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Animated, {
  useAnimatedStyle,
  interpolateColor,
  useDerivedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const AudioListItem = ({ memo }) => {
  const [sound, setSound] = useState(null);
  const [status, setStatus] = useState(null);
  const statusRef = useRef(null);

  const progress = useDerivedValue(() => {
    return statusRef.current?.positionMillis ? statusRef.current.positionMillis / (statusRef.current.durationMillis || 1) : 0;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
        { uri: memo.uri },
        { progressUpdateIntervalMillis: 1000 / 60 },
        onPlaybackStatusUpdate
      );
      if (isMounted) {
        setSound(sound);
      }
    }

    loadSound();

    return () => {
      isMounted = false;
      if (sound) {
        console.log('Unloading Sound');
        sound.unloadAsync();
      }
    };
  }, [memo]);

  const onPlaybackStatusUpdate = (newStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);

    if (newStatus.isLoaded && newStatus.didJustFinish) {
      sound?.setPositionAsync(0);
    }
  };

  const playSound = async () => {
    if (!sound) return;

    if (status?.isLoaded) {
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else if (status.didJustFinish) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } else {
        await sound.playFromPositionAsync(status.positionMillis);
      }
    }
  };

  const formatMillis = (millis) => {
    const minutes = Math.floor(millis / (1000 * 60));
    const seconds = Math.floor((millis % (1000 * 60)) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const waveLines = memo.metering.map((db, index) => {
    const lineStyle = useAnimatedStyle(() => {
      const height = interpolate(
        db,
        [-60, 0],
        [5, 50],
        Extrapolate.CLAMP
      );
      const backgroundColor = interpolateColor(
        progress.value,
        [index / memo.metering.length - 0.1, index / memo.metering.length],
        ['#707676', '#ad1b07']
      );
      return {
        height: withTiming(height, { duration: 300 }),
        backgroundColor: withTiming(backgroundColor, { duration: 300 }),
      };
    });

    return (
      <AnimatedPressable key={index} style={[styles.waveLine, lineStyle]} />
    );
  });

  return (
    <View style={styles.container}>
      <FontAwesome5
        onPress={playSound}
        name={status?.isPlaying ? 'pause' : 'play'}
        size={20}
        color={'gray'}
      />

      <View style={styles.playbackContainer}>
        <View style={styles.wave}>{waveLines}</View>
        <Text style={styles.timeText}>
          {formatMillis(status?.positionMillis || 0)} / {formatMillis(status?.durationMillis || 0)}
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
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveLine: {
    flex: 1,
    width: 3,
    borderRadius: 20,
  },
  timeText: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    color: 'gray',
    fontFamily: 'Inter',
    fontSize: 12,
  },
});

export default AudioListItem;