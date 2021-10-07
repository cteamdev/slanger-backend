import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction
} from 'fastify';
import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import {
  SwaggerModule,
  DocumentBuilder,
  OpenAPIObject,
  FastifySwaggerCustomOptions
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const logger: Logger = new Logger('NestApplication');
  const fastifyInstance: FastifyInstance = fastify();

  if (process.env.NODE_ENV !== 'production') {
    fastifyInstance.addHook(
      'onRequest',
      (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => {
        logger.log(`--> ${request.method} ${request.routerPath}`);

        return done();
      }
    );

    fastifyInstance.addHook(
      'onResponse',
      (
        request: FastifyRequest,
        reply: FastifyReply,
        done: HookHandlerDoneFunction
      ) => {
        logger.log(
          `<-- ${request.method} ${reply.statusCode} ${reply
            .getResponseTime()
            .toFixed(1)}ms ${(
            +(reply.getHeader('Content-Length') || 0) / 1024
          ).toFixed(1)}kb`
        );

        return done();
      }
    );
  }

  const app: NestFastifyApplication =
    await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(fastifyInstance),
      { logger: new ConsoleLogger(), cors: { origin: '*' } }
    );

  const configService: ConfigService = app.get(ConfigService);
  const swagger: boolean = configService.get('SWAGGER') === 'true';
  const port: number = configService.get('PORT') || 3000;

  if (swagger) {
    const config: Omit<OpenAPIObject, 'paths'> = new DocumentBuilder()
      .setTitle('Slanger')
      .setVersion('1.0')
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'x-vk'
        },
        'x-vk'
      )
      .build();
    const options: FastifySwaggerCustomOptions = {
      uiConfig: {
        deepLinking: true,
        filter: true,
        displayRequestDuration: true,
        syntaxHighlight: {
          theme: 'tomorrow-night'
        },
        persistAuthorization: true
      }
    };
    const document: OpenAPIObject = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/api', app, document, options);
  }

  await app.listen(port, '0.0.0.0');
}
bootstrap();
