/**
 * Interface for disk space information
 */
export interface DiskSpaceInfo {
  free: number;
  size: number;
}

/**
 * Type definition for the check-disk-space function
 */
export type CheckDiskSpaceFunction = (path: string) => Promise<DiskSpaceInfo>;
