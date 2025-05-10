import chalk from 'chalk';
import { Injectable } from '@nestjs/common';

interface StartupConfig {
  port: number;
  apiVersion: string;
  environment: string;
  apiPrefix: string;
  baseUrl: string;
}

@Injectable()
export class StartupLogger {
  private getUrls(baseUrl: string) {
    return {
      docs: `${baseUrl}/docs`,
      docsJson: `${baseUrl}/docs-json`,
      health: `${baseUrl}/health`,
    };
  }

  private getApiBaseUrl(config: StartupConfig): string {
    return `${config.baseUrl}/${config.apiPrefix}${config.apiVersion}`;
  }

  public logStartupInfo(config: StartupConfig): void {
    const urls = this.getUrls(config.baseUrl);
    const apiBaseUrl = this.getApiBaseUrl(config);
    const isDev = config.environment === 'development';

    console.log('\n');
    this.logApplicationStatus();
    this.logDocumentationUrls(urls);
    this.logHealthCheck(urls);
    this.logApiInformation(config, apiBaseUrl);
    this.logAccessInformation(isDev);
    console.log('\n');
  }

  private logApplicationStatus(): void {
    console.log(chalk.green('🚀 Application is running!'));
    console.log('\n');
  }

  private logDocumentationUrls(urls: ReturnType<typeof this.getUrls>): void {
    console.log(chalk.cyan('📚 Documentation:'));
    console.log(chalk.gray('├─ Swagger UI:'), chalk.blue(urls.docs));
    console.log(chalk.gray('└─ API JSON:'), chalk.blue(urls.docsJson));
    console.log('\n');
  }

  private logHealthCheck(urls: ReturnType<typeof this.getUrls>): void {
    console.log(chalk.cyan('🔍 Health Check:'));
    console.log(chalk.gray('└─ Health Status:'), chalk.blue(urls.health));
    console.log('\n');
  }

  private logApiInformation(config: StartupConfig, apiBaseUrl: string): void {
    console.log(chalk.cyan('🌐 API Information:'));
    console.log(
      chalk.gray('├─ Environment:'),
      chalk.yellow(config.environment),
    );
    console.log(chalk.gray('├─ Version:'), chalk.yellow(config.apiVersion));
    console.log(chalk.gray('├─ Base URL:'), chalk.blue(apiBaseUrl));
    console.log(chalk.gray('└─ Port:'), chalk.yellow(config.port));
    console.log('\n');
  }

  private logAccessInformation(isDev: boolean): void {
    console.log(chalk.cyan('ℹ️  Access Information:'));
    console.log(
      chalk.gray('└─'),
      isDev
        ? chalk.yellow(
            'Browser will not auto-open in Docker environment. Please click the URLs above.',
          )
        : chalk.yellow(
            'Running in production mode. Access the URLs above manually.',
          ),
    );
  }
}
