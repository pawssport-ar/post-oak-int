import 'reflect-metadata';
import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Post Oak Business Banking API')
      .setDescription(
        'Case study API. Every visitor gets an isolated sandbox of fictional data, and money ' +
          'movement runs against a mock banking-as-a-service provider.',
      )
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  // Omitting the host binds IPv6 and IPv4, which Railway's private network requires.
  const port = Number(process.env['PORT'] ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API ready on port ${port}. Docs at /docs`);
}

await bootstrap();
