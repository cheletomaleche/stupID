import { ComplianceResult } from '../types';

/**
 * Edit the ID photo based on instructions via the server-side API.
 */
export const editIdPhoto = async (
  imageBase64: string,
  promptInstruction: string
): Promise<string> => {
  const response = await fetch('/api/edit-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      promptInstruction,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to process image (HTTP ${response.status})`);
  }

  const data = await response.json();
  if (!data.image) {
    throw new Error('No image was returned from the photo editing service.');
  }

  return data.image;
};

/**
 * Check compliance of the photo against standard ID regulations via the server-side API.
 */
export const checkCompliance = async (imageBase64: string): Promise<ComplianceResult> => {
  const response = await fetch('/api/check-compliance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to check compliance (HTTP ${response.status})`);
  }

  const data = await response.json();
  return {
    isCompliant: Boolean(data.isCompliant),
    score: typeof data.score === 'number' ? data.score : 0,
    issues: Array.isArray(data.issues) ? data.issues : [],
  };
};