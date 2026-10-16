import { YearBudgetData, SavingsLedgerData, DriveFileInfo } from '../types/finance';

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

export const getBudgetFileName = (year: number) => `capitalflow_budget_${year}.json`;
export const SAVINGS_LEDGER_FILE_NAME = 'capitalflow_savings_ledger.json';

/**
 * Custom error thrown when a Google Drive OAuth session has expired or is unauthorized (HTTP 401)
 */
export class DriveSessionExpiredError extends Error {
  constructor(message: string = 'Google Drive session has expired. Please sign in again.') {
    super(message);
    this.name = 'DriveSessionExpiredError';
  }
}

/**
 * Checks if an error is due to an expired or invalid Google Drive session
 */
export function isSessionExpiredError(error: any): boolean {
  if (!error) return false;
  if (error instanceof DriveSessionExpiredError || error?.name === 'DriveSessionExpiredError') {
    return true;
  }
  const msg = typeof error === 'string' ? error : error?.message || '';
  return (
    msg.includes('401') ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('Invalid Credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('auth/expired-action-code') ||
    msg.includes('session has expired') ||
    msg.includes('token expired')
  );
}

/**
 * Proactively verifies if the current access token is valid and not expired
 */
export async function validateDriveToken(accessToken: string): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const response = await fetch(`${DRIVE_API_URL}/about?fields=user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 401 || response.status === 403) {
      return false;
    }
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Searches for a file by exact name in Google Drive
 */
export async function findDriveFile(accessToken: string, fileName: string): Promise<DriveFileInfo | null> {
  const query = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${query}&fields=files(id, name, mimeType, modifiedTime, size)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 401) {
    throw new DriveSessionExpiredError();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query Google Drive files: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0] as DriveFileInfo;
  }
  return null;
}

/**
 * List all CapitalFlow budget & ledger files in Drive
 */
export async function listCapitalFlowFiles(accessToken: string): Promise<DriveFileInfo[]> {
  const query = encodeURIComponent(`name contains 'capitalflow_' and trashed = false`);
  const response = await fetch(
    `${DRIVE_API_URL}/files?q=${query}&fields=files(id, name, mimeType, modifiedTime, size)&orderBy=name desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (response.status === 401) {
    throw new DriveSessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(`Failed to list files from Google Drive: ${response.statusText}`);
  }

  const result = await response.json();
  return (result.files || []) as DriveFileInfo[];
}

/**
 * Downloads and parses JSON content from a file ID
 */
export async function downloadJsonFile<T>(accessToken: string, fileId: string): Promise<T> {
  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    throw new DriveSessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(`Failed to download file from Google Drive: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

/**
 * Creates or updates a JSON file in Google Drive
 */
export async function saveJsonToDrive<T>(
  accessToken: string,
  fileName: string,
  data: T,
  existingFileId?: string | null
): Promise<{ id: string; name: string; modifiedTime: string }> {
  const content = JSON.stringify(data, null, 2);

  // If we already have the fileId, perform a PATCH update
  if (existingFileId) {
    const response = await fetch(
      `${DRIVE_UPLOAD_URL}/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: content,
      }
    );

    if (response.status === 401) {
      throw new DriveSessionExpiredError();
    }

    if (response.ok) {
      const updatedMeta = await response.json();
      return {
        id: updatedMeta.id,
        name: updatedMeta.name || fileName,
        modifiedTime: updatedMeta.modifiedTime || new Date().toISOString(),
      };
    }
    // If not found or error, fallback to searching or recreating
  }

  // Check if file already exists in Drive by name
  const existing = await findDriveFile(accessToken, fileName);
  if (existing) {
    const response = await fetch(
      `${DRIVE_UPLOAD_URL}/files/${existing.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: content,
      }
    );

    if (response.status === 401) {
      throw new DriveSessionExpiredError();
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to update Drive file: ${err}`);
    }

    const updated = await response.json();
    return {
      id: updated.id,
      name: updated.name || fileName,
      modifiedTime: updated.modifiedTime || new Date().toISOString(),
    };
  }

  // File does not exist: create via multipart upload
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'CapitalFlow Financial Database File',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const createResponse = await fetch(
    `${DRIVE_UPLOAD_URL}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (createResponse.status === 401) {
    throw new DriveSessionExpiredError();
  }

  if (!createResponse.ok) {
    const err = await createResponse.text();
    throw new Error(`Failed to create new file in Google Drive: ${err}`);
  }

  const createdFile = await createResponse.json();
  return {
    id: createdFile.id,
    name: createdFile.name,
    modifiedTime: createdFile.modifiedTime || new Date().toISOString(),
  };
}

/**
 * Delete a file from Google Drive (Requires user confirmation prior to calling)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  const response = await fetch(`${DRIVE_API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    throw new DriveSessionExpiredError();
  }

  return response.ok;
}
