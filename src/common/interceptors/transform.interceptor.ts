import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        let actualData = data;
        let meta = undefined;
        
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          actualData = data.data;
          meta = data.meta;
        }

        return {
          success: true,
          data: actualData,
          meta,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
