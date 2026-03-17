import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { polylineDistanceMeters } from '@/app/utils/geo';
import styled from 'styled-components/native';
import { BACKGROUND_LOCATION_TASK, getActiveSession, setActiveSession } from '@/app/location-task';

const Screen = styled.View`
  flex: 1;
  background-color: #0b1220;
`;

const Overlay = styled.View`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 18px;
  background-color: rgba(15, 23, 42, 0.92);
  border-radius: 16px;
  padding: 12px;
  border-width: 1px;
  border-color: rgba(148, 163, 184, 0.18);
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const PrimaryButton = styled(Pressable)<{ $danger?: boolean }>`
  flex: 1;
  padding: 12px 14px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${(
    props: {
      $danger?: boolean;
    }
  ) => (props.$danger ? '#ef4444' : '#3b82f6')};
`;

const ButtonText = styled.Text`
  color: #ffffff;
  font-weight: 700;
  font-size: 16px;
`;

const StatsText = styled.Text`
  margin-top: 10px;
  color: rgba(226, 232, 240, 0.92);
  font-size: 14px;
`;

const HintText = styled.Text`
  margin-top: 8px;
  color: rgba(148, 163, 184, 0.9);
  font-size: 12px;
`;

export default function MapScreen() {
  const [location, setLocation] = useState<any>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [route, setRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [duration, setDuration] = useState(0);
  const locationSubscription = useRef<any>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtMsRef = useRef<number | null>(null);
  const rawMapTilerKey = Constants.expoConfig?.extra?.mapTilerKey as string | undefined;
  const mapTilerKey =
    rawMapTilerKey && rawMapTilerKey !== 'PUT_YOUR_MAPTILER_KEY_HERE' ? rawMapTilerKey : undefined;
  const mapTilerUrlTemplate = mapTilerKey
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`
    : undefined;

  // Зачувување почетна локација
  const requestPermissionAndSeed = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);

    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
    setRoute([{ latitude: loc.coords.latitude, longitude: loc.coords.longitude }]);
  };

  useEffect(() => {
    (async () => {
      await requestPermissionAndSeed();

      const active = await getActiveSession();
      if (active) {
        startedAtMsRef.current = active.startedAtMs;
        setRoute(active.route);
        setTracking(true);
        timer.current = setInterval(() => {
          const start = startedAtMsRef.current;
          if (!start) return;
          setDuration(Math.max(0, Math.floor((Date.now() - start) / 1000)));
        }, 1000);
      }
    })();

    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startTracking = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      Alert.alert(
        'Background permission not granted',
        'Tracking will work while the app is open, but may pause in the background.'
      );
    }

    const now = Date.now();
    startedAtMsRef.current = now;
    setTracking(true);
    setDuration(0);
    await setActiveSession({ id: String(now), startedAtMs: now, route: [] });

    timer.current = setInterval(() => setDuration((prev) => prev + 1), 1000);

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!hasStarted && bg.status === 'granted') {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'PathFinder is tracking',
          notificationBody: 'Recording your route in the background.',
        },
      });
    }

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        setLocation(loc.coords);
        const point = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setRoute((prev) => [...prev, point]);
      }
    );
  };

  const stopTracking = async () => {
    setTracking(false);
    if (locationSubscription.current) locationSubscription.current.remove();
    if (timer.current) clearInterval(timer.current);

    const active = await getActiveSession();
    const combinedRoute = active?.route?.length ? [...route, ...active.route] : route;

    const startedAtMs = startedAtMsRef.current ?? active?.startedAtMs ?? Date.now();
    const durationSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    const distanceMeters = polylineDistanceMeters(combinedRoute);
    const activity = {
      date: new Date().toISOString(),
      durationSec,
      distanceMeters,
      route: combinedRoute,
    };

    try {
      const saved = await AsyncStorage.getItem('activities');
      const activities = saved ? JSON.parse(saved) : [];
      activities.push(activity);
      await AsyncStorage.setItem('activities', JSON.stringify(activities));
      alert('Activity saved!');
    } catch (e) {
      console.error('Failed to save activity', e);
      alert('Error saving activity');
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await setActiveSession(null);
    startedAtMsRef.current = null;
    setRoute([]);
    setDuration(0);
  };

  const distanceKm = (polylineDistanceMeters(route) / 1000).toFixed(2);

  if (permissionDenied) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.centerText}>Location permission is required to track activities.</Text>
        <View style={{ height: 12 }} />
        <PrimaryButton onPress={requestPermissionAndSeed}>
          <ButtonText>Try again</ButtonText>
        </PrimaryButton>
      </Screen>
    );
  }

  if (!location) return <Text>Loading location...</Text>;

  return (
    <Screen>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        followsUserLocation
        mapType={mapTilerUrlTemplate ? 'none' : 'standard'}
      >
        {mapTilerUrlTemplate && <UrlTile urlTemplate={mapTilerUrlTemplate} maximumZ={20} />}
        {route.length > 0 && <Polyline coordinates={route} strokeWidth={4} strokeColor="blue" />}
        {route.length > 0 && <Marker coordinate={route[route.length - 1]} />}
      </MapView>

      <Overlay>
        <Row>
          {!tracking ? (
            <PrimaryButton onPress={startTracking}>
              <ButtonText>Start Tracking</ButtonText>
            </PrimaryButton>
          ) : (
            <PrimaryButton $danger onPress={stopTracking}>
              <ButtonText>Stop & Save</ButtonText>
            </PrimaryButton>
          )}
        </Row>
        <StatsText>Duration: {duration}s • Distance: {distanceKm} km • Points: {route.length}</StatsText>
        {!mapTilerKey && (
          <HintText>
            MapTiler tiles disabled: set `expo.extra.mapTilerKey` in `app.json` and restart the dev server.
          </HintText>
        )}
      </Overlay>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  centerText: { textAlign: 'center', fontSize: 16, color: 'rgba(226,232,240,0.95)' },
});