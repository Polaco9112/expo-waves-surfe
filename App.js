import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
// import Waves from './src/components/Waves'
import Waves from './src/jsx/Waves';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      {/* <Waves /> */}
      <Waves />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})



