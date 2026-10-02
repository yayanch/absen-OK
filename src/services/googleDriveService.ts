import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppData } from '../types';
import { getTodayString, getIndonesianTimeString } from '../utils/helpers';

// Initialize Firebase App instance safely (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider with Google Drive File scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({ prompt: 'select_account' });

// In-memory token caching (do NOT store access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveBackupItem {
  id: string;
  name: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  webViewLink?: string;
  description?: string;
}

/**
 * Initialize Auth listener for Google account
 */
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged in to Firebase, but token might need refresh
        try {
          // Token is held in memory
          if (onAuthSuccess && cachedAccessToken) {
            onAuthSuccess(user, cachedAccessToken);
          } else {
            if (onAuthFailure) onAuthFailure();
          }
        } catch {
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In with Drive scope
 */
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out Google Account
 */
export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Retrieve current active access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Get current Google user from Firebase auth
 */
export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

const DEFAULT_FOLDER_NAME = 'Presensi_Siswa_Backup';

/**
 * Find or create dedicated folder in user's Google Drive
 */
export const findOrCreateBackupFolder = async (
  folderName = DEFAULT_FOLDER_NAME,
  token?: string
): Promise<string> => {
  const activeToken = token || (await getAccessToken());
  if (!activeToken) throw new Error('Akses Google Drive belum diotorisasi. Silakan Masuk dengan Google.');

  // Search existing folder
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${activeToken}` },
    }
  );

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mencari folder cadangan di Google Drive.');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder if not exists
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Folder penyimpanan otomatis cadangan data Presensi & Kesiswaan Siswa',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat folder cadangan di Google Drive.');
  }

  const createData = await createRes.json();
  return createData.id;
};

/**
 * Upload backup payload to Google Drive (Multipart Upload)
 */
export const uploadBackupToGoogleDrive = async (
  appData: AppData,
  options?: { note?: string; isAuto?: boolean; token?: string }
): Promise<{ fileId: string; fileName: string; size: string; createdTime: string }> => {
  const activeToken = options?.token || (await getAccessToken());
  if (!activeToken) {
    throw new Error('Google Drive belum terhubung. Silakan Masuk dengan Google.');
  }

  const folderId = await findOrCreateBackupFolder(DEFAULT_FOLDER_NAME, activeToken);

  const today = getTodayString();
  const timeNow = getIndonesianTimeString(new Date(), false).replace(/:/g, '');
  const schoolName = (appData.sekolah?.nama || 'Presensi').replace(/[^a-zA-Z0-9_-]/g, '_');
  const typeTag = options?.isAuto ? 'AutoBackup' : 'ManualBackup';
  const fileName = `Backup_${typeTag}_${schoolName}_${today.replace(/-/g, '')}_${timeNow}.json`;

  const siswaCount = Array.isArray(appData.siswa) ? appData.siswa.length : 0;
  const kelasCount = Array.isArray(appData.kelas) ? appData.kelas.length : 0;
  const guruCount = Array.isArray(appData.waliKelas) ? appData.waliKelas.length : 0;
  const presensiKeys = appData.presensi ? Object.keys(appData.presensi) : [];
  let presensiEntries = 0;
  if (appData.presensi) {
    for (const k of presensiKeys) {
      if (Array.isArray(appData.presensi[k])) {
        presensiEntries += appData.presensi[k].length;
      }
    }
  }

  const payload = {
    _backupMetadata: {
      system: 'Sistem Presensi Siswa',
      version: '3.5',
      type: options?.isAuto ? 'auto_drive' : 'manual_drive',
      note: options?.note || (options?.isAuto ? 'Cadangan Otomatis Google Drive' : 'Cadangan Manual Google Drive'),
      exportedAt: `${today} ${getIndonesianTimeString(new Date(), true)} WIB`,
      timestamp: Date.now(),
      schoolName: appData.sekolah?.nama || '',
      stats: {
        siswaCount,
        kelasCount,
        guruCount,
        presensiDays: presensiKeys.length,
        presensiEntries,
      },
    },
    ...appData,
  };

  const fileContent = JSON.stringify(payload, null, 2);
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: options?.note || `Cadangan data ${appData.sekolah?.nama || 'Presensi'} (${siswaCount} Siswa, ${presensiEntries} Presensi)`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mengunggah berkas cadangan ke Google Drive.');
  }

  const fileData = await uploadRes.json();
  const sizeKb = fileData.size ? `${(parseInt(fileData.size, 10) / 1024).toFixed(1)} KB` : 'Unknown';

  return {
    fileId: fileData.id,
    fileName: fileData.name,
    size: sizeKb,
    createdTime: fileData.createdTime || new Date().toISOString(),
  };
};

/**
 * List all backup files inside dedicated Drive folder
 */
export const listDriveBackups = async (token?: string): Promise<DriveBackupItem[]> => {
  const activeToken = token || (await getAccessToken());
  if (!activeToken) return [];

  try {
    const folderId = await findOrCreateBackupFolder(DEFAULT_FOLDER_NAME, activeToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&pageSize=30&fields=files(id,name,size,createdTime,modifiedTime,webViewLink,description)`,
      {
        headers: { Authorization: `Bearer ${activeToken}` },
      }
    );

    if (!res.ok) {
      throw new Error('Gagal mengambil daftar cadangan dari Google Drive.');
    }

    const data = await res.json();
    if (!data.files || !Array.isArray(data.files)) return [];

    return data.files.map((f: any) => ({
      id: f.id,
      name: f.name,
      size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'Unknown',
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      description: f.description,
    }));
  } catch (err) {
    console.warn('Error listing Drive backups:', err);
    return [];
  }
};

/**
 * Download and parse backup JSON file directly from Google Drive
 */
export const downloadDriveBackupContent = async (fileId: string, token?: string): Promise<any> => {
  const activeToken = token || (await getAccessToken());
  if (!activeToken) throw new Error('Google Drive belum terhubung.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok) {
    throw new Error('Gagal mengunduh berkas dari Google Drive.');
  }

  const json = await res.json();
  return json;
};

/**
 * Delete a backup file from Google Drive
 */
export const deleteDriveBackupFile = async (fileId: string, token?: string): Promise<boolean> => {
  const activeToken = token || (await getAccessToken());
  if (!activeToken) throw new Error('Google Drive belum terhubung.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${activeToken}` },
  });

  if (!res.ok && res.status !== 204) {
    throw new Error('Gagal menghapus berkas di Google Drive.');
  }

  return true;
};
