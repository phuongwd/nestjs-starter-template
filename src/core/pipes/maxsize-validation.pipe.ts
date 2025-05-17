import { INJECTION_TOKENS } from '@/modules/storage/constants/injection-tokens';
import { StorageModuleConfig } from '@/modules/storage/interfaces/storage-config.interface';
import {
  Injectable,
  PipeTransform,
  BadRequestException,
  Inject,
} from '@nestjs/common';

@Injectable()
export class MaxFileSizePipe implements PipeTransform {
  constructor(
    @Inject(INJECTION_TOKENS.CONFIG.MODULE_CONFIG) // Use the correct injection token for your config
    private readonly config: StorageModuleConfig,
  ) {}

  transform(file: Express.Multer.File) {
    const maxSize = (this.config.maxFileSizeMB ?? 10) * 1024 * 1024;
    if (file && file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${maxSize} bytes`,
      );
    }
    return file;
  }
}
