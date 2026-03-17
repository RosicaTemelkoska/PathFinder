import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import styled from 'styled-components/native';

const Screen = styled.View`
  flex: 1;
  background-color: #0b1220;
`;

const Meta = styled.View`
  padding: 12px 14px;
  background-color: rgba(15, 23, 42, 0.92);
  border-bottom-width: 1px;
  border-bottom-color: rgba(148, 163, 184, 0.18);
`;

const MetaTitle = styled.Text`
  color: rgba(226, 232, 240, 0.98);
  font-weight: 800;
  font-size: 16px;
`;

const MetaSub = styled.Text`
  margin-top: 6px;
  color: rgba(226, 232, 240, 0.8);
  font-size: 14px;
`;

interface Activity {
  date: string;
  durationSec?: number;
  distanceMeters?: number;
  route: { latitude: number; longitude: number }[];
}

export default function HistoryDetailScreen() {
  const [route, setRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [meta, setMeta] = useState<{ date?: string; durationSec?: number; distanceMeters?: number } | null>(null);
  const params = useLocalSearchParams();
  const index = Number(params.index as string);
  const rawMapTilerKey = Constants.expoConfig?.extra?.mapTilerKey as string | undefined;
  const mapTilerKey =
    rawMapTilerKey && rawMapTilerKey !== 'PUT_YOUR_MAPTILER_KEY_HERE' ? rawMapTilerKey : undefined;
  const mapTilerUrlTemplate = mapTilerKey
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`
    : undefined;

  useEffect(() => {
    if (!Number.isFinite(index)) return;
    const loadActivity = async () => {
      const saved = await AsyncStorage.getItem('activities');
      const activities: Activity[] = saved ? JSON.parse(saved) : [];
      if (activities[index]) {
        setMeta({
          date: activities[index].date,
          durationSec: activities[index].durationSec,
          distanceMeters: activities[index].distanceMeters,
        });
        setRoute(activities[index].route);
      }
    };
    loadActivity();
  }, [index]);

  if (!Number.isFinite(index)) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.centerText}>Invalid activity.</Text>
      </Screen>
    );
  }

  if (!route.length) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.centerText}>Loading activity...</Text>
      </Screen>
    );
  }

  const first = route[0];

  return (
    <Screen>
      {meta?.date && (
        <Meta>
          <MetaTitle>{new Date(meta.date).toLocaleString()}</MetaTitle>
          <MetaSub>
            {(((meta.distanceMeters ?? 0) / 1000) || 0).toFixed(2)} km • {meta.durationSec ?? 0}s • {route.length} points
          </MetaSub>
        </Meta>
      )}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: first.latitude,
          longitude: first.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        mapType={mapTilerUrlTemplate ? 'none' : 'standard'}
      >
        {mapTilerUrlTemplate && <UrlTile urlTemplate={mapTilerUrlTemplate} maximumZ={20} />}
        <Polyline coordinates={route} strokeWidth={4} strokeColor="blue" />
      </MapView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { color: 'rgba(226, 232, 240, 0.9)', fontSize: 16 },
});