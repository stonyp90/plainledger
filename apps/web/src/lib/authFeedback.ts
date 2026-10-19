import { ApiException } from './api';

/** Keep transport and service failures understandable in the selected language. */
export function authRequestError(cause: unknown, isEn: boolean, fallback: string): string {
  if (cause instanceof ApiException) {
    if (cause.code === 'NETWORK_ERROR') {
      return isEn ? 'Unable to connect. Check your internet connection and try again.' : 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.';
    }
    if (cause.code === 'TIMEOUT') {
      return isEn ? 'The request timed out. Please try again.' : 'La demande a pris trop de temps. Veuillez réessayer.';
    }
    if (cause.code === 'INVALID_RESPONSE') {
      return isEn ? 'The server returned an incomplete response. Please try again.' : 'Le serveur a retourné une réponse incomplète. Veuillez réessayer.';
    }
    if (cause.statusCode === 429) {
      return isEn ? 'Too many requests. Please wait a moment before trying again.' : 'Trop de demandes. Veuillez patienter avant de réessayer.';
    }
    if (cause.statusCode >= 500) {
      return isEn ? 'The service is temporarily unavailable. Please try again.' : 'Le service est temporairement indisponible. Veuillez réessayer.';
    }
  }
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
