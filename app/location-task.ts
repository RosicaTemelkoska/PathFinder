import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const BACKGROUND_LOCATION_TASK = 'pathfinder-background-location';

type LatLng = { latitude: number; longitude: number };
type LocationTaskPayload = {
  locations?: Location.LocationObject[];
};

type ActiveSession = {
  id: string;
  startedAtMs: number;
  route: LatLng[];
};

const ACTIVE_SESSION_KEY = 'activeSession';

async function appendToActiveSession(newPoints: LatLng[]) {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return;
  const session: ActiveSession = JSON.parse(raw);

  const updated: ActiveSession = {
    ...session,
    route: [...session.route, ...newPoints],
  };

  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updated));
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as LocationTaskPayload | undefined)?.locations;
  if (!locations?.length) return;

  const points: LatLng[] = locations
    .map((l: Location.LocationObject) => ({
      latitude: l.coords.latitude,
      longitude: l.coords.longitude,
    }))
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  try {
    await appendToActiveSession(points);
  } catch {
    // Best-effort: background tasks must never crash the app.
  }
});

export async function setActiveSession(session: ActiveSession | null) {
  if (!session) {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  return raw ? (JSON.parse(raw) as ActiveSession) : null;
}

