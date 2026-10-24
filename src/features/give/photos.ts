import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Alert, Linking } from "react-native";

/** Most things need one photo; a few angles at most. Matches LIMITS.photosPerItem. */
export const MAX_PHOTOS = 3;

const LONG_EDGE = 1600;

/** Shrink to a 1600px long edge and re-encode as JPEG before upload. */
async function compress(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const ctx = ImageManipulator.manipulate(asset.uri);
  const long = Math.max(asset.width, asset.height);
  if (long > LONG_EDGE) {
    ctx.resize(asset.width >= asset.height ? { width: LONG_EDGE } : { height: LONG_EDGE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

function explainDenied(what: "camera" | "photos") {
  Alert.alert(
    what === "camera" ? "Domi needs your camera" : "Domi needs your photos",
    what === "camera"
      ? "Allow camera access in Settings to take a photo of what you're giving."
      : "Allow photo access in Settings to pick a photo of what you're giving.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: () => Linking.openSettings() },
    ],
  );
}

/** Opens the camera; returns the compressed photo, or null if cancelled. */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    explainDenied("camera");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  return compress(result.assets[0]);
}

/** Opens the photo library for up to `limit` photos; returns them compressed. */
export async function pickPhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    explainDenied("photos");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled) return [];
  return Promise.all(result.assets.slice(0, limit).map(compress));
}

/** Uploads one local photo to a Convex upload URL; returns its storage id. */
export async function uploadPhoto(uploadUrl: string, uri: string): Promise<string> {
  let body: Blob;
  try {
    body = await (await fetch(uri)).blob();
  } catch (e) {
    throw new Error(`Photo upload: couldn't read the photo file (${e instanceof Error ? e.message : String(e)})`);
  }
  if (body.size === 0) throw new Error("Photo upload: the photo file is empty");
  let res: Response;
  try {
    res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body });
  } catch (e) {
    throw new Error(`Photo upload: network error (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!res.ok) throw new Error(`Photo upload: server said ${res.status} ${await res.text().catch(() => "")}`.trim());
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}
