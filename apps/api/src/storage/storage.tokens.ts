/**
 * DI tokens for the storage subsystem. Strings (instead of class symbols) so
 * StorageModule can resolve different providers at runtime based on env vars.
 */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
