/**
 * Interface for GitHub API client
 * This separates the GitHub API communication details from the storage provider logic
 */

/**
 * GitHub file content representation
 */
export interface GitHubFileContent {
  /**
   * File name
   */
  name: string;

  /**
   * File path
   */
  path: string;

  /**
   * SHA hash of the file content
   */
  sha: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * URL to download the file content
   */
  download_url: string;

  /**
   * HTML URL to view the file on GitHub
   */
  html_url: string;

  /**
   * Type of the content ('file' or 'dir')
   */
  type: 'file' | 'dir';

  /**
   * MIME type of the file (GitHub-determined)
   */
  contentType?: string;

  /**
   * Last modified date
   */
  lastModified?: Date;
}

/**
 * GitHub file creation/update options
 */
export interface GitHubFileUpdateOptions {
  /**
   * File path in the repository
   */
  path: string;

  /**
   * File content (can be string or Buffer)
   */
  content: string | Buffer;

  /**
   * Commit message
   */
  message: string;

  /**
   * Branch to commit to (default: the repository's default branch)
   */
  branch?: string;

  /**
   * SHA of the file being replaced (required for updates)
   */
  sha?: string;
}

/**
 * GitHub file upload result
 */
export interface GitHubFileUpdateResult {
  /**
   * File path in the repository
   */
  path: string;

  /**
   * SHA hash of the new file content
   */
  sha: string;

  /**
   * URL to download the file content
   */
  download_url: string;

  /**
   * HTML URL to view the file on GitHub
   */
  html_url: string;

  /**
   * Size of the file in bytes
   */
  size?: number;

  /**
   * MIME type of the file (GitHub-determined)
   */
  contentType?: string;
}

/**
 * GitHub API client interface
 */
export interface IGitHubApiClient {
  /**
   * Get file content from GitHub repository
   * @param path Path to the file
   * @returns Promise with file content
   */
  getFileContent(path: string): Promise<GitHubFileContent>;

  /**
   * Get file content as a readable stream
   * @param path Path to the file
   * @returns Promise with readable stream
   */
  getFileStream(path: string): Promise<NodeJS.ReadableStream>;

  /**
   * Create or update a file in the repository
   * @param options File update options
   * @returns Promise with update result
   */
  createOrUpdateFile(
    options: GitHubFileUpdateOptions,
  ): Promise<GitHubFileUpdateResult>;

  /**
   * Delete a file from the repository
   * @param path Path to the file
   * @param message Commit message
   * @param sha SHA of the file to delete (required)
   * @returns Promise resolving when deletion is complete
   */
  deleteFile(path: string, message: string, sha: string): Promise<void>;

  /**
   * Check if a file exists in the repository
   * @param path Path to the file
   * @returns Promise resolving to boolean indicating existence
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * List files in a directory
   * @param path Directory path (empty string for root)
   * @returns Promise with array of file contents
   */
  listFiles(path: string): Promise<GitHubFileContent[]>;
}
