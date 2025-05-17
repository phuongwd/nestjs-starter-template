import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
  HttpException,
  StreamableFile,
  Inject,
  Headers,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Readable } from 'stream';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiProduces,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadFileDto, UploadFileResponseDto } from '../dto/upload-file.dto';
import {
  DownloadFileDto,
  DeleteFileDto,
  ListFilesDto,
  StorageItemDto,
  GetMetadataDto,
  UpdateMetadataDto,
  MetadataResponseDto,
  StorageUsageDto,
} from '../dto/storage-operations.dto';
import {
  StorageError,
  StorageFileNotFoundError,
} from '../utils/storage-errors';
import { IStorageService } from '../interfaces/storage-service.interface';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import { Transform } from 'stream';
import { OrganizationId } from '@/shared/decorators/organization-context.decorator';
import { UploadPresignDto } from '@/modules/storage/dto/upload-presign.dto';
import { MaxFileSizePipe } from '@/core/pipes/maxsize-validation.pipe';

/**
 * @class StorageController
 * @description Controller for storage operations
 * Provides endpoints for file upload, download, and management
 *
 * Multi-tenant context is handled via the OrganizationId decorator
 * which extracts the organization ID from the X-Organization-Id header
 */
@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(
    @Inject(INJECTION_TOKENS.SERVICE.STORAGE)
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Upload a file to storage
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a file to the specified path',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        path: {
          type: 'string',
          description: 'Path to store the file at',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata to store with the file',
        },
        acl: {
          type: 'string',
          description: 'Optional ACL for the file (public-read, private, etc)',
        },
        provider: {
          type: 'string',
          description: 'Storage provider to use (if not using default)',
        },
      },
      required: ['file', 'path'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async uploadFile(
    @UploadedFile(MaxFileSizePipe)
    file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @OrganizationId() organizationId?: number,
  ): Promise<UploadFileResponseDto> {
    try {
      const result = await this.storageService.uploadFile(
        {
          path: dto.path,
          content: file.buffer,
          contentType: file.mimetype,
          metadata: dto.metadata,
          acl: dto.acl,
        },
        organizationId?.toString(),
        dto.provider,
      );

      return {
        path: result.path,
        size: result.size,
        contentType: result.contentType,
        lastModified: result.lastModified,
        url: result.url,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Post('/uploads/presign')
  @ApiOperation({
    summary: 'Generate presign image url',
  })
  @HttpCode(HttpStatus.CREATED)
  async presignUpload(
    @Body() dto: UploadPresignDto,
    @OrganizationId() organizationId: number,
  ) {
    const result = await this.storageService.presign(
      dto,
      organizationId.toString(),
    );

    return result;
  }

  /**
   * Download a file from storage
   */
  @Get('download/:path(*)')
  @ApiOperation({
    summary: 'Download a file',
    description: 'Download a file from the specified path',
  })
  @ApiParam({
    name: 'path',
    description: 'Path to the file',
    type: 'string',
  })
  @ApiQuery({
    name: 'provider',
    description: 'Storage provider to use (if not using default)',
    required: false,
  })
  @ApiQuery({
    name: 'range',
    description: 'Byte range for partial content (e.g., "bytes=0-1048575")',
    required: false,
    type: 'string',
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.PARTIAL_CONTENT,
    description: 'Partial content delivered successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'File not found',
  })
  @ApiResponse({
    status: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    description: 'Invalid range requested',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async downloadFile(
    @Param('path') path: string,
    @Query() query: DownloadFileDto,
    @OrganizationId() organizationId: number,
    @Res({ passthrough: true }) res: Response,
    @Headers('range') range?: string,
  ): Promise<StreamableFile> {
    try {
      // Get file metadata first to check existence and get size
      const metadata = await this.storageService.getFileMetadata(
        path,
        organizationId.toString(),
        query.provider,
      );

      // Parse range header if present
      let start: number | undefined;
      let end: number | undefined;

      if (range) {
        const matches = range.match(/bytes=(\d+)-(\d+)?/);
        if (matches) {
          start = parseInt(matches[1], 10);
          end = matches[2] ? parseInt(matches[2], 10) : metadata.size - 1;

          // Validate range
          if (start >= metadata.size || end >= metadata.size || start > end) {
            throw new HttpException(
              'Requested range not satisfiable',
              HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
            );
          }
        }
      }

      // Download the file
      const result = await this.storageService.downloadFile(
        path,
        organizationId.toString(),
        query.provider,
      );

      // Set basic headers
      const headers: Record<string, string> = {
        'Content-Type': result.contentType || 'application/octet-stream',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        ETag: metadata.etag || `"${metadata.lastModified.getTime()}"`,
      };

      // Handle range request
      if (range && start !== undefined && end !== undefined) {
        headers['Content-Range'] = `bytes ${start}-${end}/${metadata.size}`;
        headers['Content-Length'] = String(end - start + 1);
        res.status(HttpStatus.PARTIAL_CONTENT);
      } else {
        headers['Content-Length'] = String(metadata.size);
      }

      // Set content disposition based on file type
      const filename = path.split('/').pop() || 'download';
      const isInline = this.shouldDisplayInline(result.contentType);
      headers['Content-Disposition'] =
        `${isInline ? 'inline' : 'attachment'}; filename="${filename}"`;

      // Set all headers
      res.set(headers);

      // Create stream
      let stream: Readable;
      if (result.content instanceof Readable) {
        stream = result.content;
      } else {
        stream = Readable.from(result.content);
      }

      // Handle range request streaming
      if (range && start !== undefined && end !== undefined) {
        // Create a transform stream to handle the range
        const rangeStream = new Transform({
          transform(chunk, _encoding, callback) {
            callback(null, chunk);
          },
        });

        let bytesRead = 0;
        stream.on('data', (chunk) => {
          if (bytesRead >= start && bytesRead <= end) {
            rangeStream.write(chunk);
          } else if (bytesRead > end) {
            stream.destroy();
          }
          bytesRead += chunk.length;
        });

        stream.on('end', () => {
          rangeStream.end();
        });

        stream = rangeStream;
      }

      // Add error handling to the stream
      stream.on('error', (error) => {
        this.logger.error('Stream error during file download', {
          path,
          error: error instanceof Error ? error.message : String(error),
        });
        stream.destroy();
      });

      return new StreamableFile(stream);
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Determine if content should be displayed inline in the browser
   */
  private shouldDisplayInline(contentType?: string): boolean {
    if (!contentType) return false;

    const inlineTypes = [
      'image/',
      'text/',
      'application/pdf',
      'audio/',
      'video/',
    ];

    return inlineTypes.some((type) => contentType.startsWith(type));
  }

  /**
   * Delete a file from storage
   */
  @Delete('files/:path(*)')
  @ApiOperation({
    summary: 'Delete a file',
    description: 'Delete a file from the specified path',
  })
  @ApiParam({
    name: 'path',
    description: 'Path to the file',
    type: 'string',
  })
  @ApiQuery({
    name: 'provider',
    description: 'Storage provider to use (if not using default)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('path') path: string,
    @Query() query: DeleteFileDto,
    @OrganizationId() organizationId?: number,
  ): Promise<void> {
    try {
      await this.storageService.deleteFile(
        path,
        organizationId?.toString(),
        query.provider,
      );
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   */
  @Get('exists/:path(*)')
  @ApiOperation({
    summary: 'Check if a file exists',
    description: 'Check if a file exists at the specified path',
  })
  @ApiParam({
    name: 'path',
    description: 'Path to the file',
    type: 'string',
  })
  @ApiQuery({
    name: 'provider',
    description: 'Storage provider to use (if not using default)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File exists status',
    schema: {
      type: 'object',
      properties: {
        exists: {
          type: 'boolean',
          description: 'Whether the file exists',
        },
      },
    },
  })
  async fileExists(
    @Param('path') path: string,
    @Query() query: GetMetadataDto,
    @OrganizationId() organizationId?: number,
  ): Promise<{ exists: boolean }> {
    try {
      const exists = await this.storageService.fileExists(
        path,
        organizationId?.toString(),
        query.provider,
      );
      return { exists };
    } catch (error) {
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * List files in storage
   */
  @Get('files')
  @ApiOperation({
    summary: 'List files',
    description: 'List files in the specified directory',
  })
  @ApiQuery({
    name: 'prefix',
    description: 'Path prefix to list files from',
    required: true,
  })
  @ApiQuery({
    name: 'provider',
    description: 'Storage provider to use (if not using default)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of files',
    type: [StorageItemDto],
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async listFiles(
    @Query() query: ListFilesDto,
    @OrganizationId() organizationId?: number,
  ): Promise<StorageItemDto[]> {
    try {
      const items = await this.storageService.listFiles(
        query.prefix,
        organizationId?.toString(),
        query.provider,
      );

      return items.map((item) => ({
        path: item.path,
        size: item.size,
        lastModified: item.lastModified,
        isDirectory: item.isDirectory,
        contentType: item.contentType,
      }));
    } catch (error) {
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Get metadata for a file
   */
  @Get('metadata/:path(*)')
  @ApiOperation({
    summary: 'Get file metadata',
    description: 'Get metadata for a file at the specified path',
  })
  @ApiParam({
    name: 'path',
    description: 'Path to the file',
    type: 'string',
  })
  @ApiQuery({
    name: 'provider',
    description: 'Storage provider to use (if not using default)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File metadata',
    type: MetadataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getMetadata(
    @Param('path') path: string,
    @Query() query: GetMetadataDto,
    @OrganizationId() organizationId?: number,
  ): Promise<MetadataResponseDto> {
    try {
      const metadata = await this.storageService.getFileMetadata(
        path,
        organizationId?.toString(),
        query.provider,
      );

      return {
        contentType: metadata.contentType,
        size: metadata.size,
        createdAt: metadata.createdAt,
        lastModified: metadata.lastModified,
        etag: metadata.etag,
        custom: metadata.custom,
      };
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Update metadata for a file
   */
  @Post('metadata/:path(*)')
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update metadata for a file at the specified path',
  })
  @ApiParam({
    name: 'path',
    description: 'Path to the file',
    type: 'string',
  })
  @ApiBody({ type: UpdateMetadataDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated file metadata',
    type: MetadataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateMetadata(
    @Param('path') path: string,
    @Body() dto: UpdateMetadataDto,
    @OrganizationId() organizationId?: number,
  ): Promise<MetadataResponseDto> {
    try {
      const metadata = await this.storageService.updateFileMetadata(
        path,
        dto.metadata,
        organizationId?.toString(),
        dto.provider,
      );

      return {
        contentType: metadata.contentType,
        size: metadata.size,
        createdAt: metadata.createdAt,
        lastModified: metadata.lastModified,
        etag: metadata.etag,
        custom: metadata.custom,
      };
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  @Get('usage')
  @ApiOperation({
    summary: 'Get storage usage',
    description: 'Get storage usage statistics for the organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Storage usage statistics',
    type: StorageUsageDto,
  })
  async getUsage(
    @OrganizationId() organizationId?: number,
  ): Promise<StorageUsageDto> {
    try {
      const usage = await this.storageService.getStorageUsage(
        organizationId?.toString(),
      );
      return {
        organizationId: organizationId?.toString() || 'default',
        usage: usage.used,
        quota: usage.limit,
        usagePercentage: usage.percentage,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  @Get('test')
  @ApiOperation({ summary: 'Health check for the storage module' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Storage module is healthy',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'ok',
        },
        message: {
          type: 'string',
          example: 'Storage module is healthy',
        },
      },
    },
  })
  async healthCheck(): Promise<{ status: string; message: string }> {
    return {
      status: 'ok',
      message: 'Storage module is healthy',
    };
  }
}
