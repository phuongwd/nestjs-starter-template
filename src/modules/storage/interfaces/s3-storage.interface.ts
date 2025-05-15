import {
  StorageMetadata,
  UploadOptions,
  StorageAcl,
} from './storage-provider.interface';
import { StorageProviderType } from './storage-config.interface';
import {
  ServerSideEncryption,
  ObjectCannedACL,
  StorageClass,
} from '@aws-sdk/client-s3';

/**
 * S3 storage class options
 */
export type S3StorageClass = StorageClass;

/**
 * S3 server-side encryption configuration
 */
export interface S3ServerSideEncryption {
  /**
   * Server-side encryption algorithm
   */
  algorithm: ServerSideEncryption;

  /**
   * Optional KMS key ID when using aws:kms
   */
  kmsKeyId?: string;
}

/**
 * S3 storage provider configuration
 */
export interface S3StorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType.S3;

  /**
   * AWS region for the S3 bucket
   */
  region: string;

  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * AWS access key ID
   */
  accessKeyId: string;

  /**
   * AWS secret access key
   */
  secretAccessKey: string;

  /**
   * Optional endpoint for using S3-compatible services
   */
  endpoint?: string;

  /**
   * Optional base URL for generating public URLs
   */
  baseUrl?: string;

  /**
   * Optional root path/prefix for all objects
   */
  rootPath?: string;

  /**
   * Default ACL for uploaded objects
   */
  defaultAcl?: ObjectCannedACL;

  /**
   * Default storage class for uploaded objects
   */
  defaultStorageClass?: StorageClass;

  /**
   * Optional server-side encryption configuration
   */
  serverSideEncryption?: S3ServerSideEncryption;
}

/**
 * Extended upload options for S3
 */
export interface S3UploadOptions extends UploadOptions {
  /**
   * Optional storage class for the uploaded object
   */
  storageClass?: S3StorageClass;

  /**
   * Optional server-side encryption configuration
   */
  serverSideEncryption?: S3ServerSideEncryption;

  /**
   * Optional cache control header
   */
  cacheControl?: string;

  /**
   * Optional content disposition header
   */
  contentDisposition?: string;
}

/**
 * Extended metadata for S3 objects
 */
export interface S3Metadata extends StorageMetadata {
  /**
   * S3 ETag
   */
  etag: string;

  /**
   * S3 version ID if versioning is enabled
   */
  versionId?: string;

  /**
   * S3 storage class
   */
  storageClass: S3StorageClass;

  /**
   * Server-side encryption algorithm used
   */
  serverSideEncryption?: ServerSideEncryption;

  /**
   * Object ACL
   */
  acl?: ObjectCannedACL;
}

/**
 * Map storage ACL to S3 ACL
 */
export const mapStorageAclToS3Acl = (
  acl?: StorageAcl,
): ObjectCannedACL | undefined => {
  if (!acl) return undefined;

  const aclMap: Record<StorageAcl, ObjectCannedACL> = {
    [StorageAcl.PRIVATE]: ObjectCannedACL.private,
    [StorageAcl.PUBLIC_READ]: ObjectCannedACL.public_read,
    [StorageAcl.PUBLIC_READ_WRITE]: ObjectCannedACL.public_read_write,
    [StorageAcl.AUTHENTICATED_READ]: ObjectCannedACL.authenticated_read,
  };

  return aclMap[acl];
};

/**
 * Map S3 ACL to storage ACL
 */
export const mapS3AclToStorageAcl = (
  acl?: ObjectCannedACL,
): StorageAcl | undefined => {
  if (!acl) return undefined;

  const aclMap: Record<ObjectCannedACL, StorageAcl> = {
    [ObjectCannedACL.private]: StorageAcl.PRIVATE,
    [ObjectCannedACL.public_read]: StorageAcl.PUBLIC_READ,
    [ObjectCannedACL.public_read_write]: StorageAcl.PUBLIC_READ_WRITE,
    [ObjectCannedACL.authenticated_read]: StorageAcl.AUTHENTICATED_READ,
    [ObjectCannedACL.aws_exec_read]: StorageAcl.PRIVATE,
    [ObjectCannedACL.bucket_owner_full_control]: StorageAcl.PRIVATE,
    [ObjectCannedACL.bucket_owner_read]: StorageAcl.PRIVATE,
  };

  return aclMap[acl];
};
