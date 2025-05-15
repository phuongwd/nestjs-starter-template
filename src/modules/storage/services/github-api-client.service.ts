import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  GitHubFileContent,
  GitHubFileUpdateOptions,
  GitHubFileUpdateResult,
  IGitHubApiClient,
} from '../interfaces/github-api-client.interface';
import {
  StorageError,
  StorageFileNotFoundError,
} from '../utils/storage-errors';

/**
 * GitHub API client service
 * Handles communication with GitHub's API for repository operations
 */
@Injectable()
export class GitHubApiClientService implements IGitHubApiClient {
  private readonly logger = new Logger(GitHubApiClientService.name);
  private readonly client: AxiosInstance;
  private readonly owner: string;
  private readonly repo: string;
  private readonly defaultBranch: string;

  /**
   * Create a new GitHub API client
   * @param token GitHub API token
   * @param owner Repository owner (user or organization)
   * @param repo Repository name
   * @param branch Default branch (defaults to 'main')
   */
  constructor(token: string, owner: string, repo: string, branch = 'main') {
    this.owner = owner;
    this.repo = repo;
    this.defaultBranch = branch;

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PTO-Storage-Provider',
      },
    });
  }

  /**
   * Get file content from GitHub repository
   * @param path Path to the file within the repository
   * @returns Promise with file content
   */
  public async getFileContent(path: string): Promise<GitHubFileContent> {
    try {
      const normalizedPath = this.normalizePath(path);
      const response = await this.client.get(
        `/repos/${this.owner}/${this.repo}/contents/${normalizedPath}`,
        {
          params: { ref: this.defaultBranch },
        },
      );

      if (response.data.type !== 'file') {
        throw new StorageError(`Path is not a file: ${path}`);
      }

      return {
        name: response.data.name,
        path: response.data.path,
        sha: response.data.sha,
        size: response.data.size,
        download_url: response.data.download_url,
        html_url: response.data.html_url,
        type: response.data.type,
        contentType: this.inferContentType(response.data.name),
        lastModified: new Date(), // GitHub API doesn't provide last modified date in contents API
      };
    } catch (error) {
      this.handleApiError(error, path);
    }
  }

  /**
   * Get file content as a readable stream
   * @param path Path to the file
   * @returns Promise with readable stream
   */
  public async getFileStream(path: string): Promise<NodeJS.ReadableStream> {
    try {
      const fileContent = await this.getFileContent(path);

      // Download the raw file content as a stream
      const response = await axios.get(fileContent.download_url, {
        responseType: 'stream',
      });

      return response.data;
    } catch (error) {
      this.handleApiError(error, path);
    }
  }

  /**
   * Create or update a file in the repository
   * @param options File update options
   * @returns Promise with update result
   */
  public async createOrUpdateFile(
    options: GitHubFileUpdateOptions,
  ): Promise<GitHubFileUpdateResult> {
    try {
      const normalizedPath = this.normalizePath(options.path);
      const branch = options.branch || this.defaultBranch;

      // Convert content to base64
      const content = Buffer.isBuffer(options.content)
        ? options.content.toString('base64')
        : Buffer.from(options.content).toString('base64');

      const requestData: Record<string, unknown> = {
        message: options.message,
        content,
        branch,
      };

      // If SHA is provided, it's an update operation
      if (options.sha) {
        requestData.sha = options.sha;
      }

      const response = await this.client.put(
        `/repos/${this.owner}/${this.repo}/contents/${normalizedPath}`,
        requestData,
      );

      return {
        path: normalizedPath,
        sha: response.data.content.sha,
        download_url: response.data.content.download_url,
        html_url: response.data.content.html_url,
        size: response.data.content.size,
        contentType: this.inferContentType(normalizedPath),
      };
    } catch (error) {
      this.handleApiError(error, options.path);
    }
  }

  /**
   * Delete a file from the repository
   * @param path Path to the file
   * @param message Commit message
   * @param sha SHA of the file to delete (required)
   * @returns Promise resolving when deletion is complete
   */
  public async deleteFile(
    path: string,
    message: string,
    sha: string,
  ): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(path);

      await this.client.delete(
        `/repos/${this.owner}/${this.repo}/contents/${normalizedPath}`,
        {
          data: {
            message,
            sha,
            branch: this.defaultBranch,
          },
        },
      );
    } catch (error) {
      this.handleApiError(error, path);
    }
  }

  /**
   * Check if a file exists in the repository
   * @param path Path to the file
   * @returns Promise resolving to boolean indicating existence
   */
  public async fileExists(path: string): Promise<boolean> {
    try {
      await this.getFileContent(path);
      return true;
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * List files in a directory
   * @param path Directory path (empty string for root)
   * @returns Promise with array of file contents
   */
  public async listFiles(path: string): Promise<GitHubFileContent[]> {
    try {
      const normalizedPath = this.normalizePath(path);
      const endpoint = normalizedPath
        ? `/repos/${this.owner}/${this.repo}/contents/${normalizedPath}`
        : `/repos/${this.owner}/${this.repo}/contents`;

      const response = await this.client.get(endpoint, {
        params: { ref: this.defaultBranch },
      });

      return Array.isArray(response.data)
        ? response.data.map((item) => ({
            name: item.name,
            path: item.path,
            sha: item.sha,
            size: item.size,
            download_url: item.download_url,
            html_url: item.html_url,
            type: item.type,
            contentType:
              item.type === 'file'
                ? this.inferContentType(item.name)
                : undefined,
            lastModified: new Date(), // GitHub API doesn't provide last modified date in contents API
          }))
        : []; // Return empty array if not a directory
    } catch (error) {
      // If path doesn't exist or is not a directory, return empty array
      if ((error as AxiosError).response?.status === 404) {
        return [];
      }
      this.handleApiError(error, path);
    }
  }

  /**
   * Normalize a file path for GitHub API
   * @param filePath Original file path
   * @returns Normalized path
   */
  private normalizePath(filePath: string): string {
    // Remove leading slash
    return filePath.replace(/^\/+/, '');
  }

  /**
   * Infer content type from file extension
   * @param filename File name
   * @returns Content type string
   */
  private inferContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    // Common MIME types mapping
    const mimeTypes: Record<string, string> = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      md: 'text/markdown',
    };

    return extension && mimeTypes[extension]
      ? mimeTypes[extension]
      : 'application/octet-stream';
  }

  /**
   * Handle GitHub API errors
   * @param error Error object
   * @param path Resource path
   */
  private handleApiError(error: unknown, path: string): never {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 404) {
      throw new StorageFileNotFoundError(`File not found: ${path}`);
    }

    const statusCode = axiosError.response?.status;
    let errorMessage = 'Unknown error';

    if (
      axiosError.response?.data &&
      typeof axiosError.response.data === 'object'
    ) {
      const responseData = axiosError.response.data as Record<string, unknown>;
      errorMessage = (responseData.message as string) || errorMessage;
    } else if (axiosError.message) {
      errorMessage = axiosError.message;
    }

    this.logger.error(
      `GitHub API error: ${statusCode} - ${errorMessage}`,
      axiosError.stack,
    );

    throw new StorageError(`GitHub API error: ${errorMessage}`);
  }
}
