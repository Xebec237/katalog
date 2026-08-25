import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception.message;

    switch (exception.code) {
      case 'P2002':
        status = HttpStatus.CONFLICT;
        message = `Unique constraint failed on the fields: ${(exception.meta?.target as string[])?.join(', ')}`;
        break;
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Record to update not found.';
        break;
      // Add more cases as needed
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: 'PrismaClientKnownRequestError',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
