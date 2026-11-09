import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { firebaseUserService } from './firebaseUsers';
import { UserOperationError } from './users';

initializeApp();
const service = firebaseUserService();
const options = { region: 'us-central1', timeoutSeconds: 60, maxInstances: 5 };

function callableError(error: unknown): never {
  if (error instanceof UserOperationError) throw new HttpsError(error.code, error.message);
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  if (code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Email already has an account');
  if (code === 'auth/invalid-email' || code === 'auth/invalid-password') throw new HttpsError('invalid-argument', 'Invalid employee credentials');
  // Never log request data or propagate SDK errors containing credentials.
  throw new HttpsError('internal', 'Employee operation failed; retry using the same request ID');
}
export const createEmployee = onCall(options, async request => {
  try { return { uid: await service.create(request.auth?.uid ?? null, request.data) }; }
  catch (error) { return callableError(error); }
});
export const updateEmployee = onCall(options, async request => {
  try {
    await service.update(request.auth?.uid ?? null, request.data?.uid, request.data?.updates);
    return { success: true };
  } catch (error) { return callableError(error); }
});
export const deactivateEmployee = onCall(options, async request => {
  try {
    await service.deactivate(request.auth?.uid ?? null, request.data?.uid);
    return { success: true };
  } catch (error) { return callableError(error); }
});
