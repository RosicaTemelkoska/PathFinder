import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components/native';

const Screen = styled.View`
  flex: 1;
  background-color: #0b1220;
`;

const Card = styled(TouchableOpacity)`
  padding: 14px;
  margin-bottom: 10px;
  background-color: rgba(15, 23, 42, 0.92);
  border-radius: 16px;
  border-width: 1px;
  border-color: rgba(148, 163, 184, 0.18);
`;

const Title = styled.Text`
  color: rgba(226, 232, 240, 0.98);
  font-weight: 700;
  font-size: 16px;
`;

const Sub = styled.Text`
  color: rgba(226, 232, 240, 0.8);
  font-size: 14px;
  margin-top: 6px;
`;

const HeaderRow = styled.View`
  padding: 16px 16px 0px 16px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.Text`
  color: rgba(226, 232, 240, 0.98);
  font-weight: 800;
  font-size: 20px;
`;

const ClearButton = styled(Pressable)`
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba(239, 68, 68, 0.15);
  border-width: 1px;
  border-color: rgba(239, 68, 68, 0.25);
`;

const ClearButtonText = styled.Text`
  color: rgba(248, 113, 113, 0.95);
  font-weight: 700;
`;

interface Activity {
  date: string;
  durationSec?: number;
  distanceMeters?: number;
  route: { latitude: number; longitude: number }[];
}

export default function HistoryScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const router = useRouter();

  const loadActivities = useCallback(async () => {
    const saved = await AsyncStorage.getItem('activities');
    const list = saved ? JSON.parse(saved) : [];
    const sorted = Array.isArray(list)
      ? [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];
    setActivities(sorted);
  }, []);

  const clearHistory = useCallback(() => {
    Alert.alert('Clear history?', 'This will delete all saved activities from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('activities');
          setActivities([]);
        },
      },
    ]);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  return (
    <Screen>
      <HeaderRow>
        <HeaderTitle>History</HeaderTitle>
        <ClearButton onPress={clearHistory}>
          <ClearButtonText>Clear</ClearButtonText>
        </ClearButton>
      </HeaderRow>
      <FlatList
        data={activities}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <Card
            onPress={() =>
              router.push({
                pathname: '/history-detail',
                params: { index: index.toString() },
              })
            }
          >
            <Title>{new Date(item.date).toLocaleString()}</Title>
            <Sub>
              {((item.distanceMeters ?? 0) / 1000).toFixed(2)} km • {item.durationSec ?? 0}s • {item.route.length} points
            </Sub>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No activities yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingTop: 12 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'rgba(226, 232, 240, 0.85)' },
});